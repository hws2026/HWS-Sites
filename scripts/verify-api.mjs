import assert from 'node:assert/strict';
const base='http://127.0.0.1:5174';
const owner='test-owner-'+crypto.randomUUID(),editor='test-editor-'+crypto.randomUUID(),viewer='test-viewer-'+crypto.randomUUID(),outsider='test-outsider-'+crypto.randomUUID();
const users={owner:{id:owner,email:owner+'@example.com'},editor:{id:editor,email:editor+'@example.com'},viewer:{id:viewer,email:viewer+'@example.com'},outsider:{id:outsider,email:outsider+'@example.com'}};
let checks=0;
async function request(path,method='GET',body,user='owner',extra={}){const headers={...extra};if(user){headers['oai-authenticated-user-id']=users[user].id;headers['oai-authenticated-user-email']=users[user].email;}if(body&&! (body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(base+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});let result;const raw=await response.text();try{result=JSON.parse(raw);}catch{result=raw;}return{status:response.status,result};}
function check(result,status,label){assert.equal(result.status,status,label+': '+JSON.stringify(result.result).slice(0,300));checks++;console.log('PASS '+label);return result.result;}
check(await request('/api/admin','GET',null,null),401,'anonymous admin rejected');
check(await request('/api/admin','POST',{action:'initialize'}),200,'workspace initialized');
const suite=check(await request('/api/admin'),200,'admin data loaded');assert.equal(suite.customers.length,10);assert.equal(suite.sites.length,10);assert.equal(new Set(suite.sites.map(s=>s.template_id)).size,10);checks++;console.log('PASS ten customers and ten distinct templates');
const siteId=suite.sites[0].id;
const original=check(await request('/api/site?id='+siteId),200,'owner can load a site');
check(await request('/api/site?id='+siteId,'GET',null,'outsider'),404,'cross-customer draft denied');
check(await request('/api/admin','POST',{action:'access',siteId,email:users.editor.email,role:'editor'}),200,'owner assigns editor');
check(await request('/api/admin','POST',{action:'access',siteId,email:users.viewer.email,role:'viewer'}),200,'owner assigns viewer');
check(await request('/api/portal','POST',{},'editor'),200,'editor access activated');check(await request('/api/portal','POST',{},'viewer'),200,'viewer access activated');
const portal=check(await request('/api/portal','GET',null,'editor'),200,'customer portal loaded');assert.equal(portal.sites.length,1);checks++;console.log('PASS customer sees only one assigned website');
check(await request('/api/site','PUT',{id:siteId,site:original.site,revision:original.revision},'viewer'),403,'viewer cannot write');
const changed=structuredClone(original.site);changed.name='Verified draft';changed.logo='/demo-campus.webp';changed.announcement='Shared suite announcement';changed.headerBackground='#112233';
const sharedBlocks=['gallery','accordion','directory','video','alert'].map(type=>({...original.site.pages[0].blocks[0],id:crypto.randomUUID(),type,title:'Suite '+type,text:'Shared description',link:type==='video'?'https://youtu.be/dQw4w9WgXcQ':'#',columns:2,gap:16,radius:8,maxWidth:960,items:[{id:crypto.randomUUID(),title:'Shared item',text:'Custom item content',link:original.site.pages[1].slug,image:'/demo-campus.webp',meta:'Sample details'}]}));changed.pages[0].blocks.push(...sharedBlocks);
for(const record of suite.sites.slice(1)){const draft=check(await request('/api/site?id='+record.id),200,'template draft loads: '+record.template_id);draft.site.pages[0].blocks.push(...structuredClone(sharedBlocks));draft.site.footerColor='#eeffff';check(await request('/api/site','PUT',{id:record.id,site:draft.site,revision:draft.revision}),200,'expanded modules save: '+record.template_id);const reloaded=check(await request('/api/site?id='+record.id),200,'expanded modules reload: '+record.template_id);assert.deepEqual(reloaded.site.pages[0].blocks.slice(-5),sharedBlocks);}

const saved=check(await request('/api/site','PUT',{id:siteId,site:changed,revision:original.revision},'editor'),200,'editor can save');
check(await request('/api/site','PUT',{id:siteId,site:changed,revision:original.revision}),409,'stale revision rejected');
check(await request('/api/site','PUT',{id:siteId,site:changed,revision:saved.revision,publish:true},'editor'),403,'customer editor cannot publish');
const published=check(await request('/api/site','PUT',{id:siteId,site:changed,revision:saved.revision,publish:true}),200,'owner can publish');
check(await request(published.url),200,'published page renders');
changed.name='Unpublished changes';const after=check(await request('/api/site','PUT',{id:siteId,site:changed,revision:published.revision}),200,'post-publication draft saved');
const snapshots=check(await request('/api/site?id='+siteId),200,'saved versions read');assert.deepEqual(snapshots.site.pages[0].blocks.slice(-5),sharedBlocks);assert.equal(snapshots.site.logo,'/demo-campus.webp');assert.equal(snapshots.site.announcement,'Shared suite announcement');assert.equal(snapshots.site.name,'Unpublished changes');assert.equal(snapshots.published.name,'Verified draft');checks++;console.log('PASS published snapshot separate from draft');
check(await request('/api/site','PUT',{id:siteId,site:changed,revision:after.revision},'owner',{Origin:'https://foreign.invalid'}),400,'foreign browser origin rejected');
const data=new FormData();data.set('siteId',siteId);data.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nxoAAAAASUVORK5CYII=','base64')],'sample.png',{type:'image/png'}));
const uploaded=check(await request('/api/upload','POST',data,'editor'),200,'editor image upload');
check(await request(uploaded.url,'GET',null,'viewer'),200,'assigned viewer can view image');check(await request(uploaded.url,'GET',null,'outsider'),404,'cross-customer image rejected');
check(await request('/api/admin','POST',{action:'unpublish',siteId}),200,'unpublish works');check(await request(published.url),404,'unpublished visitor page unavailable');
check(await request('/api/admin','POST',{action:'archive',siteId}),200,'archive works');check(await request('/api/site','PUT',{id:siteId,site:changed,revision:after.revision}),400,'archived draft cannot be changed');check(await request('/api/admin','POST',{action:'archive',siteId}),200,'restore works');
console.log(JSON.stringify({passed:checks,owner,siteId}));
