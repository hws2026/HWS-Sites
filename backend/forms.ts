import {database,sitePermission} from '../lib/suite-store';
import {publishedForm,MAX_FORM_FILES,MAX_FORM_FILE_BYTES,type FormAnswer,type FormSubmission,submissionsCsv} from '../lib/form-model';
import type {Website} from '../lib/editor-model';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class FormError extends Error{constructor(message:string,public status=400){super(message);}}
const digest=async(value:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),b=>b.toString(16).padStart(2,'0')).join('');
const hash=(value:string)=>digest(new TextEncoder().encode(value));
async function boundedBody(request:Request){
 if(Number(request.headers.get('content-length')??0)>1024*1024)throw new FormError('This form is too large. Use up to three attachments of 256 KB each.',413);
 const reader=request.body?.getReader();if(!reader)throw new FormError('The form was empty.');const parts:Uint8Array[]=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>1024*1024){await reader.cancel();throw new FormError('This form is too large. Use up to three attachments of 256 KB each.',413);}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
function one(data:FormData,name:string):FormDataEntryValue|undefined{const values=data.getAll(name);if(values.length>1)throw new FormError('A field was submitted more than once. Reload the form and try again.');return values[0];}
function fieldError(label:string,reason:string):never{throw new FormError(`${label}: ${reason}`);}
function fileType(bytes:Uint8Array,name:string){
 if(/\.pdf$/i.test(name)&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')return 'application/pdf';
 if(/\.png$/i.test(name)&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(/\.jpe?g$/i.test(name)&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(/\.txt$/i.test(name)){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!bytes.includes(0))return 'text/plain';}catch{}}
 throw new FormError('Attachments must be valid PDF, PNG, JPEG, or UTF-8 text files.');
}
export async function submitPublicForm(request:Request,siteId:string,site:Website){
 try{
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(origin!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new FormError('Submit the form from this website.',403);
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))throw new FormError('Use the website form to submit a response.',415);
  const body=await boundedBody(request);const data=await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
  const pageId=one(data,'pageId'),formId=one(data,'formId'),requestId=one(data,'requestId');
  if(typeof pageId!=='string'||typeof formId!=='string'||typeof requestId!=='string'||!/^[-a-zA-Z0-9]{10,100}$/.test(requestId))throw new FormError('Reload the form and try again.');
  if(one(data,'website'))throw new FormError('This response could not be accepted.');
  const form=publishedForm(site,pageId,formId);if(!form)throw new FormError('This form is no longer accepting responses.',404);
  const fields=form.block.fields??[];if(!fields.length)throw new FormError('This form has no fields. Contact the website administrator.');
  const keys=new Set(['pageId','formId','requestId','website',...fields.map(f=>'field:'+f.id)]);
  for(const key of data.keys())if(!keys.has(key))throw new FormError('The form changed. Reload the page before submitting again.');
  const answers:FormAnswer[]=[],files:{id:string;filename:string;type:string;bytes:Uint8Array}[]=[],fingerprint:unknown[]=[];
  for(const field of fields){
   let value=one(data,'field:'+field.id);const answer:FormAnswer={fieldId:field.id,label:field.label,type:field.type,value:''};
   if(field.type==='file'){
    if(value==='')value=undefined;
    if(typeof value==='string')fieldError(field.label,'choose a file.');
    if(!value||!value.size){if(field.required)fieldError(field.label,'this attachment is required.');}
    else{
     if(value.size>MAX_FORM_FILE_BYTES)fieldError(field.label,'the attachment exceeds 256 KB.');
     if(files.length>=MAX_FORM_FILES)throw new FormError('Use at most three attachments.');
     const bytes=new Uint8Array(await value.arrayBuffer()),filename=value.name.replace(/[\\/\r\n\x00-\x1f]/g,'_').slice(0,150)||'attachment';
     const type=fileType(bytes,filename),id=crypto.randomUUID();files.push({id,filename,type,bytes});answer.attachmentId=id;answer.filename=filename;
     fingerprint.push([field.id,filename,await digest(bytes)]);
    }
   }else{
    if(value!==undefined&&typeof value!=='string')fieldError(field.label,'enter a text value.');
    const text=(value as string|undefined)?.trim()??'';
    if(field.type==='checkbox'){
     if(text&&!['on','true'].includes(text))fieldError(field.label,'choose the checkbox option.');answer.value=Boolean(text);if(field.required&&!answer.value)fieldError(field.label,'this checkbox is required.');
    }else{
     if(field.required&&!text)fieldError(field.label,'this field is required.');
     if(text.length>(field.type==='textarea'?10000:2000))fieldError(field.label,'the response is too long.');
     if(text&&field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))fieldError(field.label,'enter a valid email address.');
     if(text&&field.type==='number'&&!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text))fieldError(field.label,'enter a valid number.');
     if(text&&field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text).toISOString().slice(0,10)!==text))fieldError(field.label,'enter a valid date.');
     if(text&&['select','radio'].includes(field.type)&&!field.options?.includes(text))fieldError(field.label,'choose one of the listed options.');
     answer.value=text;
    }
    fingerprint.push([field.id,answer.value]);
   }
   answers.push(answer);
  }
  const content=JSON.stringify(answers);if(new TextEncoder().encode(content).length>100000)throw new FormError('The combined response is too long.',413);
  const payloadHash=await hash(JSON.stringify([pageId,formId,fingerprint])),db=database();
  const previous=await db.prepare('SELECT payload_hash FROM form_submissions WHERE site_id=? AND request_id=?').bind(siteId,requestId).first<{payload_hash:string}>();
  if(previous){if(previous.payload_hash!==payloadHash)throw new FormError('This submission was already received with different answers. Reload to send a new response.',409);return json({ok:true});}
  const now=Date.now(),hour=Math.floor(now/3600000),day=Math.floor(now/86400000),ip=await hash(siteId+':'+day+':'+(request.headers.get('CF-Connecting-IP')??'local'));
  const limits=await db.batch<{count:number;max_count:number}>([{key:siteId+':ip:'+ip+':'+hour,limit:20},{key:siteId+':day:'+day,limit:500}].map(({key,limit})=>db.prepare('INSERT INTO form_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count,? AS max_count').bind(key,now+86400000,limit)));
  if(limits.some(r=>r.results.some(row=>Number(row.count)>Number(row.max_count))))throw new FormError('Too many form responses have been sent. Please try again later.',429);
  const id=crypto.randomUUID();
  const insert=db.prepare('INSERT INTO form_submissions (id,site_id,page_id,page_name,form_id,form_name,request_id,payload_hash,answers,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,siteId,pageId,form.page.name,formId,form.block.title||'Website form',requestId,payloadHash,content,'new',new Date().toISOString());
  try{await db.batch([insert,...files.map(file=>db.prepare('INSERT INTO form_attachments (id,submission_id,site_id,filename,content_type,size,content) VALUES (?,?,?,?,?,?,?)').bind(file.id,id,siteId,file.filename,file.type,file.bytes.length,file.bytes))]);}
  catch(error){const duplicate=await db.prepare('SELECT payload_hash FROM form_submissions WHERE site_id=? AND request_id=?').bind(siteId,requestId).first<{payload_hash:string}>();if(duplicate?.payload_hash===payloadHash)return json({ok:true});throw error;}
  return json({ok:true},201);
 }catch(error){if(error instanceof FormError)return json({error:error.message},error.status);console.error('Form submission unavailable',error instanceof Error?error.message:'Unknown failure');return json({error:'Your response could not be stored because the form service is unavailable. Please try again later; your answers are still on this page.'},503);}
}
export async function formsInbox(request:Request,userId:string){
 try{
  const url=new URL(request.url),siteId=url.searchParams.get('siteId')??'',access=await sitePermission(siteId,userId);
  if(!access||access.role==='viewer'||access.row.archived)return json({error:'You need editor or administrator access to this website’s form inbox.'},403);
  const db=database();
  if(request.method==='PUT'){
   const body=await request.json() as {id:string;status:string};if(typeof body.id!=='string'||!body.id||!['new','read','archived'].includes(body.status))return json({error:'Choose New, Read, or Archived.'},400);
   const changed=await db.prepare('UPDATE form_submissions SET status=? WHERE id=? AND site_id=?').bind(body.status,body.id,siteId).run();return changed.meta.changes?json({ok:true}):json({error:'Response not found.'},404);
  }
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  const attachmentId=url.searchParams.get('attachment');
  if(attachmentId){
   const file=await db.prepare('SELECT filename,content_type,content FROM form_attachments WHERE id=? AND site_id=?').bind(attachmentId,siteId).first<{filename:string;content_type:string;content:ArrayBuffer|number[]}>();if(!file)return json({error:'Attachment not found.'},404);
   return new Response(new Uint8Array(file.content),{headers:{'Content-Type':file.content_type,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.filename),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"}});
  }
  const submissionId=url.searchParams.get('id');
  if(submissionId){const row=await db.prepare('SELECT id,site_id,page_name,form_name,status,created_at,answers FROM form_submissions WHERE id=? AND site_id=?').bind(submissionId,siteId).first<Omit<FormSubmission,'answers'>&{answers:string}>();return row?json({...row,answers:JSON.parse(row.answers)}):json({error:'Response not found.'},404);}
  const status=url.searchParams.get('status')??'new';if(!['new','read','archived','all'].includes(status))return json({error:'Invalid inbox filter.'},400);
  const offset=Math.max(0,Math.min(100000,Math.floor(Number(url.searchParams.get('offset'))||0))),clause=status==='all'?'site_id=?':'site_id=? AND status=?',args=status==='all'?[siteId]:[siteId,status];
  if(url.searchParams.get('export')==='csv'){
   const rows=await db.prepare(`SELECT id,site_id,page_name,form_name,status,created_at,answers FROM form_submissions WHERE ${clause} ORDER BY created_at DESC,id DESC LIMIT 100 OFFSET ?`).bind(...args,offset).all<Omit<FormSubmission,'answers'>&{answers:string}>();
   return new Response(submissionsCsv(rows.results.map(r=>({...r,answers:JSON.parse(r.answers)}))),{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="form-responses.csv"','Cache-Control':'no-store'}});
  }
  const rows=await db.prepare(`SELECT id,site_id,page_name,form_name,status,created_at FROM form_submissions WHERE ${clause} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?`).bind(...args,offset).all();
  const total=await db.prepare(`SELECT count(*) total FROM form_submissions WHERE ${clause}`).bind(...args).first<{total:number}>();
  return json({responses:rows.results,total:total?.total??0,offset});
 }catch(error){console.error('Form inbox unavailable',error instanceof Error?error.message:'Unknown failure');return json({error:'The form inbox could not be loaded. Deploy the current backend and apply database migration 0004, then retry.'},503);}
}
