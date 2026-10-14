import {Miniflare,createFetchMock} from 'miniflare';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const mock=createFetchMock();mock.disableNetConnect();
for(const role of ['admin','editor','viewer','other'])mock.get('https://auth.test').intercept({path:'/auth/v1/user',headers:{authorization:'Bearer '+role+'-token'}}).reply(200,{id:role,email:role+'@example.com',email_confirmed_at:'2026-10-01'}).persist();
const mf=new Miniflare({modules:true,scriptPath:'backend/backend-dist/worker.js',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],fetchMock:mock,bindings:{FRONTEND_URL:'https://front.test/',SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'mock',ADMIN_SUPABASE_USER_IDS:'admin'}});
const block={id:'contact-form',type:'form',title:'Contact office',text:'Send a question.',label:'Send response',link:'',image:'',background:'#ffffff',color:'#172c47',align:'left',padding:48,fields:[{id:'name',label:'Your name',type:'text',required:true},{id:'email',label:'Email',type:'email',required:true},{id:'message',label:'Message',type:'textarea',required:true},{id:'choice',label:'Topic',type:'select',options:['General','Support'],required:true},{id:'radio',label:'Reply by',type:'radio',options:['Email','Phone'],required:true},{id:'consent',label:'Consent',type:'checkbox',required:true},{id:'date',label:'Date',type:'date'},{id:'number',label:'Number',type:'number'},{id:'file',label:'Attachment',type:'file'}]};
const site={name:'Test website',slug:'test-site',font:'sans',accent:'#123456',pages:[{id:'home',slug:'home',name:'Home',blocks:[{...block,id:'group',type:'group',fields:undefined,children:[block]}]}]};
let count=0;
const verify=async(response,status,label)=>{const text=await response.text();assert.equal(response.status,status,label+': '+text);count++;console.log('PASS '+label);try{return JSON.parse(text);}catch{return text;}};
try{
 const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).replaceAll(/-->[^\n]*/g,'').split(';').filter(s=>s.trim()))await db.prepare(sql).run();
 await db.prepare('INSERT INTO client_sites (id,owner,customer_id,title,slug,template_id,draft,published,revision,archived,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind('form-site','admin','','Test website','test-site','general',JSON.stringify(site),JSON.stringify(site),1,0,new Date().toISOString()).run();
 await db.prepare('INSERT INTO site_publications VALUES (?,?,?)').bind('form-site','admin',1).run();
 for(const role of ['editor','viewer'])await db.prepare('INSERT INTO site_access VALUES (?,?,?,?,?,?)').bind(role,'admin','form-site',role+'@example.com',role,role).run();
 const formData=(changes={},requestId=crypto.randomUUID())=>{const form=new FormData();for(const [key,value] of Object.entries({pageId:'home',formId:'contact-form',requestId,website:'','field:name':'Example Person','field:email':'example@example.com','field:message':'A sample inquiry','field:choice':'General','field:radio':'Email','field:consent':'on',...changes})){if(value!==null)form.append(key,value);}return form;};
 const submit=async(data,origin='https://api.test',path='https://api.test/sites/form-site/api/forms',ip='192.0.2.10')=>{const encoded=new Response(data);return mf.dispatchFetch(path,{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':ip,'Content-Type':encoded.headers.get('content-type')},body:await encoded.arrayBuffer()});};
 const inbox=(suffix='',token='admin',init={})=>mf.dispatchFetch('https://api.test/api/forms?siteId=form-site'+suffix,{...init,headers:{Origin:'https://front.test',Authorization:'Bearer '+token+'-token','Content-Type':'application/json',...init.headers}});
 const emptyFile=formData();emptyFile.append('field:file',new Blob([]),'');await verify(await submit(emptyFile),201,'browser empty optional attachment is accepted');await db.prepare('DELETE FROM form_submissions').run();
 const id=crypto.randomUUID();
 await verify(await submit(formData({},id)),201,'nested public form stored without visitor login');
 await verify(await submit(formData({},id)),200,'retry is idempotent');
 assert.equal((await db.prepare('SELECT count(*) n FROM form_submissions').first()).n,1);
 await verify(await submit(formData({'field:message':'Changed'},id)),409,'same request ID cannot change a received response');
 const list=await verify(await inbox(),200,'owner reads private inbox');assert.equal(list.total,1);
 const submissionId=list.responses[0].id;
 const detail=await verify(await inbox('&id='+submissionId,'editor'),200,'assigned editor reads answers');assert.equal(detail.answers.find(a=>a.fieldId==='radio').value,'Email');assert.equal(detail.answers.find(a=>a.fieldId==='consent').value,true);
 await verify(await inbox('','viewer'),403,'view-only users cannot read private responses');
 await verify(await inbox('','other'),403,'other customers cannot read responses');
 await verify(await mf.dispatchFetch('https://api.test/api/forms?siteId=form-site'),401,'anonymous inbox access rejected');
 await verify(await inbox('','editor',{method:'PUT',body:JSON.stringify({id:submissionId,status:'read'})}),200,'editor marks a response read');
 assert.equal((await (await inbox()).json()).total,0);
 await verify(await inbox('&status=read'),200,'read response filter');
 await verify(await inbox('','admin',{method:'PUT',body:JSON.stringify({id:submissionId,status:'archived'})}),200,'archive is reversible');
 await verify(await inbox('','admin',{method:'PUT',body:JSON.stringify({id:submissionId,status:'new'})}),200,'restore archived response');
 await verify(await submit(formData(),'https://evil.test'),403,'foreign-origin form post rejected');
 await verify(await submit(formData({website:'spam.example'})),400,'honeypot rejected');
 for(const [field,value,label] of [['field:name','','required field'],['field:email','bad','invalid email'],['field:choice','Unknown','unknown select option'],['field:radio','Unknown','unknown radio option'],['field:consent',null,'required checkbox'],['field:date','2026-02-30','invalid date'],['field:number','NaN','invalid number'],['field:message','x'.repeat(10001),'oversized answer']]){
  const result=await verify(await submit(formData({[field]:value})),400,label+' rejected with field reason');assert.ok(result.error.includes(':'));
 }
 await verify(await submit(formData({'field:extra':'value'})),400,'unknown field rejected after form schema changes');
 const duplicate=formData();duplicate.append('field:name','Duplicate');await verify(await submit(duplicate),400,'duplicate field rejected');
 const fileForm=formData({'field:message':'=HYPERLINK("bad")'});fileForm.append('field:file',new Blob(['hello file'],{type:'text/plain'}),'note.txt');
 await verify(await submit(fileForm),201,'small attachment stored privately');
 const attached=await db.prepare('SELECT id,submission_id FROM form_attachments').first();
 const fileResponse=await inbox('&attachment='+attached.id);assert.match(fileResponse.headers.get('content-disposition'),/^attachment/);await verify(fileResponse,200,'authorized attachment download');
 await verify(await inbox('&attachment='+attached.id,'other'),403,'cross-customer attachment denied');
 await verify(await mf.dispatchFetch('https://api.test/sites/form-site/api/forms?attachment='+attached.id),404,'attachment has no public download route');
 const big=formData();big.append('field:file',new Blob(['x'.repeat(262145)],{type:'text/plain'}),'large.txt');await verify(await submit(big),400,'oversized attachment rejected');
 const fake=formData();fake.append('field:file',new Blob(['not a pdf'],{type:'application/pdf'}),'fake.pdf');await verify(await submit(fake),400,'attachment signature checked');
 const csv=await verify(await inbox('&export=csv&status=all'),200,'CSV export');assert.ok(csv.includes("'=HYPERLINK"),'spreadsheet formulas are escaped');
 for(const patch of [{hidden:true},{formEnabled:false}]){const changed=structuredClone(site);Object.assign(changed.pages[0].blocks[0],patch.hidden?patch:{});Object.assign(changed.pages[0].blocks[0].children[0],patch.formEnabled===false?patch:{});await db.prepare('UPDATE client_sites SET published=? WHERE id=?').bind(JSON.stringify(changed),'form-site').run();await verify(await submit(formData()),404,'hidden or closed published forms rejected');}
 await db.prepare('UPDATE client_sites SET published=? WHERE id=?').bind(JSON.stringify(site),'form-site').run();
 await db.prepare('UPDATE site_publications SET enabled=0').run();await verify(await submit(formData()),404,'private website cannot collect public submissions');await db.prepare('UPDATE site_publications SET enabled=1').run();
 await db.prepare('UPDATE client_sites SET archived=1').run();await verify(await submit(formData()),404,'archived site cannot collect responses');await db.prepare('UPDATE client_sites SET archived=0').run();
 const changedDraft=structuredClone(site);changedDraft.pages[0].blocks[0].children[0].formEnabled=false;await db.prepare('UPDATE client_sites SET draft=?').bind(JSON.stringify(changedDraft)).run();await verify(await submit(formData()),201,'unpublished draft changes do not alter the live form');
 await db.prepare('INSERT INTO site_domains (id,site_id,owner,hostname,verification_token,status,is_primary,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('domain','form-site','admin','school.example.com','token','active',1,new Date().toISOString()).run();await verify(await submit(formData(),'https://school.example.com','https://school.example.com/api/forms'),201,'connected-domain form submits on its own origin');
 for(let i=0;i<20;i++){const response=await submit(formData(),'https://api.test',undefined,'192.0.2.30');assert.equal(response.status,201);}
 await verify(await submit(formData(),'https://api.test',undefined,'192.0.2.30'),429,'atomic rate limit blocks excess submissions');
 const badSite=structuredClone(site);badSite.pages[0].blocks[0].children[0].image='http://unsafe.example/image.png';
 const save=await verify(await mf.dispatchFetch('https://api.test/api/site',{method:'PUT',headers:{Origin:'https://front.test',Authorization:'Bearer admin-token','Content-Type':'application/json'},body:JSON.stringify({id:'form-site',revision:1,site:badSite})}),400,'save validation reports page and nested section');assert.match(save.error,/Page "Home".*Section.*Contact office.*secure URL/);
 await mkdir('.sites-runtime/error-check',{recursive:true});await build({entryPoints:['lib/api-error.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/error-check/api-error.mjs',logLevel:'silent'});
 const {responseJson,failureReason}=await import('../.sites-runtime/error-check/api-error.mjs');
 for(const [status,message] of [[401,'session expired'],[403,'permission'],[409,'Another tab'],[413,'too large'],[503,'unavailable']])await assert.rejects(responseJson(Response.json({}, {status})),new RegExp(message));
 await assert.rejects(responseJson(new Response('<html>Bad gateway</html>',{status:502})),/HTTP 502/);assert.match(failureReason(new TypeError('Failed to fetch')),/connection/);count++;console.log('PASS actionable save errors for auth, conflict, size, server, HTML and network failures');
 await build({stdin:{contents:"export * from './lib/imported-template';export * from './lib/imported-inquiry';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/error-check/paradis.mjs',logLevel:'silent'});
 const {paradisTemplate,isImportedInquiry}=await import('../.sites-runtime/error-check/paradis.mjs');
 const imported=paradisTemplate();
 await db.prepare('UPDATE client_sites SET draft=?,published=? WHERE id=?').bind(JSON.stringify(imported),JSON.stringify(imported),'form-site').run();
 for(const page of imported.pages){for(const block of page.blocks.filter(isImportedInquiry)){
  const data=new FormData();const requestId=crypto.randomUUID();
  for(const [key,value] of Object.entries({pageId:page.id,formId:block.id,requestId,website:'','field:name':'Local QA guest','field:email':'qa@example.com','field:phone':'555-0100','field:date':'2030-06-20','field:event_type':'Wedding','field:booth':'360 Photo Booth','field:location':'Test event venue','field:message':'Template inquiry integration test'}))data.set(key,value);
  await verify(await submit(data,'https://school.example.com','https://school.example.com/api/forms','192.0.2.50'),201,'Paradis '+page.name+' inquiry stored in suite inbox');
  await verify(await submit(data,'https://school.example.com','https://school.example.com/api/forms','192.0.2.50'),200,'Paradis inquiry retry does not create a duplicate');
  const saved=await db.prepare('SELECT id,form_name FROM form_submissions WHERE request_id=?').bind(requestId).first();assert.equal(saved.form_name,'Check Availability');
  const detail=await verify(await inbox('&id='+saved.id),200,'Paradis inquiry visible to website owner');assert.equal(detail.answers.length,8);assert.equal(detail.answers.find(a=>a.fieldId==='booth').value,'360 Photo Booth');
  await verify(await inbox('&id='+saved.id,'other'),403,'Paradis inquiry stays private to its website');
  block.formEnabled=false;await db.prepare('UPDATE client_sites SET published=? WHERE id=?').bind(JSON.stringify(imported),'form-site').run();
  await verify(await submit(data,'https://school.example.com','https://school.example.com/api/forms','192.0.2.50'),404,'disabled imported inquiry rejects submissions');
  block.formEnabled=true;await db.prepare('UPDATE client_sites SET published=? WHERE id=?').bind(JSON.stringify(imported),'form-site').run();
 }}
 console.log(`PASS: ${count} forms and save-error checks; all identity and external services mocked.`);
}finally{await mf.dispose();}
