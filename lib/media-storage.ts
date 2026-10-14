import type {BackendEnv} from './server-context';

export class MediaStorageError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
async function uploadRejection(response: Response): Promise<never> {
  const detail = await response.json().catch(() => ({})) as {code?:string;error?:string;message?:string;statusCode?:string};
  const code = [detail.code, detail.error, detail.message].join(' ');
  if (response.status === 413 || /EntityTooLarge|maximum allowed size|exceeded.*size/i.test(code)) throw new MediaStorageError('Storage rejected the file size. The administrator must set both the Supabase project and hws-suite-media bucket limits to 50 MB.', 413);
  if (/mime|InvalidMimeType/i.test(code)) throw new MediaStorageError('This file type is blocked by the storage bucket. Ask the administrator to enable images, MP4, WebM, and PDF uploads.', 415);
  if (response.status === 429) throw new MediaStorageError('Storage is busy or its request limit was reached. Wait a minute and retry.', 429);
  if (response.status === 402 || /quota|storage.*limit/i.test(code)) throw new MediaStorageError('Your storage allowance is full. Remove unused files in Supabase Storage before retrying.');
  if (response.status === 401 || response.status === 403) throw new MediaStorageError('Storage could not authorize the upload. The administrator must check the backend storage key and bucket configuration.');
  throw new MediaStorageError('Storage is temporarily unavailable (HTTP ' + response.status + '). Please retry.');
}

export type MediaStorageEnv = {
  MEDIA_STORAGE?: 'supabase' | 'r2';
  SUPABASE_URL?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  SUPABASE_STORAGE_SECRET_KEY?: string;
};

function storageConfig(env: BackendEnv) {
  const key = env.SUPABASE_STORAGE_SECRET_KEY?.trim();
  if (!key) throw new MediaStorageError('Media storage has no backend key. Set SUPABASE_STORAGE_SECRET_KEY in the Cloudflare Worker to the Supabase server secret key beginning sb_secret_.');
  if (key.startsWith('sb_publishable_')) throw new MediaStorageError('The backend storage key is a public publishable key. Replace SUPABASE_STORAGE_SECRET_KEY in Cloudflare with the Supabase server secret key beginning sb_secret_.');
  const url = new URL(env.SUPABASE_URL ?? '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Invalid storage service URL.');
  }
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  if (!bucket || !/^[a-zA-Z0-9_-]+$/.test(bucket)) throw new Error('Invalid storage bucket.');
  // These credentials are used only by the server after D1 authorization.
  const headers: Record<string, string> = {apikey: key};
  if (!key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + key;
  return {url: url.origin + '/storage/v1', bucket, headers};
}

function objectPath(key: string) {
  const parts = key.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || !/^[a-zA-Z0-9_.-]+$/.test(part))) {
    throw new Error('Invalid image object key.');
  }
  return parts.map(encodeURIComponent).join('/');
}

export async function putMediaObject(env: BackendEnv, key: string, body: ArrayBuffer | ReadableStream<Uint8Array>, contentType: string, size?: number, signal?: AbortSignal) {
  if (env.MEDIA_STORAGE !== 'supabase') {
    if (!env.BUCKET) throw new Error('Image storage is unavailable.');
    await env.BUCKET.put(key, body, {httpMetadata: {contentType}});
    return;
  }
  const config = storageConfig(env);
  const path = objectPath(key);
  const bucket = await fetch(config.url + '/bucket/' + config.bucket, {
    headers: config.headers, redirect: 'manual', signal: AbortSignal.timeout(10000),
  });
  if (!bucket.ok) await uploadRejection(bucket);
  const metadata = await bucket.json() as {id?: string; public?: boolean; file_size_limit?: number; allowed_mime_types?: string[]};
  if (metadata.id !== config.bucket || metadata.public !== false) throw new MediaStorageError('Media storage must use a private bucket. Ask the administrator to correct its privacy setting.');
  if (size && metadata.file_size_limit && size > metadata.file_size_limit) throw new MediaStorageError('The storage bucket is still limited to ' + Math.floor(metadata.file_size_limit / 1024 / 1024) + ' MB. The administrator must raise it to 50 MB.', 413);
  const response = await fetch(config.url + '/object/' + config.bucket + '/' + path, {
    method: 'POST', headers: {...config.headers, 'Content-Type': contentType, 'x-upsert': 'false'},
    body, redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(600000)]) : AbortSignal.timeout(600000),
  });
  if (!response.ok) await uploadRejection(response);
  await response.body?.cancel();
}

export type StoredMedia = {body: ReadableStream<Uint8Array> | null; status?: number; headers?: Headers};
export async function getMediaObject(env: BackendEnv, key: string, range: string | null = null): Promise<StoredMedia | null> {
  if (range && (!/^bytes=(\d+-\d*|-\d+)$/.test(range) || range.length > 80)) return {body: null, status: 416};
  if (env.MEDIA_STORAGE !== 'supabase') {
    const object = await env.BUCKET?.get(key, range ? {range: new Headers({Range: range})} : undefined);
    if (!object) return null;
    const headers = new Headers({'Accept-Ranges': 'bytes'});
    if (range && object.range && 'offset' in object.range && object.range.offset !== undefined && object.range.length !== undefined) {
      headers.set('Content-Range', `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
      headers.set('Content-Length', String(object.range.length));
      return {body: object.body, status: 206, headers};
    }
    headers.set('Content-Length', String(object.size));
    return {body: object.body, headers};
  }
  const config = storageConfig(env);
  const response = await fetch(config.url + '/object/authenticated/' + config.bucket + '/' + objectPath(key), {
    headers: {...config.headers, ...(range ? {Range: range} : {})}, redirect: 'manual', signal: AbortSignal.timeout(600000),
  });
  if (response.status === 404) { await response.body?.cancel(); return null; }
  if (!response.ok && response.status !== 416) throw new Error('Media storage is unavailable.');
  const headers = new Headers();
  for (const name of ['Content-Range', 'Accept-Ranges', 'Content-Length']) { const value = response.headers.get(name); if (value) headers.set(name, value); }
  return {body: response.body, status: response.status, headers};
}
export function mediaResponse(file: StoredMedia, type: string, filename: string, cache: string, head = false) {
  const headers = new Headers(file.headers);
  headers.set('Content-Type', type);
  headers.set('Cache-Control', cache);
  headers.set('X-Content-Type-Options', 'nosniff');
  if (type === 'application/pdf') headers.set('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16)));
  return new Response(head ? null : file.body, {status: file.status ?? 200, headers});
}

export async function deleteMediaObjects(env: BackendEnv, keys: string[]) {
  if (!keys.length) return;
  keys.forEach(objectPath);
  if (env.MEDIA_STORAGE !== 'supabase') {
    if (!env.BUCKET) throw new Error('Image storage is unavailable. Retry deletion once storage is connected.');
    await env.BUCKET.delete(keys);
    return;
  }
  const config = storageConfig(env);
  const response = await fetch(config.url + '/object/' + config.bucket, {
    method: 'DELETE', headers: {...config.headers, 'Content-Type': 'application/json'},
    body: JSON.stringify({prefixes: keys}), redirect: 'manual', signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Uploaded images could not be removed. The customer remains suspended; retry deletion.');
  await response.body?.cancel();
}

/** Verify the real provider without modifying a website or retaining test media. */
export async function testMediaStorage(env: BackendEnv) {
  const key = 'checks/' + crypto.randomUUID() + '.png';
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII='), c => c.charCodeAt(0));
  await putMediaObject(env, key, bytes.buffer, 'image/png', bytes.length);
  try {
    const result = await getMediaObject(env, key);
    if (!result?.body) throw new MediaStorageError('Storage accepted the test image but could not read it back. Check the storage service and retry.');
    const actual = new Uint8Array(await new Response(result.body).arrayBuffer());
    if (actual.length !== bytes.length || actual.some((value, index) => value !== bytes[index])) throw new MediaStorageError('Storage returned unexpected image data. Retry the connection test.');
  } finally {
    try { await deleteMediaObjects(env, [key]); }
    catch { throw new MediaStorageError('Storage could not remove its temporary test image. Check the backend key has storage delete access.'); }
  }
}
