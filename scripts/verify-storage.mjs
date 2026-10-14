import {Miniflare, createFetchMock} from 'miniflare';
import {readFile, readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const mock = createFetchMock();
mock.disableNetConnect();
for (const [token, id, email] of [['admin-token', 'admin-uuid', 'admin@example.com'], ['editor-token', 'editor-uuid', 'editor@example.com'], ['other-token', 'other-uuid', 'other@example.com']]) {
  mock.get('https://auth.test').intercept({path: '/auth/v1/user', headers: {authorization: 'Bearer ' + token}})
    .reply(200, {id, email, email_confirmed_at: '2026-10-01'}).persist();
}
const stored = new Map();
let bucketPublic = false, uploadFailure = false, readFailure = false, storageReads = 0, storageWrites = 0, uploadStatus = 503, bucketLimit = 50 * 1024 * 1024;
const providerHeaders = {apikey: 'sb_secret_mock_only'};
mock.get('https://auth.test').intercept({path: '/storage/v1/bucket/hws-suite-media', headers: providerHeaders})
  .reply(options => {
    assert.equal(new Headers(options.headers).has('authorization'), false, 'opaque secret stays in apikey header');
    return {statusCode: 200, data: JSON.stringify({id: 'hws-suite-media', public: bucketPublic, file_size_limit: bucketLimit})};
  }).persist();
mock.get('https://auth.test').intercept({path: /^\/storage\/v1\/object\/hws-suite-media\//, method: 'POST', headers: providerHeaders})
  .reply(options => {
    storageWrites++;
    assert.equal(new Headers(options.headers).get('x-upsert'), 'false');
    if (uploadFailure) return {statusCode: uploadStatus, data: '{}'};
    return {statusCode: 200, data: async () => {
      stored.set(options.path.split('/hws-suite-media/')[1], Buffer.from(await new Response(options.body).arrayBuffer()));
      return '{}';
    }};
  }).persist();
mock.get('https://auth.test').intercept({path: /^\/storage\/v1\/object\/authenticated\/hws-suite-media\//, headers: providerHeaders})
  .reply(options => {
    storageReads++;
    if (readFailure) return {statusCode: 503, data: '{}'};
    const data = stored.get(options.path.split('/hws-suite-media/')[1]);
    const range = new Headers(options.headers).get('range');
    if (data && range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      const start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start >= data.length || end < start) return {statusCode:416, data:'', responseOptions:{headers:{'Content-Range':`bytes */${data.length}`}}};
      return {statusCode:206, data:data.subarray(start,end+1), responseOptions:{headers:{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}}};
    }
    return {statusCode: data ? 200 : 404, data: data ?? '{}'};
  }).persist();

mock.get('https://auth.test').intercept({path:'/storage/v1/object/hws-suite-media',method:'DELETE',headers:providerHeaders})
  .reply(options => ({statusCode:200,data:async()=>{const body=await new Response(options.body).json();for(const key of body.prefixes)stored.delete(key);return '[]';}})).persist();

const bindings = {FRONTEND_URL: 'https://front.test/', SUPABASE_URL: 'https://auth.test', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', ADMIN_SUPABASE_USER_IDS: 'admin-uuid', MEDIA_STORAGE: 'supabase', SUPABASE_STORAGE_BUCKET: 'hws-suite-media', SUPABASE_STORAGE_SECRET_KEY: 'sb_secret_mock_only'};
const mf = new Miniflare({modules: true, scriptPath: 'backend/backend-dist/worker.js', compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], fetchMock: mock, bindings});
let checks = 0;
function pass(label) { checks++; console.log('PASS ' + label); }
try {
  const db = await mf.getD1Database('DB');
  for (const file of (await readdir('drizzle')).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of (await readFile('drizzle/' + file, 'utf8')).replaceAll(/-->[^\n]*/g, '').split(';').filter(x => x.trim())) await db.prepare(sql).run();
  }
  async function request(path, body, token = 'admin-token', method = body ? 'POST' : 'GET') {
    return mf.dispatchFetch('https://api.test' + path, {method, headers: {Origin: 'https://front.test', Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
  }
  assert.equal((await request('/api/admin', {action: 'initialize'})).status, 200);
  const initial = await (await request('/api/admin')).json(); assert.equal(initial.customers.length, 0); assert.equal(initial.sites.length, 0);
  const siteId = (await (await request('/api/admin', {action: 'site', assignTo: 'self', title: 'Storage test site', templateId: 'sau70'})).json()).id;
  const secondSiteId = (await (await request('/api/admin', {action: 'site', assignTo: 'self', title: 'Second storage site', templateId: 'crane'})).json()).id;
  await request('/api/admin', {action: 'access', siteId, email: 'editor@example.com', role: 'editor'});
  await request('/api/portal', {}, 'editor-token');
  await request('/api/admin', {action: 'access', siteId: secondSiteId, email: 'other@example.com', role: 'viewer'});
  await request('/api/portal', {}, 'other-token');
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  async function upload(token = 'editor-token', id = siteId, type = 'image/png') {
    const form = new FormData(); form.set('siteId', id); form.set('file', new File([bytes], 'photo.png', {type}));
    const incoming = new Request('https://api.test/api/upload', {method: 'POST', headers: {Origin: 'https://front.test', ...(token ? {Authorization: 'Bearer ' + token} : {})}, body: form});
    return mf.dispatchFetch(incoming.url, {method: 'POST', headers: incoming.headers, body: await incoming.arrayBuffer()});
  }
  assert.equal((await upload('')).status, 401); pass('anonymous uploads denied without contacting storage');
  assert.equal((await upload('other-token')).status, 403);
  assert.equal((await upload('other-token', secondSiteId)).status, 403);
  assert.equal(storageWrites, 0); pass('cross-site and viewer uploads denied before storage');
  assert.equal((await upload('editor-token', siteId, 'image/svg+xml')).status, 400); pass('unsafe upload types rejected');
  const first = await upload(); assert.equal(first.status, 200); const imageUrl = (await first.json()).url;
  assert.equal(storageWrites, 1); pass('assigned editor uploads to private Supabase storage without R2');
  let response = await request(imageUrl, undefined, 'editor-token'); assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes); pass('authorized image download preserves bytes and type');
  const readsBefore = storageReads; assert.equal((await request(imageUrl, undefined, 'other-token')).status, 404); assert.equal(storageReads, readsBefore); pass('cross-customer image reads never reach storage');
  assert.equal((await mf.dispatchFetch('https://api.test/sites/' + siteId + imageUrl)).status, 404); pass('unpublished images remain private');
  const second = await upload(); assert.equal(second.status, 200); const privateUrl = (await second.json()).url;
  async function rawUpload({type='video/mp4',size=bytes.length,body=bytes,token='editor-token',id=siteId,name='video.mp4'}={}) {
    return mf.dispatchFetch('https://api.test/api/upload?' + new URLSearchParams({siteId:id,filename:name,size:String(size)}), {method:'PUT', headers:{Origin:'https://front.test','Content-Type':type,...(token?{Authorization:'Bearer '+token}:{})}, body});
  }
  const beforeInvalid = storageWrites;
  for (const size of [0, -1, 50*1024*1024+1, 1.5, NaN]) assert.equal((await rawUpload({size})).status,400);
  assert.equal((await rawUpload({type:'text/html'})).status,400);
  assert.equal((await rawUpload({token:''})).status,401);
  assert.equal((await rawUpload({token:'other-token'})).status,403);
  assert.equal((await rawUpload({token:'other-token',id:secondSiteId})).status,403);
  assert.equal(storageWrites,beforeInvalid); pass('streamed uploads reject oversize, empty, unsafe, anonymous and unauthorized files before storage');
  const large = new Uint8Array(50*1024*1024); large.set(bytes);
  response = await rawUpload({size:large.length,body:large});
  assert.equal(response.status,200); const videoUrl=(await response.json()).url;
  assert.equal(stored.get((await db.prepare('SELECT key FROM media WHERE id=?').bind(videoUrl.split('/').at(-1)).first()).key).length,large.length);
  pass('full 50 MB video upload is accepted and preserved');
  response = await rawUpload({type:'application/pdf',name:'school guide.pdf'});assert.equal(response.status,200);const pdfUrl=(await response.json()).url;
  response=await request(pdfUrl);assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(response.headers.get('content-disposition'),/school%20guide.pdf/);await response.arrayBuffer();pass('PDF upload returns a safe download filename and correct type');
  assert.equal((await rawUpload({type:'video/webm'})).status,200);pass('WebM videos are accepted');
  const countValid=(await db.prepare('SELECT count(*) n FROM media').first()).n;
  assert.equal((await rawUpload({size:bytes.length-1})).status,400);
  assert.equal((await rawUpload({size:bytes.length+1})).status,400);
  assert.equal((await db.prepare('SELECT count(*) n FROM media').first()).n,countValid);pass('mismatched stream lengths cannot create media records');
  response=await mf.dispatchFetch('https://api.test'+videoUrl,{headers:{Authorization:'Bearer editor-token',Range:'bytes=2-5'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 2-5/${large.length}`);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),large.slice(2,6));pass('private videos support byte-range seeking');
  response=await mf.dispatchFetch('https://api.test'+videoUrl,{headers:{Authorization:'Bearer other-token',Range:'bytes=2-5'}});assert.equal(response.status,404);pass('range requests preserve customer isolation');
  response=await mf.dispatchFetch('https://api.test'+videoUrl,{headers:{Authorization:'Bearer editor-token',Range:'bytes=1-3,5-7'}});assert.equal(response.status,416);pass('multi-range requests are rejected');
  bucketLimit=8*1024*1024;response=await rawUpload({size:9*1024*1024,body:new Uint8Array(9*1024*1024)});assert.equal(response.status,413);assert.match((await response.json()).error,/still limited to 8 MB/);bucketLimit=50*1024*1024;pass('outdated bucket limits explain exactly what to fix');
  uploadFailure=true;uploadStatus=413;response=await rawUpload();assert.equal(response.status,413);assert.match((await response.json()).error,/50 MB/);
  uploadStatus=403;response=await rawUpload();assert.equal(response.status,503);assert.match((await response.json()).error,/storage key/);
  uploadFailure=false;uploadStatus=503;pass('provider size and authorization failures return actionable errors');
  const savedCount=stored.size;
  response=await request('/api/admin',{action:'check-storage'});assert.equal(response.status,200);assert.match((await response.json()).message,/uploaded, read back, and removed/);assert.equal(stored.size,savedCount);assert.equal([...stored.keys()].some(key=>key.startsWith('checks/')),false);pass('admin storage check writes, verifies and removes a real provider object');
  readFailure=true;response=await request('/api/admin',{action:'check-storage'});assert.notEqual(response.status,200);assert.equal(stored.size,savedCount);readFailure=false;pass('failed connection checks also remove their temporary image');
  const writesBeforeCheck=storageWrites;assert.equal((await request('/api/admin',{action:'check-storage'},'editor-token')).status,403);assert.equal(storageWrites,writesBeforeCheck);pass('customers cannot trigger platform storage checks');
  const draft = await (await request('/api/site?id=' + siteId)).json(); draft.site.pages[0].blocks[0].image = imageUrl; draft.site.pages[0].blocks[0].videoUrl=videoUrl;draft.site.pages[0].blocks[0].link=pdfUrl;
  assert.equal((await request('/api/site', {id: siteId, site: draft.site, revision: draft.revision, publish: true}, 'admin-token', 'PUT')).status, 200);
  assert.equal((await request('/api/domains', {action: 'publication', siteId, enabled: true})).status, 200);
  response = await mf.dispatchFetch('https://api.test/sites/' + siteId + imageUrl); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes); pass('published image is streamed publicly through the publication gate');
  assert.equal((await mf.dispatchFetch('https://api.test/sites/' + siteId + privateUrl)).status, 404); pass('unreferenced uploads stay private on a public site');
  response=await mf.dispatchFetch('https://api.test/sites/'+siteId+videoUrl,{headers:{Range:'bytes=-4'}});assert.equal(response.status,206);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),large.slice(-4));pass('published videos support anonymous suffix-range requests');
  response=await mf.dispatchFetch('https://api.test/sites/'+siteId+videoUrl,{headers:{Range:'bytes=999999999-'}});assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),`bytes */${large.length}`);await response.arrayBuffer();pass('unsatisfiable ranges preserve provider response');
  response=await mf.dispatchFetch('https://api.test/sites/'+siteId+pdfUrl);assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/attachment/);await response.arrayBuffer();pass('published PDFs download without signing in');
  bucketPublic = true; const writesBefore = storageWrites;
  assert.equal((await upload()).status, 503); assert.equal(storageWrites, writesBefore); pass('uploads fail closed if bucket is made public'); bucketPublic = false;
  uploadFailure = true; const countBefore = (await db.prepare('SELECT count(*) n FROM media').first()).n;
  assert.equal((await upload()).status, 503); assert.equal((await db.prepare('SELECT count(*) n FROM media').first()).n, countBefore); pass('provider upload failure creates no broken media record'); uploadFailure = false;
  readFailure = true; assert.equal((await request(imageUrl)).status, 503); pass('provider read errors are handled without exposing credentials'); readFailure = false;
  await request('/api/domains', {action: 'publication', siteId, enabled: false}); assert.equal((await mf.dispatchFetch('https://api.test/sites/' + siteId + imageUrl)).status, 404); assert.equal((await mf.dispatchFetch('https://api.test/sites/'+siteId+videoUrl,{headers:{Range:'bytes=0-3'}})).status,404);assert.equal((await mf.dispatchFetch('https://api.test/sites/'+siteId+pdfUrl)).status,404);pass('unpublishing blocks images, videos, PDFs and range requests');
  stored.clear(); assert.equal((await request(imageUrl)).status, 404); pass('missing provider objects return not found');
  const secretFree = new Miniflare({modules: true, scriptPath: 'backend/backend-dist/worker.js', compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], fetchMock: mock, bindings: {...bindings, SUPABASE_STORAGE_SECRET_KEY: ''}});
  try {
    const emptyDb = await secretFree.getD1Database('DB');
    for (const file of (await readdir('drizzle')).filter(f => f.endsWith('.sql')).sort()) {
      for (const sql of (await readFile('drizzle/' + file, 'utf8')).replaceAll(/-->[^\n]*/g, '').split(';').filter(x => x.trim())) await emptyDb.prepare(sql).run();
    }
    assert.equal((await secretFree.dispatchFetch('https://api.test/health')).status, 200); pass('core API can launch before the storage secret is configured');
    const headers = {Authorization: 'Bearer admin-token', Origin: 'https://front.test', 'Content-Type': 'application/json'};
    assert.equal((await secretFree.dispatchFetch('https://api.test/api/admin', {method: 'POST', headers, body: JSON.stringify({action: 'initialize'})})).status, 200);
    const readySite = await (await secretFree.dispatchFetch('https://api.test/api/admin', {method: 'POST', headers, body: JSON.stringify({action: 'site', assignTo: 'self', title: 'Credential test site', templateId: 'sau70'})})).json();
    const form = new FormData(); form.set('siteId', readySite.id); form.set('file', new File([bytes], 'photo.png', {type: 'image/png'}));
    const incoming = new Request('https://api.test/api/upload', {method: 'POST', headers: {Authorization: 'Bearer admin-token', Origin: 'https://front.test'}, body: form});
    assert.equal((await secretFree.dispatchFetch(incoming.url, {method: 'POST', headers: incoming.headers, body: await incoming.arrayBuffer()})).status, 503);
    const missing=await secretFree.dispatchFetch('https://api.test/api/admin',{method:'POST',headers,body:JSON.stringify({action:'check-storage'})});assert.equal(missing.status,503);assert.match((await missing.json()).error,/has no backend key/);pass('missing key diagnostic names the exact backend setting');
    assert.equal((await emptyDb.prepare('SELECT count(*) n FROM media').first()).n, 0); pass('missing storage credentials block uploads without blocking admin setup');
  } finally { await secretFree.dispose(); }
  const publicKeyOnly=new Miniflare({modules:true,scriptPath:'backend/backend-dist/worker.js',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],fetchMock:mock,bindings:{...bindings,SUPABASE_STORAGE_SECRET_KEY:'sb_publishable_example'}});
  try { const testDb=await publicKeyOnly.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){for(const sql of (await readFile('drizzle/'+file,'utf8')).replaceAll(/-->[^\n]*/g,'').split(';').filter(x=>x.trim()))await testDb.prepare(sql).run();}const bad=await publicKeyOnly.dispatchFetch('https://api.test/api/admin',{method:'POST',headers:{Authorization:'Bearer admin-token',Origin:'https://front.test','Content-Type':'application/json'},body:JSON.stringify({action:'check-storage'})});assert.equal(bad.status,503);const error=(await bad.json()).error;assert.match(error,/public publishable key/);assert.ok(!error.includes('example'));pass('public keys are identified without exposing their values'); } finally { await publicKeyOnly.dispose(); }
  console.log(`Passed ${checks} Supabase Storage checks.`);
} finally { await mf.dispose(); }
