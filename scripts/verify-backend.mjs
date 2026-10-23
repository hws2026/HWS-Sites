import {Miniflare,createFetchMock} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const mock=createFetchMock();mock.disableNetConnect();
for(const [token,id,email] of [['admin-token','admin-uuid','admin@example.com'],['customer-token','customer-uuid','customer@example.com'],['other-token','other-uuid','other@example.com']])mock.get('https://auth.test').intercept({path:'/auth/v1/user',headers:{authorization:'Bearer '+token}}).reply(200,{id,email,email_confirmed_at:'2026-10-01'}).persist();
mock.get('https://api.resend.com').intercept({path:'/emails',method:'POST'}).reply(200,{id:'mock-email-id'}).times(2);
mock.get('https://api.resend.com').intercept({path:'/emails',method:'POST'}).reply(503,{}).persist();
const mf=new Miniflare({modules:true,scriptPath:'backend/backend-dist/worker.js',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],fetchMock:mock,bindings:{FRONTEND_URL:'https://front.test/hws/',SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'public-test-key',ADMIN_SUPABASE_USER_IDS:'admin-uuid',RESEND_API_KEY:'mock-only',EMAIL_FROM:'test@example.com'}});
let checks=0;
try{const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){for(const sql of (await readFile('drizzle/'+file,'utf8')).replaceAll(/-->[^\n]*/g,'').split(';').filter(x=>x.trim()))await db.prepare(sql).run();}
async function req(path,method='GET',body,token='admin-token',origin='https://front.test',extra={}){const headers={Origin:origin,...extra};if(token)headers.Authorization='Bearer '+token;if(body)headers['Content-Type']='application/json';const response=await mf.dispatchFetch('https://api.test'+path,{method,headers,body:body?JSON.stringify(body):undefined});const data=await response.json();return {status:response.status,data,headers:response.headers};}
function check(r,status,label){assert.equal(r.status,status,label+': '+(r.data.error??'unexpected status'));checks++;console.log('PASS '+label);return r.data;}
check(await req('/api/admin','GET',null,null,'https://front.test',{'oai-authenticated-user-id':'admin-uuid','oai-authenticated-user-email':'admin@example.com'}),401,'spoofed identity headers rejected');check(await req('/api/admin','GET',null,'customer-token'),403,'customer cannot open platform admin');check(await req('/api/admin','GET',null,'admin-token','https://evil.test'),403,'foreign origin rejected');
const mobileHeaders={'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'};
for(const [path,method] of [['/api/admin','POST'],['/api/portal','GET'],['/api/site','PUT'],['/api/upload','PUT'],['/api/domains','POST'],['/api/reminders','GET'],['/media/test','GET']]){
 const blocked=check(await req(path,method,method==='POST'||method==='PUT'?{}:undefined,'invalid-mobile-token','https://front.test',mobileHeaders),403,'desktop-only mobile route: '+method+' '+path);assert.equal(blocked.code,'DESKTOP_REQUIRED');
}
for(const [path,method] of [['/api/me','GET'],['/api/mobile','GET'],['/api/mobile','POST'],['/api/events','GET'],['/api/events','PUT'],['/api/forms','GET'],['/api/billing','POST'],['/api/website-payments','GET'],['/api/site-login','POST']])check(await req(path,method,undefined,null,'https://front.test',mobileHeaders),401,'mobile private route requires login: '+method+' '+path);
check(await req('/api/me','GET',null,'admin-token','https://front.test',{'Sec-CH-UA-Mobile':'?1'}),200,'signed-in mobile identity is available');
check(await req('/api/site','GET',null,'admin-token','https://front.test',{'Sec-CH-UA-Mobile':'?0','Sec-CH-UA-Platform':'"Android"'}),403,'Android tablet cannot open full editor API');
check(await req('/api/admin','GET',null,'admin-token','https://front.test',{'X-HWS-Device':'mobile'}),403,'desktop-mode iPad remains limited');
check(await req('/api/admin','GET',null,'admin-token','https://front.test',{...mobileHeaders,'X-HWS-Device':'desktop'}),403,'desktop declaration cannot override mobile evidence');
check(await req('/health','GET',null,null,'https://front.test',mobileHeaders),200,'health remains available from mobile');
const preflight=await mf.dispatchFetch('https://api.test/api/me',{method:'OPTIONS',headers:{Origin:'https://front.test',...mobileHeaders,'Access-Control-Request-Headers':'X-HWS-Device'}});assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-headers'),/X-HWS-Device/);checks++;console.log('PASS device header preflights are supported');
const me=await req('/api/me');check(me,200,'Supabase identity validated');assert.equal(me.headers.get('access-control-allow-origin'),'https://front.test');
check(await req('/api/admin','POST',{action:'initialize'}),200,'admin initializes workspace');
const empty=check(await req('/api/admin'),200,'empty workspace loads');assert.equal(empty.customers.length,0);assert.equal(empty.sites.length,0);checks++;console.log('PASS no demo accounts or sites are seeded');
check(await req('/api/admin','POST',{action:'initialize'}),200,'workspace initialization is idempotent');assert.equal((await db.prepare('SELECT count(*) n FROM workspaces').first()).n,1);
check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'Forbidden',templateId:'sau70'},'customer-token'),403,'customer cannot claim platform-owned templates');
check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'Invalid',templateId:'unknown'}),400,'unknown starting template rejected');
check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'Invalid mode',templateId:'eaglecrest',startMode:'invalid'}),400,'invalid template starting choice rejected');
for(const templateId of ['sau70','crane','greece','athena','horizon','eaglecrest','dubois','ics','greenwich','police','business','general']){
 const own=check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'My '+templateId,templateId,owner:'other-uuid'}),200,'owner creates own-account site: '+templateId);
 const record=await db.prepare('SELECT owner,customer_id,template_id FROM client_sites WHERE id=?').bind(own.id).first();assert.equal(record.owner,'admin-uuid');assert.equal(record.customer_id,'');assert.equal(record.template_id,templateId);
 check(await req('/api/site?id='+own.id),200,'own-account template is editable: '+templateId);
 check(await req('/api/site?id='+own.id,'GET',null,'other-token'),404,'own-account template stays private: '+templateId);
}
assert.equal((await req('/api/admin')).data.customers.length,0);checks++;console.log('PASS personal websites create no fake customer records');
const ownerPortal=check(await req('/api/portal'),200,'owner can see personal websites in portal');assert.equal(ownerPortal.sites.length,12);assert.ok(ownerPortal.sites.every(site=>site.role==='admin'));
assert.equal((await req('/api/portal','GET',null,'other-token')).data.sites.length,0);checks++;console.log('PASS other accounts cannot see owner personal websites');
const blankSiteId=check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'Blank branded site',templateId:'eaglecrest',startMode:'scratch'}),200,'owner creates a site from scratch').id;
const blankSite=check(await req('/api/site?id='+blankSiteId),200,'scratch website opens in the editor');assert.equal(blankSite.site.pages.length,1);assert.equal(blankSite.site.pages[0].blocks.length,0);assert.equal(blankSite.site.name,'Blank branded site');assert.equal(blankSite.site.templateId,'eaglecrest');assert.deepEqual(blankSite.site.calendarEvents,[]);assert.equal(blankSite.site.utilityLinks,'');assert.deepEqual(blankSite.site.headerMenus,[]);checks++;console.log('PASS scratch site stores only the theme and a clean Home page');
check(await req('/api/site','PUT',{id:blankSiteId,site:blankSite.site,revision:blankSite.revision,publish:true}),200,'empty branded starting site can be saved and published');
const fullSiteId=check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'Full branded site',templateId:'eaglecrest',startMode:'full'}),200,'owner explicitly creates the whole template').id;
const fullSite=check(await req('/api/site?id='+fullSiteId),200,'whole template opens in the editor');assert.ok(fullSite.site.pages.length>100);assert.ok(fullSite.site.pages[0].blocks.length>0);assert.ok(fullSite.site.calendarEvents.length>0);checks++;console.log('PASS full mode retains all template pages and sample content');
const customer=check(await req('/api/admin','POST',{action:'customer',name:'Backend test customer',email:'customer@example.com'}),200,'explicit test customer created');
const siteId=check(await req('/api/admin','POST',{action:'site',customerId:customer.id,title:'Backend test site',templateId:'sau70'}),200,'explicit customer website created').id;
const secondSiteId=check(await req('/api/admin','POST',{action:'site',customerId:customer.id,title:'Second test site',templateId:'crane'}),200,'second test website created').id;
check(await req('/api/admin','POST',{action:'site',customerId:'foreign-customer',title:'No access',templateId:'sau70'}),404,'foreign customer assignment denied');
check(await req('/api/admin','POST',{action:'access',siteId,email:'customer@example.com',role:'editor'}),200,'assigned site access');check(await req('/api/portal','POST',{},'customer-token'),200,'verified email claims portal access');check(await req('/api/site?id='+siteId,'GET',null,'customer-token'),200,'assigned customer can edit');check(await req('/api/site?id='+siteId,'GET',null,'other-token'),404,'cross-customer data denied');

check(await req('/api/site-login','POST',{id:siteId},'customer-token'),200,'site admin login accepts the assigned editor');

check(await req('/api/site-login','POST',{id:secondSiteId},'customer-token'),200,'customer contact automatically receives its second website');
await db.prepare('DELETE FROM site_access WHERE site_id=? AND email=?').bind(secondSiteId,'customer@example.com').run();
const crossLogin=check(await req('/api/site-login','POST',{id:secondSiteId},'customer-token'),403,'another website rejects the same authenticated account');assert.equal(crossLogin.site,null);
const missingLogin=check(await req('/api/site-login','POST',{id:'missing-site'},'customer-token'),403,'unknown website uses the same invalid response');assert.equal(missingLogin.site,null);
check(await req('/api/site-login','POST',{id:siteId},null),401,'site login requires verified authentication');
check(await req('/api/site-login','POST',{id:siteId}),200,'owning administrator can enter website admin');
check(await req('/api/site-login?id='+siteId,'GET',null,null),404,'unpublished site branding stays private');
check(await req('/api/admin','POST',{action:'access',siteId:secondSiteId,email:'other@example.com',role:'viewer'}),200,'viewer assignment created');
const viewerLogin=check(await req('/api/site-login','POST',{id:secondSiteId},'other-token'),403,'read-only viewers cannot use admin login');assert.equal(viewerLogin.site,null);
check(await req('/api/site?id='+secondSiteId,'GET',null,'other-token'),200,'site-specific login activates only the verified matching invitation');

const draft=check(await req('/api/site?id='+siteId),200,'admin reads draft');const flatten=blocks=>blocks.flatMap(b=>[b,...flatten(b.children??[]),...(b.items??[]).flatMap(item=>flatten(item.children??[]))]);const events=flatten(draft.site.pages[0].blocks).find(b=>b.type==='events');assert.ok(events,'Reference template has a nested event module');draft.site.calendarEvents=[{id:'dated-event',title:'Open house',description:'Meet the team',category:'Community',location:'Main campus',link:'',startsAt:new Date(Date.now()+3600000).toISOString()}];events.eventSource='site';const iconSection={id:'icon-test',type:'icons',title:'Community resources',text:'',label:'',link:'',image:'',background:'#ffffff',color:'#172c47',align:'center',padding:48,columns:3,items:[{id:'icon-item',title:'Calendar',text:'Upcoming dates',meta:'',image:'',link:'calendar',icon:'calendar'},{id:'custom-icon',title:'Contact',text:'Get in touch',meta:'',image:'https://example.com/custom-icon.png',link:'contact',icon:'phone'}]};draft.site.pages[0].blocks.push(iconSection);draft.site.animations=true;draft.site.stickyHeader=true;draft.site.pages[0].blocks[0].slides=[{id:'test-slide',title:'A second story',text:'Saved carousel content',image:'/demo-assets/willow-athletics.svg',imageAlt:'Test graphic',label:'Learn more',link:'home'}];draft.site.pages[0].blocks[0].slideTransition='fade';draft.site.pages[0].blocks[0].slideDuration=800;draft.site.megaMenuLayout='columns';draft.site.directoryMenu={enabled:true,label:'Our schools',groups:[{id:'primary',name:'Elementary',items:[{id:'first-school',name:'Sample Primary School',link:'home'}]}]};
draft.site.colors={header:'#edf2ee',menu:'#123456',menuText:'#ffffff',footer:'#214b42'};draft.site.palette={'#ffffff':'#f4efdf'};draft.site.headerMenus=[{id:'resources',label:'Quick links',placement:'resources',items:[{id:'home-link',label:'Home',link:'home'}]}];draft.site.library=[{id:'saved-icons',name:'Saved icons',block:iconSection}];
check(await req('/api/site','PUT',{id:siteId,site:draft.site,revision:draft.revision,publish:true}),200,'dated event and icon grid published');
const savedIcons=check(await req('/api/site?id='+siteId),200,'icon selections persist in the saved draft');assert.deepEqual(savedIcons.site.pages[0].blocks.find(b=>b.id==='icon-test'),iconSection);assert.deepEqual(savedIcons.published.pages[0].blocks.find(b=>b.id==='icon-test'),iconSection);assert.deepEqual(savedIcons.site.directoryMenu,draft.site.directoryMenu);assert.deepEqual(savedIcons.published.directoryMenu,draft.site.directoryMenu);assert.equal(savedIcons.published.megaMenuLayout,'columns');assert.deepEqual(savedIcons.published.pages[0].blocks[0].slides,draft.site.pages[0].blocks[0].slides);assert.equal(savedIcons.site.pages[0].blocks[0].slideDuration,800);assert.equal(savedIcons.published.animations,true);assert.equal(savedIcons.published.stickyHeader,true);for(const key of ['colors','palette','headerMenus','library','calendarEvents','calendarTimeZone']){assert.deepEqual(savedIcons.site[key],draft.site[key]);assert.deepEqual(savedIcons.published[key],draft.site[key]);}console.log('PASS expanded pages, nested events, color roles, palette, mini menus, and saved library survive draft/publish round trips');
check(await req('/api/published?id='+siteId,'GET',null,'customer-token'),200,'Pages visitor API serves published snapshot');check(await req('/api/published?id='+siteId,'GET',null,'other-token'),200,'published snapshot is public without assignment');

check(await req('/api/published?id='+siteId,'GET',null,null,'https://front.test',mobileHeaders),200,'published snapshots remain accessible on mobile');
const branding=check(await req('/api/site-login?id='+siteId,'GET',null,null),200,'published login branding can load before sign-in');assert.deepEqual(Object.keys(branding.site).sort(),['accent','id','name','slug']);assert.equal(branding.site.name,draft.site.name);
check(await req('/api/reminders','POST',{action:'rules',onboardingEnabled:true,eventEnabled:true,onboardingDays:7,eventHours:24}),200,'both automatic rules enabled');check(await req('/api/reminders','GET',null,'customer-token'),403,'customer cannot schedule admin mail');
const customerId=customer.id;check(await req('/api/reminders','POST',{customerId,subject:'Test reminder',body:'Test message',nextAt:new Date(Date.now()+60000).toISOString(),intervalDays:0}),200,'custom reminder scheduled');
await db.prepare("UPDATE customers SET status='Onboarding' WHERE owner='admin-uuid'").run();await db.prepare("UPDATE reminders SET next_at=? WHERE source IS NULL").bind(new Date(Date.now()-1000).toISOString()).run();
const scheduled=await (await mf.getWorker()).scheduled({cron:'0 * * * *'});const deliveries=await db.prepare("SELECT * FROM reminder_deliveries WHERE status='sent'").all();assert.equal(deliveries.results.length,2);checks++;console.log('PASS scheduled custom and published-event reminders sent through mock provider');
const auto=await db.prepare("SELECT * FROM reminders WHERE source LIKE 'onboarding-%'").all();assert.ok(auto.results.length>0);checks++;console.log('PASS onboarding reminders generated');
await (await mf.getWorker()).scheduled({cron:'0 * * * *'});assert.equal((await db.prepare('SELECT * FROM reminder_deliveries').all()).results.length,2);checks++;console.log('PASS repeated cron does not duplicate delivery');
const sharedSources=await db.prepare("SELECT * FROM reminders WHERE source LIKE 'event-%'").all();assert.equal(sharedSources.results.length,1);checks++;console.log('PASS one shared event creates one reminder across nested cards and calendar pages');
let calendarDraft=(await req('/api/site?id='+siteId)).data;calendarDraft.site.calendarEvents.push({id:'reschedule-test',title:'Planning meeting',description:'First version',location:'Main office',category:'Meetings',link:'',startsAt:new Date(Date.now()+72*3600000).toISOString()});
check(await req('/api/site','PUT',{id:siteId,site:calendarDraft.site,revision:calendarDraft.revision,publish:true}),200,'future shared calendar event published');await (await mf.getWorker()).scheduled({cron:'0 * * * *'});
let queued=(await db.prepare("SELECT * FROM reminders WHERE source LIKE '%reschedule-test%' AND enabled=1").all()).results;assert.equal(queued.length,1);const oldSource=queued[0].source;
calendarDraft=(await req('/api/site?id='+siteId)).data;calendarDraft.site.calendarEvents.find(e=>e.id==='reschedule-test').startsAt=new Date(Date.now()+96*3600000).toISOString();
check(await req('/api/site','PUT',{id:siteId,site:calendarDraft.site,revision:calendarDraft.revision,publish:true}),200,'shared calendar event rescheduled');await (await mf.getWorker()).scheduled({cron:'0 * * * *'});
queued=(await db.prepare("SELECT * FROM reminders WHERE source LIKE '%reschedule-test%' AND enabled=1").all()).results;assert.equal(queued.length,1);assert.notEqual(queued[0].source,oldSource);assert.equal((await db.prepare('SELECT enabled FROM reminders WHERE source=?').bind(oldSource).first()).enabled,0);checks++;console.log('PASS rescheduling cancels the previous queued reminder and schedules the new date');
calendarDraft=(await req('/api/site?id='+siteId)).data;calendarDraft.site.calendarEvents=calendarDraft.site.calendarEvents.filter(e=>e.id!=='reschedule-test');
check(await req('/api/site','PUT',{id:siteId,site:calendarDraft.site,revision:calendarDraft.revision,publish:false}),200,'calendar deletion saved only to draft');await (await mf.getWorker()).scheduled({cron:'0 * * * *'});assert.equal((await db.prepare("SELECT count(*) n FROM reminders WHERE source LIKE '%reschedule-test%' AND enabled=1").first()).n,1);checks++;console.log('PASS unpublished calendar edits do not change live reminders');
calendarDraft=(await req('/api/site?id='+siteId)).data;check(await req('/api/site','PUT',{id:siteId,site:calendarDraft.site,revision:calendarDraft.revision,publish:true}),200,'calendar deletion published');await (await mf.getWorker()).scheduled({cron:'0 * * * *'});assert.equal((await db.prepare("SELECT count(*) n FROM reminders WHERE source LIKE '%reschedule-test%' AND enabled=1").first()).n,0);checks++;console.log('PASS removing a shared event cancels every queued reminder for it');
check(await req('/api/reminders','POST',{customerId:'another-customer',subject:'No',body:'No',nextAt:new Date(Date.now()+60000).toISOString()}),400,'cross-workspace recipient rejected');
const failure=check(await req('/api/reminders','POST',{customerId,subject:'Fail test',body:'Test only',nextAt:new Date(Date.now()+60000).toISOString()}),200,'failure test reminder scheduled');await db.prepare('UPDATE reminders SET next_at=? WHERE id=?').bind(new Date(Date.now()-1000).toISOString(),failure.id).run();await (await mf.getWorker()).scheduled({cron:'0 * * * *'});const failed=await db.prepare('SELECT enabled,last_error FROM reminders WHERE id=?').bind(failure.id).first();assert.equal(failed.enabled,0);assert.ok(failed.last_error);checks++;console.log('PASS failed delivery stopped for review');
await (await mf.getWorker()).scheduled({cron:'0 * * * *'});assert.equal((await db.prepare('SELECT * FROM reminder_deliveries').all()).results.length,3);checks++;console.log('PASS failed delivery is not silently retried');
check(await req('/api/reminders','POST',{action:'rules',onboardingEnabled:false,eventEnabled:false,onboardingDays:7,eventHours:24}),200,'automatic rules disabled');await (await mf.getWorker()).scheduled({cron:'0 * * * *'});assert.equal((await db.prepare('SELECT * FROM reminders WHERE source IS NOT NULL AND enabled=1').all()).results.length,0);checks++;console.log('PASS rule disabling cancels queued automatic reminders');

await db.prepare('DELETE FROM site_access WHERE site_id = ? AND user_id = ?').bind(siteId,'customer-uuid').run();
const revokedLogin=check(await req('/api/site-login','POST',{id:siteId},'customer-token'),403,'revoked account cannot re-enter website admin');assert.equal(revokedLogin.site,null);
check(await req('/api/site?id='+siteId,'GET',null,'customer-token'),404,'revocation blocks direct editor API access too');
await db.prepare('UPDATE client_sites SET archived = 1 WHERE id = ?').bind(siteId).run();
const archivedLogin=check(await req('/api/site-login','POST',{id:siteId}),403,'archived site cannot be opened even by owner');assert.equal(archivedLogin.site,null);
check(await req('/api/site-login?id='+siteId,'GET',null,null),404,'archived site login branding disappears');


// Library retirement never retires customer websites or their publications.
const lifecycleCustomer=check(await req('/api/admin','POST',{action:'customer',name:'Lifecycle organization',email:'lifecycle@example.com'}),200,'lifecycle organization created');
const life=check(await req('/api/admin','POST',{action:'site',customerId:lifecycleCustomer.id,title:'Original lifecycle site',templateId:'crane',startMode:'full'}),200,'lifecycle source created').id;
check(await req('/api/admin','POST',{action:'access',siteId:life,email:'customer@example.com',role:'editor'}),200,'source editor assigned');
check(await req('/api/admin','POST',{action:'access',siteId:life,email:'other@example.com',role:'viewer'}),200,'source viewer assigned');
await req('/api/portal','POST',{},'customer-token');await req('/api/portal','POST',{},'other-token');
let source=(await req('/api/site?id='+life)).data;
source.site.logo='/media/lifecycle-logo';source.site.favicon='/media/lifecycle-logo';source.site.logoDisplay='text-logo';source.site.colors={header:'#123456',menu:'#112233'};
await db.prepare('INSERT INTO media (id,owner,site_id,filename,key,content_type) VALUES (?,?,?,?,?,?)').bind('lifecycle-logo','admin-uuid',life,'logo.png','admin-uuid/source/logo.png','image/png').run();
const bucket=await mf.getR2Bucket('BUCKET');await bucket.put('admin-uuid/source/logo.png',new Uint8Array([137,80,78,71]));
check(await req('/api/site','PUT',{id:life,site:source.site,revision:source.revision,publish:true}),200,'source with media published');
const beforeArchive=await db.prepare('SELECT draft,published,revision FROM client_sites WHERE id=?').bind(life).first();
check(await req('/api/admin','POST',{action:'archive-template',templateId:'crane'},'customer-token'),403,'customer cannot archive library designs');
check(await req('/api/admin','POST',{action:'archive-template',templateId:'crane'}),200,'admin archives template');
assert.deepEqual(await db.prepare('SELECT draft,published,revision FROM client_sites WHERE id=?').bind(life).first(),beforeArchive);
assert.ok((await req('/api/admin')).data.archivedTemplateIds.includes('crane'));
assert.ok((await req('/api/portal','GET',null,'customer-token')).data.archivedTemplateIds.includes('crane'));
check(await req('/api/published?id='+life,'GET',null,null),200,'archived template public website stays available');
source=(await req('/api/site?id='+life)).data;
check(await req('/api/site','PUT',{id:life,site:source.site,revision:source.revision,publish:false},'customer-token'),200,'archived design remains editable by its assigned customer');
source=(await req('/api/site?id='+life)).data;
check(await req('/api/site','PUT',{id:life,site:source.site,revision:source.revision,publish:true}),200,'archived design remains publishable');
check(await req('/api/admin','POST',{action:'site',assignTo:'self',title:'Disallowed library selection',templateId:'crane'}),409,'archive blocks new library selection server-side');
let switchTarget=(await req('/api/site?id='+blankSiteId)).data;
switchTarget.site.templateId='crane';
check(await req('/api/site','PUT',{id:blankSiteId,site:switchTarget.site,revision:switchTarget.revision,publish:false}),409,'archive blocks switching another site to the hidden template');
const createCopy={action:'site',source:'existing',sourceSiteId:life,contextSiteId:life,startMode:'outline',title:'Second campus'};
check(await req('/api/portal','POST',createCopy,'other-token'),403,'viewer cannot create sibling websites');
check(await req('/api/portal','POST',{...createCopy,contextSiteId:blankSiteId},'customer-token'),403,'unassigned organization context denied');
check(await req('/api/admin','POST',{...createCopy,assignTo:'self'}),403,'cross-customer copy denied even when source is in same workspace');
const copied=check(await req('/api/portal','POST',{...createCopy,customerId:'forged',owner:'forged'},'customer-token'),200,'editor creates outline from their archived design');
assert.equal(copied.creationVersion,2);
const copy=(await req('/api/site?id='+copied.id,'GET',null,'customer-token')).data;
assert.equal(copy.site.templateId,'crane');assert.equal(copy.site.pages.length,source.site.pages.length);assert.ok(copy.site.pages.every(page=>page.blocks.length===0));assert.deepEqual(copy.site.colors,source.site.colors);assert.deepEqual(copy.site.calendarEvents,[]);assert.equal(copy.published,null);assert.equal(copy.role,'editor');assert.notEqual(copy.site.logo,source.site.logo);assert.equal(copy.site.favicon,copy.site.logo);assert.equal(copy.site.logoDisplay,'text-logo');
const copyRecord=await db.prepare('SELECT owner,customer_id FROM client_sites WHERE id=?').bind(copied.id).first();assert.deepEqual(copyRecord,{owner:'admin-uuid',customer_id:lifecycleCustomer.id});
check(await req('/api/site?id='+copied.id,'GET',null,'other-token'),404,'source viewer is not silently granted access to the new site');
const mediaRecord=await db.prepare('SELECT key,site_id FROM media WHERE id=?').bind(copy.site.logo.slice(7)).first();assert.equal(mediaRecord.site_id,copied.id);assert.equal(mediaRecord.key,'admin-uuid/source/logo.png');
const previewFile=await mf.dispatchFetch('https://api.test'+copy.site.logo,{headers:{Authorization:'Bearer customer-token'}});assert.equal(previewFile.status,200);checks++;console.log('PASS copied logo has independent site authorization');
const designCopy=check(await req('/api/portal','POST',{...createCopy,startMode:'design',title:'Brand-only campus'},'customer-token'),200,'portal supports design-only copies');
const brandOnly=(await req('/api/site?id='+designCopy.id)).data.site;assert.equal(brandOnly.pages.length,1);assert.equal(brandOnly.pages[0].blocks.length,0);assert.deepEqual(brandOnly.colors,source.site.colors);assert.deepEqual(brandOnly.headerMenus,[]);
check(await req('/api/site','PUT',{id:copied.id,site:copy.site,revision:copy.revision,publish:true}),200,'copied outline publishes independently');
const publicLogo=await mf.dispatchFetch('https://api.test/sites/'+copied.id+copy.site.logo);assert.equal(publicLogo.status,200);checks++;console.log('PASS copied uploaded logo is available to anonymous visitors');
const wholeCopy=check(await req('/api/portal','POST',{...createCopy,startMode:'full',title:'Whole campus copy'},'customer-token'),200,'whole-site copy supported in customer portal');
assert.ok((await req('/api/site?id='+wholeCopy.id)).data.site.pages[0].blocks.length>0);
const neutralCopy=check(await req('/api/portal','POST',{action:'site',source:'blank',contextSiteId:life,title:'Blank school'},'customer-token'),200,'portal can create a completely blank sibling');
const neutralSite=(await req('/api/site?id='+neutralCopy.id)).data;assert.equal(neutralSite.site.templateId,'blank');assert.equal(neutralSite.site.layout,'simple');assert.equal(neutralSite.site.pages.length,1);assert.deepEqual(neutralSite.site.pages[0].blocks,[]);
check(await req('/api/portal','POST',{action:'site',source:'template',contextSiteId:life,templateId:'crane',title:'Hidden library template'},'customer-token'),409,'portal cannot select an archived library design');
check(await req('/api/admin','POST',{action:'restore-template',templateId:'crane'}),200,'admin restores library template');
assert.ok(!(await req('/api/admin')).data.archivedTemplateIds.includes('crane'));
check(await req('/api/portal','POST',{action:'site',source:'template',contextSiteId:life,templateId:'crane',startMode:'scratch',title:'Restored library design'},'customer-token'),200,'restored template selectable in portal');
await db.prepare('UPDATE client_sites SET archived=1 WHERE id=?').bind(life).run();
check(await req('/api/portal','POST',createCopy,'customer-token'),403,'archived source website cannot create siblings');
check(await req('/api/site?id='+copied.id,'GET',null,'customer-token'),200,'archiving the source leaves its copied draft usable');
assert.equal((await mf.dispatchFetch('https://api.test/sites/'+copied.id+copy.site.logo)).status,200);
await db.prepare('UPDATE client_sites SET archived=0 WHERE id=?').bind(life).run();
await db.prepare('UPDATE customers SET archived=1 WHERE id=?').bind(lifecycleCustomer.id).run();
check(await req('/api/portal','POST',createCopy,'customer-token'),403,'archived customer cannot create siblings');

console.log(`PASS: ${checks} standalone backend checks; all email delivery used a mock provider.`);
}finally{await mf.dispose();}
