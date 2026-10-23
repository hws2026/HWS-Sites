import {database} from '../lib/suite-store';
import {audit,json,now,platformOwner,type Principal} from './security';
import type {Env} from './worker';

const INTERVAL=15*60*1000;
type Incident={id:string;owner:string;actor:string;scope:'account'|'suite';reason:string;opened_at:string;acknowledged_at:string|null;resolved_at:string|null;active_key:string|null};
export const isRecoveryOwner=(env:Env,id:string)=>id===platformOwner(env);
export async function suiteLocked(env:Env){if(!env.ADMIN_SUPABASE_USER_IDS)return false;return Boolean(await database().prepare('SELECT id FROM security_incidents WHERE active_key=?').bind(platformOwner(env)+':suite').first());}
export async function accessHold(env:Env,id:string){
 if(isRecoveryOwner(env,id))return null;
 return database().prepare('SELECT scope FROM security_incidents WHERE active_key IN (?,?) ORDER BY scope DESC LIMIT 1').bind(platformOwner(env)+':suite',platformOwner(env)+':account:'+id).first<{scope:string}>();
}
export const holdResponse=(scope:string)=>json({code:scope==='suite'?'SECURITY_MAINTENANCE':'ACCOUNT_REVIEW',error:scope==='suite'?'The suite is temporarily offline for a security review. Please try again later.':'Your account is temporarily restricted for a security review. Contact Husky Suite support.'},503);
async function openIncident(env:Env,actor:string,scope:'account'|'suite',reason:string){
 const db=database(),owner=platformOwner(env),id=crypto.randomUUID(),activeKey=owner+':'+(scope==='suite'?'suite':'account:'+actor);
 const inserted=await db.prepare('INSERT OR IGNORE INTO security_incidents (id,owner,actor,scope,reason,opened_at,active_key) VALUES (?,?,?,?,?,?,?)').bind(id,owner,actor,scope,reason,now(),activeKey).run();
 if(!inserted.meta.changes)return;
 await db.prepare('INSERT INTO security_notifications (owner,next_at) VALUES (?,0) ON CONFLICT(owner) DO UPDATE SET next_at=CASE WHEN last_sent_at IS NULL THEN 0 ELSE last_sent_at+? END').bind(owner,INTERVAL).run();
 // A mail outage must never undo containment or turn it into a server error.
 await sendSecurityAlerts(env).catch(()=>{});
}
// A typo, bad password, missing page, or one forbidden action is NOT an incident.
// Only verified accounts repeatedly probing several privileged API areas qualify.
export async function observeDenial(request:Request,env:Env,p:Principal,status:number){
 if(status!==403||isRecoveryOwner(env,p.id)||!env.HWS_DATA_KEY)return;
 const paths=['/api/admin','/api/team','/api/security','/api/customer-services','/api/reminders'];
 const path=new URL(request.url).pathname;if(!paths.includes(path))return;
 const lastResolved=await database().prepare('SELECT MAX(resolved_at) at FROM security_incidents WHERE owner=? AND actor=?').bind(p.owner,p.id).first<{at:string|null}>();
 const after=[new Date(Date.now()-10*60*1000).toISOString(),lastResolved?.at??''].sort().at(-1)!;
 const events=await database().prepare("SELECT event FROM security_events WHERE owner=? AND actor=? AND status=403 AND created_at>=? AND event LIKE '% /api/%' ORDER BY created_at DESC LIMIT 60").bind(p.owner,p.id,after).all<{event:string}>();
 const recent=events.results.map(row=>row.event.split(' ')[1]).filter(value=>paths.includes(value));
 if(recent.length<12||new Set(recent).size<3)return;
 await openIncident(env,p.id,'account','A signed-in account received at least 12 permission denials across 3 restricted administrative areas within 10 minutes. Review the audit log; this signal does not prove a breach.');
}
export async function incidentRoute(request:Request,env:Env,p:Principal){
 const canManage=isRecoveryOwner(env,p.id)&&p.role==='owner',db=database();
 if(!canManage&&p.role!=='admin')return json({error:'Administrator access required.'},403);
 if(request.method==='GET'){
  const incidents=await db.prepare('SELECT id,actor,scope,reason,opened_at,acknowledged_at,resolved_at FROM security_incidents WHERE owner=? ORDER BY opened_at DESC LIMIT 100').bind(platformOwner(env)).all();
  const delivery=await db.prepare('SELECT last_sent_at,last_error,next_at FROM security_notifications WHERE owner=?').bind(platformOwner(env)).first();
  return json({incidents:incidents.results,canManage,locked:await suiteLocked(env),emailConfigured:Boolean(env.RESEND_API_KEY&&env.SECURITY_EMAIL_FROM&&env.SECURITY_ALERT_EMAIL),alertEmail:canManage?env.SECURITY_ALERT_EMAIL:undefined,alertSender:canManage?env.SECURITY_EMAIL_FROM:undefined,delivery});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(!canManage)return json({error:'Only the platform owner can manage security holds.'},403);
 const b=await request.json() as {action?:string;id?:string;confirmation?:string};
 if(b.action==='lock'){
  if(b.confirmation!=='TAKE SUITE OFFLINE')return json({error:'Type TAKE SUITE OFFLINE to confirm.'},400);
  await openIncident(env,p.id,'suite','The platform owner enabled emergency maintenance. Customer workspaces and published website requests are temporarily blocked.');
  await audit(request,env,p,'security.lock','success');return json({ok:true});
 }
 if(!['acknowledge','resolve'].includes(b.action??'')||typeof b.id!=='string'||b.id.length>100)return json({error:'Choose a valid incident action.'},400);
 const incident=await db.prepare('SELECT * FROM security_incidents WHERE id=? AND owner=? AND resolved_at IS NULL').bind(b.id,p.owner).first<Incident>();
 if(!incident)return json({error:'This incident is already resolved or unavailable.'},404);
 if(b.action==='acknowledge')await db.prepare('UPDATE security_incidents SET acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=? AND owner=?').bind(now(),b.id,p.owner).run();
 else{
  if(b.confirmation!=='RESTORE ACCESS')return json({error:'Review the account and type RESTORE ACCESS to confirm.'},400);
  await db.prepare('UPDATE security_incidents SET resolved_at=?,acknowledged_at=COALESCE(acknowledged_at,?),active_key=NULL WHERE id=? AND owner=?').bind(now(),now(),b.id,p.owner).run();
 }
 await audit(request,env,p,'security.'+b.action,'success',200,b.id);return json({ok:true});
}
export async function sendSecurityAlerts(env:Env,fetcher:typeof fetch=fetch){
 const db=database(),owner=platformOwner(env),time=Date.now();
 const job=await db.prepare('UPDATE security_notifications SET lease_until=? WHERE owner=? AND next_at<=? AND lease_until<=? RETURNING delivery_key,delivery_body,last_sent_at').bind(time+120000,owner,time,time).first<{delivery_key:string|null;delivery_body:string|null;last_sent_at:number|null}>();
 if(!job)return;
 const pending=await db.prepare('SELECT id,scope,opened_at FROM security_incidents WHERE owner=? AND resolved_at IS NULL AND acknowledged_at IS NULL ORDER BY opened_at LIMIT 100').bind(owner).all<{id:string;scope:string;opened_at:string}>();
 if(!pending.results.length){await db.prepare('UPDATE security_notifications SET lease_until=0,next_at=?,delivery_key=NULL,delivery_body=NULL WHERE owner=?').bind(time+INTERVAL,owner).run();return;}
 const key=job.delivery_key??'security-'+crypto.randomUUID();await db.prepare('UPDATE security_notifications SET delivery_key=? WHERE owner=?').bind(key,owner).run();
 try{
  if(!env.RESEND_API_KEY||!env.SECURITY_EMAIL_FROM||!env.SECURITY_ALERT_EMAIL)throw new Error('Security email is not configured.');
  const link=new URL(env.FRONTEND_URL!);link.hash='/security';
  const text=`Husky Suite security review needed\n\n${pending.results.length} incident(s) need your review. ${pending.results.some(i=>i.scope==='suite')?'Suite maintenance is active.':'Only the flagged account is restricted; other customers and published sites remain available.'}\n\nYour owner admin panel remains available: ${link.href}\n\nOpen Security & audit log and acknowledge each incident to stop reminders. Acknowledging does not restore access. Review the logs and secure any affected account before restoring access. A detection is not proof that data was accessed.\n\nIncident IDs: ${pending.results.map(i=>i.id).join(', ')}\n\nReminders repeat every 15 minutes while incidents remain unacknowledged, subject to email provider availability and limits.`;
  const body=job.delivery_body??JSON.stringify({from:env.SECURITY_EMAIL_FROM,to:[env.SECURITY_ALERT_EMAIL],subject:'Husky Suite: security review needed',text});
  await db.prepare('UPDATE security_notifications SET delivery_body=? WHERE owner=?').bind(body,owner).run();
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Email provider rejected the alert (HTTP '+response.status+').');
  await response.body?.cancel();
  await db.prepare('UPDATE security_notifications SET lease_until=0,next_at=?,last_sent_at=?,last_error=NULL,delivery_key=NULL,delivery_body=NULL WHERE owner=?').bind(time+INTERVAL,time,owner).run();
 }catch(error){await db.prepare('UPDATE security_notifications SET lease_until=0,next_at=?,last_error=? WHERE owner=?').bind(time+INTERVAL,error instanceof Error?error.message:'Alert delivery failed.',owner).run();}
}
