import {database,sitePermission} from '../lib/suite-store';
import {seal,unseal,audit,type Principal} from './security';
import {CommerceError,failure,json,body,field} from './commerce-utils';
import type {Env} from './worker';
import type {FormAnswer} from '../lib/form-model';
type Connection={site_id:string;revision:number;endpoint:string;enabled:number;tested_at:string|null};
function webhook(value:unknown){
 if(typeof value!=='string'||value.length>500)throw new CommerceError('Paste the Zapier Catch Hook URL from your HoneyBook automation.');
 let u:URL;try{u=new URL(value.trim());}catch{throw new CommerceError('Enter a valid Zapier Catch Hook URL.');}
 if(u.protocol!=='https:'||u.hostname!=='hooks.zapier.com'||u.port||u.username||u.password||u.search||u.hash||!/^\/hooks\/catch\/\d+\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname))throw new CommerceError('Use an HTTPS hooks.zapier.com/hooks/catch/… URL from your own automation.');
 return u.href;
}
function payload(id:string,siteId:string,formName:string,pageName:string,createdAt:string,answers:FormAnswer[],test=false){
 const value=(kind:string)=>String(answers.find(a=>a.type===kind)?.value??'');
 return {event:test?'form.test':'form.submitted',test,submissionId:id,siteId,formName,pageName,submittedAt:createdAt,name:String(answers.find(a=>a.fieldId==='name'||/^(your |full |contact )?name$/i.test(a.label))?.value??''),email:value('email'),phone:value('tel'),eventDate:value('date'),answers:answers.map(a=>({fieldId:a.fieldId,label:a.label,type:a.type,value:a.value,...(a.filename?{filename:a.filename}:{})})),summary:answers.map(a=>a.label+': '+(a.filename??String(a.value))).join('\n')};
}
export function formDeliveryStatement(siteId:string,id:string){return database().prepare("INSERT OR IGNORE INTO form_deliveries (submission_id,site_id,connection_revision,status,attempts,next_at,lease_until,created_at) SELECT ?,site_id,revision,'pending',0,?,0,? FROM form_connections WHERE site_id=? AND enabled=1 AND tested_at IS NOT NULL").bind(id,Date.now(),Date.now(),siteId);}
export async function formConnections(request:Request,env:Env,p:Principal){try{
 const siteId=new URL(request.url).searchParams.get('siteId')??'',access=await sitePermission(siteId,p.id);if(!access||access.role!=='admin'||access.row.archived)throw new CommerceError('Only this website’s owner can configure form connections.',403);
 const db=database(),connection=await db.prepare('SELECT * FROM form_connections WHERE site_id=?').bind(siteId).first<Connection>();
 if(request.method==='GET')return json({configured:!!connection,enabled:!!connection?.enabled,testedAt:connection?.tested_at??null,canConnect:!!env.HWS_DATA_KEY,deliveries:(await db.prepare('SELECT submission_id,status,attempts,last_error,accepted_at FROM form_deliveries WHERE site_id=? ORDER BY created_at DESC LIMIT 20').bind(siteId).all()).results});
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);const b=await body(request);
 if(b.action==='disconnect'){await db.batch([db.prepare('DELETE FROM form_connections WHERE site_id=?').bind(siteId),db.prepare("UPDATE form_deliveries SET status='cancelled',last_error='Connection removed.' WHERE site_id=? AND status='pending'").bind(siteId)]);await audit(request,env,p,'forms.connection.disconnect','success',200,siteId);return json({ok:true,message:'HoneyBook forwarding disconnected. Suite responses remain saved.'});}
 if(!env.HWS_DATA_KEY)throw new CommerceError('Encrypted integration storage must be configured first.',503);
 if(b.action==='save'){
  const endpoint=webhook(b.url),revision=(connection?.revision??0)+1;
  if(b.confirm!==true)throw new CommerceError('Confirm that this is your automation before saving.');
  await db.batch([db.prepare('INSERT INTO form_connections (site_id,revision,endpoint,enabled,tested_at,updated_at) VALUES (?,?,?,0,NULL,?) ON CONFLICT(site_id) DO UPDATE SET revision=excluded.revision,endpoint=excluded.endpoint,enabled=0,tested_at=NULL,updated_at=excluded.updated_at').bind(siteId,revision,await seal(env,{url:endpoint},'form-connection:'+siteId),new Date().toISOString()),db.prepare("UPDATE form_deliveries SET status='cancelled',last_error='Connection replaced.' WHERE site_id=? AND status='pending'").bind(siteId)]);await audit(request,env,p,'forms.connection.configure','success',200,siteId);return json({ok:true,message:'Connection saved with forwarding off. Send a sample to test your automation next.'});
 }
 if(!connection)throw new CommerceError('Save your HoneyBook automation connection first.',409);
 if(b.action==='test'){
  if(b.confirm!==true)throw new CommerceError('Confirm sending a sample to your automation.');
  const hour=Math.floor(Date.now()/3600000),limit=await db.prepare('INSERT INTO form_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind('form-test:'+siteId+':'+hour,(hour+2)*3600000).first<{count:number}>();if((limit?.count??11)>10)throw new CommerceError('Connection test limit reached. Try again in an hour.',429);
  const decoded=await unseal<{url:string}>(env,connection.endpoint,'form-connection:'+siteId),sample=payload('test-'+crypto.randomUUID(),siteId,'Husky Suite setup test','Setup',new Date().toISOString(),[{fieldId:'name',label:'Your name',type:'text',value:'Husky Suite test — not a booking'},{fieldId:'email',label:'Email',type:'email',value:'test@example.invalid'}],true);
  let r:Response;try{r=await fetch(webhook(decoded.url),{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample),signal:AbortSignal.timeout(10000)});}catch{throw new CommerceError('The automation could not be reached. Check your Catch Hook and retry the sample.',502);}if(!r.ok)throw new CommerceError('Your automation rejected the sample (HTTP '+r.status+'). Check the Catch Hook and try again.',502);
  await db.prepare('UPDATE form_connections SET tested_at=? WHERE site_id=? AND revision=?').bind(new Date().toISOString(),siteId,connection.revision).run();await audit(request,env,p,'forms.connection.test','success',200,siteId);return json({ok:true,message:'The automation accepted the sample. Confirm it reached the expected HoneyBook project in your automation history, then enable forwarding.'});
 }
 if(b.action==='toggle'){
  if(typeof b.enabled!=='boolean')throw new CommerceError('Choose whether forwarding is enabled.');if(b.enabled&&(!connection.tested_at||b.confirm!==true))throw new CommerceError('Test the connection and confirm your HoneyBook setup before enabling it.',409);
  await db.batch([db.prepare('UPDATE form_connections SET enabled=?,updated_at=? WHERE site_id=? AND revision=?').bind(b.enabled?1:0,new Date().toISOString(),siteId,connection.revision),...(!b.enabled?[db.prepare("UPDATE form_deliveries SET status='cancelled',last_error='Forwarding disabled.' WHERE site_id=? AND status='pending'").bind(siteId)]:[])]);await audit(request,env,p,'forms.connection.'+(b.enabled?'enable':'disable'),'success',200,siteId);return json({ok:true,message:b.enabled?'Future submissions will save in the suite and queue for your HoneyBook automation.':'Forwarding is off. Forms still save in the suite.'});
 }
 if(b.action==='retry'){
  if(!connection.enabled||!connection.tested_at)throw new CommerceError('Enable your tested connection first.',409);
  const r=await db.prepare("UPDATE form_deliveries SET status='pending',attempts=0,next_at=?,lease_until=0,last_error=NULL,created_at=? WHERE submission_id=? AND site_id=? AND connection_revision=? AND status='failed'").bind(Date.now(),Date.now(),field(b.id),siteId,connection.revision).run();if(!r.meta.changes)throw new CommerceError('Only failed deliveries for this connection can be retried.',409);return json({ok:true,message:'Forwarding queued again. The submission ID stays the same for deduplication.'});
 }
 throw new CommerceError('Unknown form connection action.');
 }catch(e){return failure(e);}}
export async function sendFormDeliveries(env:Env){
 if(!env.HWS_DATA_KEY)return;const db=database(),now=Date.now();
 const rows=await db.prepare("SELECT submission_id,site_id,connection_revision,attempts,created_at FROM form_deliveries WHERE status='pending' AND next_at<=? AND lease_until<? ORDER BY created_at LIMIT 10").bind(now,now).all<{submission_id:string;site_id:string;connection_revision:number;attempts:number;created_at:number}>();
 for(const row of rows.results){const claim=await db.prepare("UPDATE form_deliveries SET lease_until=?,attempts=attempts+1 WHERE submission_id=? AND status='pending' AND lease_until<?").bind(now+300000,row.submission_id,now).run();if(!claim.meta.changes)continue;
  let permanent=false,error='Automation unavailable. Retrying automatically.';
  try{
   const c=await db.prepare('SELECT c.* FROM form_connections c JOIN client_sites s ON s.id=c.site_id WHERE c.site_id=? AND c.revision=? AND c.enabled=1 AND c.tested_at IS NOT NULL AND s.archived=0').bind(row.site_id,row.connection_revision).first<Connection>();
   const sub=await db.prepare('SELECT form_name,page_name,created_at,answers FROM form_submissions WHERE id=? AND site_id=?').bind(row.submission_id,row.site_id).first<{form_name:string;page_name:string;created_at:string;answers:string}>();
   if(!c||!sub){await db.prepare("UPDATE form_deliveries SET status='cancelled',lease_until=0,last_error='Connection or submission is no longer available.' WHERE submission_id=?").bind(row.submission_id).run();continue;}
   if(row.attempts>=8||now-row.created_at>86400000){permanent=true;error='Automation did not accept this submission after retries. Review setup and retry from the inbox.';throw new Error();}
   const decoded=await unseal<{url:string}>(env,c.endpoint,'form-connection:'+row.site_id),data=payload(row.submission_id,row.site_id,sub.form_name,sub.page_name,sub.created_at,JSON.parse(sub.answers));
   const r=await fetch(webhook(decoded.url),{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json','X-HWS-Submission-ID':row.submission_id},body:JSON.stringify(data),signal:AbortSignal.timeout(10000)});
   if(!r.ok){permanent=r.status>=400&&r.status<500&&![408,429].includes(r.status);error='Automation returned HTTP '+r.status+(permanent?'. Review your connection.':'. Retrying automatically.');throw new Error();}
   await db.prepare("UPDATE form_deliveries SET status='accepted',accepted_at=?,lease_until=0,last_error=NULL WHERE submission_id=?").bind(new Date().toISOString(),row.submission_id).run();
  }catch{await db.prepare('UPDATE form_deliveries SET status=?,next_at=?,lease_until=0,last_error=? WHERE submission_id=?').bind(permanent?'failed':'pending',now+Math.min(3600000,60000*2**Math.min(row.attempts,6)),error,row.submission_id).run();}
 }
}
