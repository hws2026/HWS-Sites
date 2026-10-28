import {database} from '../lib/suite-store';
import {seal,unseal,type Principal} from './security';
import type {Env} from './worker';
type Notice={to:string;recipient:'customer'|'owner'|'agent';customerId:string;agentId?:string;from:string;subject:string;text:string;html:string};
type Row={id:string;thread_id:string;payload:string;attempts:number;created_at:number;owner:string};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const email=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export async function supportNoticeStatements(env:Env,p:Principal,messageId:string,threadId:string,customerId:string,owner:string){
 const db=database(),recipients:{to:string;recipient:Notice['recipient'];agentId?:string;agentRole?:string}[]=[];
 if(p.role==='customer'){
  recipients.push({to:env.SUPPORT_NOTIFICATION_EMAIL||env.SECURITY_ALERT_EMAIL||'',recipient:'owner'});
  const agent=await db.prepare("SELECT m.id,m.email,m.role FROM support_threads t JOIN team_members m ON m.id=t.assignee AND m.owner=t.owner WHERE t.id=? AND m.active=1 AND m.role IN ('admin','support')").bind(threadId).first<{id:string;email:string;role:string}>();
  if(agent&&!recipients.some(r=>r.to.toLowerCase()===agent.email.toLowerCase()))recipients.push({to:agent.email,recipient:'agent',agentId:agent.id,agentRole:agent.role});
 }else{
  const customer=await db.prepare('SELECT email FROM customer_accounts WHERE customer_id=? AND owner=?').bind(customerId,owner).first<{email:string}>();
  recipients.push({to:customer?.email??'',recipient:'customer'});
 }
 const result=[];
 for(const [n,r] of recipients.entries()){
  const id=messageId+':'+n,url=env.FRONTEND_URL+'#/'+(r.recipient==='customer'?'portal':r.agentRole==='support'?'team-workspace':'admin')+'?view=support&thread='+encodeURIComponent(threadId);
  const text='You have a new support message in Husky Suite. Sign in to read and reply: '+url;
  const html='<div style="font:16px Arial;color:#333;max-width:600px;margin:auto;border-top:6px solid #2020b7;padding:24px"><img width="130" alt="Husky Suite" src="'+esc(env.FRONTEND_URL+'husky-suite-logo.png')+'"><h1>New support message</h1><p>You have a new message in Husky Suite.</p><p><a style="color:#2020b7;text-decoration:underline" href="'+esc(url)+'">Sign in to read and reply</a></p><p>Your conversation stays private inside the suite.</p></div>';
  const payload:Notice={...r,customerId,from:env.EMAIL_FROM??'',subject:'New support message in Husky Suite',text,html};
  result.push(db.prepare("INSERT INTO support_notifications (id,message_id,thread_id,owner,payload,status,attempts,next_at,lease_until,created_at) VALUES (?,?,?,?,?,'pending',0,?,0,?)").bind(id,messageId,threadId,owner,await seal(env,payload,'support-notice:'+id),Date.now(),Date.now()));
 }
 return result;
}
export async function sendSupportNotifications(env:Env,messageId?:string){
 if(!env.RESEND_API_KEY||!env.HWS_DATA_KEY)return {accepted:0,pending:true};
 const db=database(),at=Date.now();
 const rows=await db.prepare("SELECT id,thread_id,owner,payload,attempts,created_at FROM support_notifications WHERE status='pending' AND next_at<=? AND lease_until<?"+(messageId?' AND message_id=?':'')+' ORDER BY created_at LIMIT 10').bind(at,at,...(messageId?[messageId]:[])).all<Row>();
 let accepted=0;
 for(const row of rows.results){
  const claim=await db.prepare("UPDATE support_notifications SET lease_until=?,attempts=attempts+1 WHERE id=? AND status='pending' AND lease_until<?").bind(at+300000,row.id,at).run();if(!claim.meta.changes)continue;
  let permanent=false,reason='Email service unavailable. Retrying automatically.';
  try{
   const notice=await unseal<Notice>(env,row.payload,'support-notice:'+row.id);
   if(!notice||!email(notice.to)||!notice.from){permanent=true;throw new Error('Notification recipient or sender needs configuration.');}
   if(at-row.created_at>23*3600000){permanent=true;throw new Error('Notification needs review after 23 hours of retries.');}
   const thread=await db.prepare('SELECT customer_id FROM support_threads WHERE id=? AND owner=?').bind(row.thread_id,row.owner).first<{customer_id:string}>();
   let eligible=!!thread&&thread.customer_id===notice.customerId;
   if(notice.recipient==='customer')eligible=eligible&&!!await db.prepare('SELECT customer_id FROM customer_accounts WHERE customer_id=? AND owner=? AND lower(email)=?').bind(notice.customerId,row.owner,notice.to.toLowerCase()).first();
   if(notice.recipient==='agent')eligible=eligible&&!!await db.prepare("SELECT id FROM team_members WHERE id=? AND owner=? AND active=1 AND role IN ('admin','support') AND lower(email)=?").bind(notice.agentId??'',row.owner,notice.to.toLowerCase()).first();
   if(!eligible){permanent=true;throw new Error('Notification cancelled because conversation access changed.');}
   const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'support-'+row.id},body:JSON.stringify({from:notice.from,to:[notice.to],subject:notice.subject,text:notice.text,html:notice.html}),signal:AbortSignal.timeout(10000)});
   if(!r.ok){permanent=r.status>=400&&r.status<500&&![408,429].includes(r.status);reason='Email provider returned HTTP '+r.status+(permanent?'. Review email delivery settings.':'. Retrying automatically.');throw new Error(reason);}
   const result=await r.json() as {id?:string};if(!result.id)throw new Error('The email provider did not confirm acceptance.');
   await db.prepare("UPDATE support_notifications SET status='accepted',provider_id=?,last_error=NULL,lease_until=0 WHERE id=?").bind(result.id,row.id).run();accepted++;
  }catch(e){
   // Do not expose provider response bodies, credentials, or recipient addresses in errors.
   if(permanent&&e instanceof Error)reason=e.message;
   await db.prepare('UPDATE support_notifications SET status=?,next_at=?,lease_until=0,last_error=? WHERE id=?').bind(permanent?'failed':'pending',at+Math.min(3600000,60000*2**Math.min(row.attempts,6)),reason,row.id).run();
  }
 }
 return {accepted,pending:!!await db.prepare("SELECT id FROM support_notifications WHERE status='pending'"+(messageId?' AND message_id=?':'')+' LIMIT 1').bind(...(messageId?[messageId]:[])).first()};
}
