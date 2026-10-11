import type {BackendEnv} from './server-context';

export type MediaStorageEnv = {
  MEDIA_STORAGE?: 'supabase' | 'r2';
  SUPABASE_URL?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  SUPABASE_STORAGE_SECRET_KEY?: string;
};

function storageConfig(env: BackendEnv) {
  const key = env.SUPABASE_STORAGE_SECRET_KEY;
  if (!key || key.startsWith('sb_publishable_')) throw new Error('Private image storage is not configured.');
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

export async function putMediaObject(env: BackendEnv, key: string, body: ArrayBuffer, contentType: string) {
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
  if (!bucket.ok) throw new Error('Private storage bucket is unavailable.');
  const metadata = await bucket.json() as {id?: string; public?: boolean};
  if (metadata.id !== config.bucket || metadata.public !== false) throw new Error('Image storage must use a private bucket.');
  const response = await fetch(config.url + '/object/' + config.bucket + '/' + path, {
    method: 'POST', headers: {...config.headers, 'Content-Type': contentType, 'x-upsert': 'false'},
    body, redirect: 'manual', signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Image storage rejected the upload.');
  await response.body?.cancel();
}

export async function getMediaObject(env: BackendEnv, key: string): Promise<{body: ReadableStream<Uint8Array> | null} | null> {
  if (env.MEDIA_STORAGE !== 'supabase') return env.BUCKET?.get(key) ?? null;
  const config = storageConfig(env);
  const response = await fetch(config.url + '/object/authenticated/' + config.bucket + '/' + objectPath(key), {
    headers: config.headers, redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) { await response.body?.cancel(); return null; }
  if (!response.ok) throw new Error('Image storage is unavailable.');
  return {body: response.body};
}
