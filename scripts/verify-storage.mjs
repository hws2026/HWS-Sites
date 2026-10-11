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
let bucketPublic = false, uploadFailure = false, readFailure = false, storageReads = 0, storageWrites = 0;
const providerHeaders = {apikey: 'sb_secret_mock_only'};
mock.get('https://auth.test').intercept({path: '/storage/v1/bucket/hws-suite-media', headers: providerHeaders})
  .reply(options => {
    assert.equal(new Headers(options.headers).has('authorization'), false, 'opaque secret stays in apikey header');
    return {statusCode: 200, data: JSON.stringify({id: 'hws-suite-media', public: bucketPublic})};
  }).persist();
mock.get('https://auth.test').intercept({path: /^\/storage\/v1\/object\/hws-suite-media\//, method: 'POST', headers: providerHeaders})
  .reply(options => {
    storageWrites++;
    assert.equal(new Headers(options.headers).get('x-upsert'), 'false');
    if (uploadFailure) return {statusCode: 503, data: '{}'};
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
    return {statusCode: data ? 200 : 404, data: data ?? '{}'};
  }).persist();

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
  const draft = await (await request('/api/site?id=' + siteId)).json(); draft.site.pages[0].blocks[0].image = imageUrl;
  assert.equal((await request('/api/site', {id: siteId, site: draft.site, revision: draft.revision, publish: true}, 'admin-token', 'PUT')).status, 200);
  assert.equal((await request('/api/domains', {action: 'publication', siteId, enabled: true})).status, 200);
  response = await mf.dispatchFetch('https://api.test/sites/' + siteId + imageUrl); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes); pass('published image is streamed publicly through the publication gate');
  assert.equal((await mf.dispatchFetch('https://api.test/sites/' + siteId + privateUrl)).status, 404); pass('unreferenced uploads stay private on a public site');
  bucketPublic = true; const writesBefore = storageWrites;
  assert.equal((await upload()).status, 503); assert.equal(storageWrites, writesBefore); pass('uploads fail closed if bucket is made public'); bucketPublic = false;
  uploadFailure = true; const countBefore = (await db.prepare('SELECT count(*) n FROM media').first()).n;
  assert.equal((await upload()).status, 503); assert.equal((await db.prepare('SELECT count(*) n FROM media').first()).n, countBefore); pass('provider upload failure creates no broken media record'); uploadFailure = false;
  readFailure = true; assert.equal((await request(imageUrl)).status, 503); pass('provider read errors are handled without exposing credentials'); readFailure = false;
  await request('/api/domains', {action: 'publication', siteId, enabled: false}); assert.equal((await mf.dispatchFetch('https://api.test/sites/' + siteId + imageUrl)).status, 404); pass('disabling public access also blocks Supabase images');
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
    assert.equal((await emptyDb.prepare('SELECT count(*) n FROM media').first()).n, 0); pass('missing storage credentials block uploads without blocking admin setup');
  } finally { await secretFree.dispose(); }
  console.log(`Passed ${checks} Supabase Storage checks.`);
} finally { await mf.dispose(); }
