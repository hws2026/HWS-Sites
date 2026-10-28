import {Miniflare,createFetchMock} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const mock=createFetchMock();mock.disableNetConnect();
for(const id of ['owner','admin','support','billing','customer','other','editor','viewer'])mock.get('https://auth.test').intercept({path:'/auth/v1/user',headers:{authorization:'Bearer '+id}}).reply(200,{id,email:id+'@example.test',email_confirmed_at:'2026-10-01'}).persist();
let mailFailure=false;const mails=[],dnsWrites=[],cloudRecords=[],godaddyRecords=[];
const captureMail=async o=>{mails.push({body:JSON.parse(await new Response(o.body).text()),key:o.headers['Idempotency-Key']??o.headers['idempotency-key']});return JSON.stringify({id:'email-'+mails.length});};
mock.get('https://api.resend.com').intercept({path:'/emails',method:'POST'}).reply(200,captureMail).times(2);
mock.get('https://api.resend.com').intercept({path:'/emails',method:'POST'}).reply(503,captureMail).times(1);
mock.get('https://api.resend.com').intercept({path:'/emails',method:'POST'}).reply(200,captureMail).persist();
mock.get('https://cloudflare-dns.com').intercept({path:/^\/dns-query/}).reply(o=>{const u=new URL(o.path,'https://cloudflare-dns.com'),name=u.searchParams.get('name'),type=u.searchParams.get('type');const provider=name.endsWith('cf-site.org')?'cloudflare':name.endsWith('gd-site.org')?'godaddy':'other';const zone=provider==='cloudflare'?'cf-site.org':provider==='godaddy'?'gd-site.org':'other-site.org';return {statusCode:200,data:JSON.stringify({Status:0,Answer:type==='NS'&&name===zone?[{name:zone+'.',type:2,data:provider==='cloudflare'?'anna.ns.cloudflare.com.':provider==='godaddy'?'ns1.domaincontrol.com.':'ns1.other-dns.net.'}]:[]})};}).persist();
const zoneId='a'.repeat(32),cfPath='/client/v4/zones/'+zoneId+'/dns_records';
mock.get('https://api.cloudflare.com').intercept({path:/.*/,method:'GET'}).reply(o=>{const u=new URL(o.path,'https://api.cloudflare.com');return {statusCode:200,data:JSON.stringify(u.pathname==='/client/v4/zones'?{success:true,result:[{id:zoneId,name:'cf-site.org',status:'active'}]}:{success:true,result:cloudRecords.filter(r=>r.name===u.searchParams.get('name')),result_info:{total_pages:1}})};}).persist();
mock.get('https://api.cloudflare.com').intercept({path:cfPath,method:'POST'}).reply(200,async o=>{const r=JSON.parse(await new Response(o.body).text());cloudRecords.push(r);dnsWrites.push(r);return JSON.stringify({success:true,result:r});}).persist();
const gdPath='/v3/domains/zones/gd-site.org/dns-records';
mock.get('https://api.godaddy.com').intercept({path:new RegExp('^'+gdPath+'\\?')}).reply(o=>({statusCode:200,data:JSON.stringify({items:godaddyRecords.filter(r=>r.name===new URL(o.path,'https://api.godaddy.com').searchParams.get('name')),totalPages:1})})).persist();
mock.get('https://api.godaddy.com').intercept({path:gdPath,method:'POST'}).reply(201,async o=>{const r=JSON.parse(await new Response(o.body).text());godaddyRecords.push(r);dnsWrites.push(r);return JSON.stringify(r);}).persist();
const mf=new Miniflare({modules:true,scriptPath:'backend/backend-dist/worker.js',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],fetchMock:mock,bindings:{FRONTEND_URL:'https://front.test/',SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'test',ADMIN_SUPABASE_USER_IDS:'owner',HWS_DATA_KEY:'19'.repeat(32),RESEND_API_KEY:'test-only',EMAIL_FROM:'Husky Suite <onboarding@example.test>',SECURITY_ALERT_EMAIL:'owner@example.test',CUSTOM_DOMAIN_TARGET:'hws-customer-sites.pages.dev'}});
let checks=0;
async function req(path,method='GET',data,who='owner'){const r=await mf.dispatchFetch('https://api.test'+path,{method,headers:{Origin:'https://front.test',Authorization:'Bearer '+who,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json()};}
function check(r,status,label){assert.equal(r.status,status,label+': '+JSON.stringify(r.data));checks++;console.log('PASS '+label);return r.data;}
try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const s of (await readFile('drizzle/'+f,'utf8')).replaceAll(/-->[^\n]*/g,'').split(';').filter(s=>s.trim()))await db.prepare(s).run();
 await req('/api/admin','POST',{action:'initialize'});
 const c=check(await req('/api/admin','POST',{action:'customer',name:'Paradise',email:'customer@example.test'}),200,'create customer');
 const other=check(await req('/api/admin','POST',{action:'customer',name:'Other',email:'other@example.test'}),200,'create other customer');
 const own=[];for(const title of ['Husky Solutions LLC','MONROE COUNTY RP - WNY'])own.push(check(await req('/api/admin','POST',{action:'site',assignTo:'self',title,source:'blank'}),200,'owner creates personal website').id);
 const site=check(await req('/api/admin','POST',{action:'site',customerId:c.id,title:'Paradisephotobooths',source:'blank'}),200,'owner assigns website without access');assert.equal(site.assigned,true);
 const foreign=check(await req('/api/admin','POST',{action:'site',customerId:other.id,title:'Other private website',source:'blank'}),200,'other website assigned');
 for(const role of ['admin','support','billing'])await db.prepare('INSERT INTO team_members (id,owner,email,user_id,role,active,created_at) VALUES (?,?,?,?,?,1,?)').bind(role,'owner',role+'@example.test',role,role,new Date().toISOString()).run();
 for(const [role,permission] of [['editor','editor'],['viewer','viewer'],['owner','admin'],['admin','admin']])await db.prepare('INSERT INTO site_access (id,owner,site_id,email,user_id,role) VALUES (?,?,?,?,?,?)').bind(role,'owner',site.id,role+'@example.test',role,permission).run();
 const customer=check(await req('/api/portal','GET',undefined,'customer'),200,'customer portal works');assert.deepEqual(customer.sites.map(s=>s.id),[site.id]);assert.equal(customer.sites[0].role,'admin');
 for(const endpoint of ['/api/admin','/api/portal','/api/mobile','/api/domains']){const list=check(await req(endpoint),200,'owner scope: '+endpoint);assert.deepEqual(list.sites.map(s=>s.id).sort(),own.sort());assert.ok(!JSON.stringify(list).includes('Paradisephotobooths'));}
 assert.deepEqual(check(await req('/api/admin','GET',undefined,'admin'),200,'team admin has no inherited website access').sites,[]);
 const privateDraft=JSON.parse((await db.prepare('SELECT draft FROM client_sites WHERE id=?').bind(site.id).first()).draft);
 for(const who of ['owner','admin'])for(const [path,method,body,status] of [
  ['/api/site?id='+site.id,'GET',undefined,404],['/api/site','PUT',{id:site.id,site:privateDraft,revision:1,publish:true},403],['/api/forms?siteId='+site.id,'GET',undefined,403],['/api/events?siteId='+site.id,'GET',undefined,403],['/api/domains','POST',{action:'add',siteId:site.id,hostname:'www.cf-site.org'},404],['/api/admin','POST',{action:'unpublish',siteId:site.id},403],['/api/admin','POST',{action:'archive',siteId:site.id},403],['/api/admin','POST',{action:'access',siteId:site.id,email:'owner@example.test',role:'editor'},403],['/api/honeybook?siteId='+site.id,'GET',undefined,403],['/api/website-payments?siteId='+site.id,'GET',undefined,404]]){check(await req(path,method,body,who),status,who+' cannot control customer: '+path);await db.prepare('DELETE FROM security_incidents').run();}
 check(await req('/api/site?id='+own[0],'GET',undefined,'customer'),404,'customer cannot open owner website');check(await req('/api/site?id='+foreign.id,'GET',undefined,'customer'),404,'customer cannot open another customer website');
 check(await req('/api/admin','POST',{action:'archive-customer',id:c.id}),403,'CRM archive cannot take customer website offline');
 check(await req('/api/admin','POST',{action:'delete-customer',id:c.id,confirmName:'Paradise'}),403,'CRM delete cannot delete customer website');
 check(await req('/api/admin','POST',{action:'customer',id:c.id,name:'Paradise',email:'owner@example.test'}),403,'CRM email cannot reassign login identity');
 let draft=check(await req('/api/site?id='+site.id,'GET',undefined,'customer'),200,'primary customer reads draft');
 check(await req('/api/site','PUT',{id:site.id,site:draft.site,revision:draft.revision,publish:true},'customer'),200,'customer publishes without platform owner');
 check(await req('/api/published?id='+site.id),200,'anonymous publication remains public');
 check(await req('/api/portal','POST',{action:'unpublish',siteId:site.id},'customer'),200,'customer unpublishes');
 check(await req('/api/portal','POST',{action:'archive',siteId:site.id},'customer'),200,'customer archives');
 assert.equal(check(await req('/api/portal?archived=1','GET',undefined,'customer'),200,'customer lists archived sites').sites[0].archived,1);
 check(await req('/api/portal','POST',{action:'archive',siteId:site.id},'customer'),200,'customer restores');
 const created=check(await req('/api/portal','POST',{action:'site',customerId:c.id,title:'New template site',source:'template',templateId:'general',startMode:'full'},'customer'),200,'customer chooses template directly');
 check(await req('/api/site?id='+created.id),404,'new customer site does not leak to platform');
 const first=check(await req('/api/admin','POST',{action:'customer',name:'First site customer',email:'viewer@example.test'}),200,'first-site customer setup');
 check(await req('/api/portal','POST',{action:'site',customerId:first.id,title:'First website',source:'blank'},'viewer'),200,'first customer site needs no previous site');
 // Support email recipients are server-selected and notification payloads stay encrypted.
 const thread=check(await req('/api/support','POST',{customerId:c.id,subject:'Question',message:'PRIVATE SUPPORT MESSAGE',to:'attacker@example.test'},'customer'),200,'customer message notifies owner');if(!mails.length)console.log(thread,await db.prepare('SELECT status,last_error FROM support_notifications').all());assert.equal(mails.at(-1)?.body.to[0],'owner@example.test');assert.ok(!JSON.stringify(mails).includes('PRIVATE SUPPORT MESSAGE'));
 check(await req('/api/support','POST',{threadId:thread.threadId,message:'PRIVATE STAFF REPLY'}),200,'staff reply notifies customer');assert.equal(mails.at(-1).body.to[0],'customer@example.test');
 mailFailure=true;check(await req('/api/support','POST',{threadId:thread.threadId,message:'Retry notice'}),200,'email outage does not fail saved message');
 const queued=await db.prepare("SELECT * FROM support_notifications WHERE status='pending'").first();assert.ok(queued);assert.ok(!queued.payload.includes('customer@example.test'));
 await db.prepare('UPDATE support_notifications SET next_at=0').run();mailFailure=false;await (await mf.getWorker()).scheduled({scheduledTime:Date.now(),cron:'* * * * *'});const sent=mails.length;
 await (await mf.getWorker()).scheduled({scheduledTime:Date.now(),cron:'* * * * *'});assert.equal(mails.length,sent);assert.equal((await db.prepare('SELECT status FROM support_notifications WHERE id=?').bind(queued.id).first()).status,'accepted');checks++;console.log('PASS retry queue confirms acceptance without duplicate successful sends');
 const dns=async(action,id,extra={})=>req('/api/domains','POST',{action,id,...extra},'customer');
 const d=check(await req('/api/domains','POST',{action:'add',siteId:site.id,hostname:'www.cf-site.org'},'customer'),200,'customer adds own domain');
 check(await req('/api/domains','POST',{action:'scan',id:d.id}),404,'owner cannot scan private customer domain settings');
 assert.equal(check(await dns('scan',d.id),200,'DNS scan detects Cloudflare').scan.provider,'cloudflare');
 check(await dns('connect-dns',d.id,{token:'dns-test-token',confirm:true}),410,'automatic DNS writes are removed');
 check(await dns('start-provider-connection',d.id),410,'automatic provider sign-in is removed');
 assert.equal(dnsWrites.length,0);
 const gd=check(await req('/api/domains','POST',{action:'add',siteId:site.id,hostname:'www.gd-site.org'},'customer'),200,'GoDaddy manual domain added');
 assert.equal(check(await dns('scan',gd.id),200,'GoDaddy DNS remains scannable').scan.provider,'godaddy');
 check(await dns('connect-dns',gd.id,{token:'gd-test-token',confirm:true}),410,'GoDaddy automatic insertion disabled');assert.equal(dnsWrites.length,0);
 const unsupported=check(await req('/api/domains','POST',{action:'add',siteId:site.id,hostname:'www.other-site.org'},'customer'),200,'other provider manual domain added');assert.equal(check(await dns('scan',unsupported.id),200,'other DNS providers can be scanned').scan.provider,'manual');
 for(const table of ['site_domains','activity','security_events'])assert.ok(!JSON.stringify((await db.prepare('SELECT * FROM '+table).all()).results).includes('dns-test-token'));
 console.log(`PASS: ${checks} tenant isolation, support notification, and DNS connector checks; all providers mocked.`);
}finally{await mf.dispose();}
