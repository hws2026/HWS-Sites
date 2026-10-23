import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const dir=resolve('.sites-runtime/creation-check');await mkdir(dir,{recursive:true});
await build({stdin:{contents:"export * from './lib/create-website';export * from './lib/template-start';export * from './lib/site-store';",resolveDir:resolve('.')},bundle:true,platform:'node',format:'esm',outfile:dir+'/creation.mjs',logLevel:'silent'});
const {createWebsite,isEmptyStartingSite,startFromTemplate,startFromWebsite,blankWebsite,validateWebsite}=await import(dir+'/creation.mjs');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
const input={title:'My clean website',assignTo:'self',customerId:'',templateId:'eaglecrest',startMode:'scratch'};
function backend({legacy=true,revision=1,published=null,failSave=false,failRead=false,ignoreSave=false}={}){
 const state={site:null,revision,published,posts:0,puts:0,reads:0,failSave,failRead,ignoreSave};
 const request=async(path,init={})=>{
  if(path==='/api/admin'&&init.method==='POST'){
   state.posts++;const body=JSON.parse(init.body);assert.equal(body.action,'site');
   state.site=startFromTemplate(body.templateId,legacy?'full':body.startMode);state.site.name=body.title;
   return Response.json({ok:true,id:'new-site'});
  }
  if(path==='/api/site?id=new-site'){
   state.reads++;if(state.failRead)return Response.json({error:'Read interrupted'}, {status:503});
   return Response.json({site:state.site,revision:state.revision,published:state.published});
  }
  if(path==='/api/site'&&init.method==='PUT'){
   state.puts++;const body=JSON.parse(init.body);assert.equal(body.id,'new-site');assert.equal(body.publish,false);
   if(state.failSave)return Response.json({error:'Save interrupted'}, {status:503});
   assert.equal(body.revision,state.revision);
   if(!state.ignoreSave){state.site=validateWebsite(body.site);state.revision++;}
   return Response.json({revision:state.revision});
  }
  throw Error('Unexpected request: '+path);
 };
 return {state,request};
}
for(const templateId of ['sau70','crane','greece','athena','horizon','eaglecrest','dubois','ics','greenwich','police','business','general']){
 const {state,request}=backend();
 const id=await createWebsite({...input,templateId},request);
 check('old backend: scratch saves one blank page for '+templateId,()=>{assert.equal(id,'new-site');assert.ok(isEmptyStartingSite(state.site));assert.equal(state.site.name,input.title);assert.equal(state.posts,1);assert.equal(state.puts,1);assert.equal(state.reads,2);});
}
{
 const {state,request}=backend({legacy:false});await createWebsite(input,request);
 check('updated backend: verifies its empty draft without replacing it',()=>{assert.equal(state.puts,0);assert.equal(state.reads,1);assert.ok(isEmptyStartingSite(state.site));});
}
{
 const {state,request}=backend();await createWebsite({...input,startMode:'full'},request);
 check('whole-template creation preserves all demo pages',()=>{assert.ok(state.site.pages.length>100);assert.equal(state.puts,0);});
}
for(const extra of [{revision:2},{published:{name:'Already published'}}]){
 const {state,request}=backend(extra);await assert.rejects(createWebsite(input,request),/content was preserved/);
 check('already edited or published drafts are never cleared',()=>{assert.equal(state.puts,0);assert.ok(state.site.pages.length>100);});
}
{
 const {state,request}=backend({failSave:true});let id;
 await assert.rejects(createWebsite(input,request,{onCreated:value=>{id=value;}}),/Save interrupted/);
 state.failSave=false;await createWebsite(input,request,{id});
 check('failed save can be retried without creating duplicate websites',()=>{assert.equal(state.posts,1);assert.ok(isEmptyStartingSite(state.site));});
}
{
 const {state,request}=backend({failRead:true});let id;
 await assert.rejects(createWebsite(input,request,{onCreated:value=>{id=value;}}),/Read interrupted/);
 state.failRead=false;await createWebsite(input,request,{id});
 check('failed initial read preserves the created ID for retry',()=>{assert.equal(state.posts,1);assert.ok(isEmptyStartingSite(state.site));});
}
{
 const {state,request}=backend();let id;
 const interrupted=async(path,init)=>{const response=await request(path,init);if(init?.method==='PUT')state.failRead=true;return response;};
 await assert.rejects(createWebsite(input,interrupted,{onCreated:value=>{id=value;}}),/Read interrupted/);
 state.failRead=false;await createWebsite(input,request,{id});
 check('retry after a successful save and failed verification does not replace again',()=>{assert.equal(state.posts,1);assert.equal(state.puts,1);});
}
{
 const {state,request}=backend({ignoreSave:true});await assert.rejects(createWebsite(input,request),/did not save/);
 check('a success response with unsaved demo content is rejected',()=>{assert.equal(state.puts,1);assert.ok(state.site.pages.length>100);});
}
{
 let created=false;await assert.rejects(createWebsite(input,async()=>Response.json({error:'Unauthorized'},{status:401}),{onCreated:()=>{created=true;}}),/Unauthorized/);
 check('unauthorized creation never reports a new website',()=>assert.equal(created,false));
}


const neutral=blankWebsite();
check('blank starts without a reference design or demo content',()=>{validateWebsite(neutral);assert.ok(isEmptyStartingSite(neutral));assert.equal(neutral.layout,'simple');assert.equal(neutral.templateId,'blank');});
const original=startFromTemplate('eaglecrest','full'),before=JSON.stringify(original);
const outline=startFromWebsite(original,'outline');
check('outline keeps page hierarchy, styling, header/footer and menus while clearing content',()=>{
 validateWebsite(outline);assert.equal(outline.pages.length,original.pages.length);
 assert.ok(outline.pages.every(page=>page.blocks.length===0&&!page.summary&&!page.banner));
 for(const key of ['templateId','layout','font','accent','colors','palette','logo','footerText','footerLinks','navigationStyle','megaMenuLayout'])assert.deepEqual(outline[key],original[key]);
 assert.deepEqual(outline.pages.map(p=>[p.name,p.slug,p.navLabel,p.menuStyle]),original.pages.map(p=>[p.name,p.slug,p.navLabel,p.menuStyle]));
 assert.ok(outline.pages.every(p=>!original.pages.some(old=>old.id===p.id)));
 for(const [index,page] of original.pages.entries())if(page.parentId)assert.equal(outline.pages.find(p=>p.id===outline.pages[index].parentId).slug,original.pages.find(p=>p.id===page.parentId).slug);
 assert.deepEqual(outline.calendarEvents,[]);assert.deepEqual(outline.library,[]);assert.equal(JSON.stringify(original),before);
});
const whole=startFromWebsite(original,'full');
check('whole-site copies keep sections and isolate later edits',()=>{validateWebsite(whole);assert.equal(whole.pages[0].blocks.length,original.pages[0].blocks.length);whole.pages[0].blocks[0].title='Changed copy';assert.equal(JSON.stringify(original),before);});

const designOnly=startFromWebsite(original,'design');
check('design-only copy keeps branding and starts with one empty Home page',()=>{validateWebsite(designOnly);assert.equal(designOnly.pages.length,1);assert.deepEqual(designOnly.pages[0].blocks,[]);assert.equal(designOnly.templateId,original.templateId);assert.equal(designOnly.accent,original.accent);assert.deepEqual(designOnly.headerMenus,[]);});

const withPayments=blankWebsite();
withPayments.pages[0].blocks=[{id:'payment-copy',type:'payment',paymentProvider:'honeybook',honeybookLinkId:'private-site-link',paymentOfferId:'private-site-offer'}];
withPayments.library=[{id:'payment-library',name:'Payment',block:structuredClone(withPayments.pages[0].blocks[0])}];
const paymentCopy=startFromWebsite(withPayments,'full');
check('new websites cannot inherit another website payment destinations',()=>{assert.equal(paymentCopy.pages[0].blocks[0].paymentProvider,'honeybook');assert.equal(paymentCopy.pages[0].blocks[0].honeybookLinkId,undefined);assert.equal(paymentCopy.pages[0].blocks[0].paymentOfferId,undefined);assert.ok(!JSON.stringify(paymentCopy.library).includes('private-site'));assert.equal(withPayments.pages[0].blocks[0].honeybookLinkId,'private-site-link');});

console.log(`PASS: ${checks} website-creation checks; all requests used in-memory test fixtures.`);
