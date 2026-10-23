import {rejectForeignOrigin} from '@/lib/request-guard';
import {backendEnv} from '@/lib/server-context';
import {putMediaObject, deleteMediaObjects, MediaStorageError} from '@/lib/media-storage';
import {validateMedia,mediaSignatureMatches} from '@/lib/media-policy';
import {NextRequest, NextResponse} from 'next/server';
import {identity, sitePermission, database} from '@/lib/suite-store';

async function store(req: NextRequest, siteId: string, filename: string, size: number, type: string, body: ReadableStream<Uint8Array> | null) {
  const user = identity(req);
  if (!user) return NextResponse.json({error: 'Sign in to upload media.'}, {status: 401});
  const access = await sitePermission(siteId, user.id);
  if (!access || access.role === 'viewer' || access.row.archived) return NextResponse.json({error: 'You do not have permission to upload media to this website.'}, {status: 403});
  const error = validateMedia(size, type);
  if (error || !body) return NextResponse.json({error: error || 'The upload contained no file.'}, {status: 400});
  const id = crypto.randomUUID(), key = `media/${access.row.owner}/${siteId}/${id}`, env = backendEnv();
  const abort = new AbortController();
  // Enforce the actual byte count while streaming a known-length body to storage.
  const stream = new FixedLengthStream(size);
  let incomplete = false, received = 0;
  let signatureChecked=false,validationError:MediaStorageError|undefined;
  const prefix=new Uint8Array(12),pending:Uint8Array[]=[];let prefixSize=0;
  const verify=()=>{if(!mediaSignatureMatches(prefix.slice(0,prefixSize),type)){validationError=new MediaStorageError('The file contents do not match its type. Choose a valid image, video, or PDF.',415);throw validationError;}signatureChecked=true;};
  const counted = body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) { received += chunk.byteLength; if (received > size) { incomplete = true; throw new Error('Upload size mismatch'); } if(signatureChecked){controller.enqueue(chunk);return;}const take=Math.min(12-prefixSize,chunk.length);prefix.set(chunk.slice(0,take),prefixSize);prefixSize+=take;pending.push(chunk);if(prefixSize===12){verify();pending.forEach(part=>controller.enqueue(part));pending.length=0;} },
    flush(controller) { if (received !== size) { incomplete = true; throw new Error('Upload size mismatch'); }if(!signatureChecked){verify();pending.forEach(part=>controller.enqueue(part));} },
  }),{preventCancel:true});
  const pipe = counted.pipeTo(stream.writable, {signal: abort.signal}).catch(error => { incomplete = !abort.signal.aborted; throw error; });
  try {
    await Promise.all([pipe, putMediaObject(env, key, stream.readable, type, size, abort.signal)]);
    try {
      await database().prepare('INSERT INTO media (id,owner,site_id,filename,key,content_type) VALUES (?,?,?,?,?,?)')
        .bind(id, access.row.owner, siteId, filename.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'upload', key, type).run();
    } catch {
      await deleteMediaObjects(env, [key]).catch(() => {});
      throw new MediaStorageError('The file arrived, but its record could not be saved. Please retry.');
    }
    return NextResponse.json({url: `/media/${id}`});
  } catch (error) {
    if(validationError)throw validationError;
    if (incomplete) throw new MediaStorageError('The upload was interrupted or its size did not match. Select the file again and retry.', 400);
    throw error;
  } finally {
    abort.abort();await stream.readable.cancel().catch(()=>{});await pipe.catch(()=>{});
    // Complete a bounded incoming request after early provider rejection so the
    // browser receives the useful JSON error instead of a reset upload socket.
    if(received<size&&!body.locked){const reader=body.getReader();const timer=setTimeout(()=>void reader.cancel().catch(()=>{}),5000);try{for(;;){const {done,value}=await reader.read();if(done)break;received+=value.length;if(received>size){await reader.cancel();break;}}}catch{}finally{clearTimeout(timer);reader.releaseLock();}}
  }
}

function failure(error: unknown) {
  return NextResponse.json({error: error instanceof MediaStorageError ? error.message : 'The upload could not reach storage. Check your connection and retry.'}, {status: error instanceof MediaStorageError ? error.status : 503});
}
export async function PUT(req: NextRequest) {
  try {
    rejectForeignOrigin(req);
    const url = new URL(req.url);
    return await store(req, url.searchParams.get('siteId') ?? '', url.searchParams.get('filename') ?? '', Number(url.searchParams.get('size')), req.headers.get('Content-Type')?.split(';')[0].toLowerCase() ?? '', req.body);
  } catch (error) { return failure(error); }
}
// Older tabs use multipart images. Bound parsing; the new editor streams up to 50 MB with PUT.
export async function POST(req: NextRequest) {
  if (!identity(req)) return NextResponse.json({error: 'Sign in to upload media.'}, {status: 401});
  try {
    rejectForeignOrigin(req);
    let received = 0;
    const limited = req.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > 8 * 1024 * 1024 + 65536) throw new MediaStorageError('Reload the editor to upload files up to 50 MB.', 413);
      controller.enqueue(chunk);
    }}));
    const form = await new Response(limited, {headers: {'Content-Type': req.headers.get('Content-Type') ?? ''}}).formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({error: 'Choose a file to upload.'}, {status: 400});
    return await store(req, String(form.get('siteId') ?? ''), file.name, file.size, file.type, file.stream());
  } catch (error) { return failure(error); }
}
