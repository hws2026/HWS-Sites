import {boundedBytes,RequestSizeError} from '../lib/request-size';
import {accessHold,holdResponse} from './incidents';
import {database} from '../lib/suite-store';
import policies from '../lib/legal-policies.json';
import type {Env} from './worker';

export type AccountRole='owner'|'admin'|'support'|'billing'|'customer';
export type Principal={id:string;email:string;owner:string;role:AccountRole};
const enc=new TextEncoder(),dec=new TextDecoder();
export const json=(data:unknown,status=200)=>Response.json(data,{status});
export const now=()=>new Date().toISOString();
export const platformOwner=(env:Env)=>env.ADMIN_SUPABASE_USER_IDS.split(',')[0].trim();
export async function digest(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function key(env:Env){if(!env.HWS_DATA_KEY||!/^[a-f0-9]{64}$/i.test(env.HWS_DATA_KEY))throw new Error('Encrypted storage is not configured.');return crypto.subtle.importKey('raw',Uint8Array.from(env.HWS_DATA_KEY.match(/../g)!,v=>parseInt(v,16)),'AES-GCM',false,['encrypt','decrypt']);}
const b64=(v:Uint8Array)=>btoa(Array.from(v,n=>String.fromCharCode(n)).join(''));
const bytes=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
export async function seal(env:Env,value:unknown,purpose:string){const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(purpose)},await key(env),enc.encode(JSON.stringify(value)));return 'v1.'+b64(iv)+'.'+b64(new Uint8Array(ciphertext));}
export async function unseal<T>(env:Env,value:string,purpose:string):Promise<T>{const [version,iv,ciphertext]=value.split('.');if(version!=='v1')throw new Error('Unsupported encrypted record.');return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:enc.encode(purpose)},await key(env),bytes(ciphertext)))) as T;}
export function requestContext(request:Request){const cf=request.cf as Record<string,unknown>|undefined;const number=(v:unknown,min:number,max:number)=>(typeof v==='string'&&v.trim()!=='')||typeof v==='number'?Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):null:null;return {ip:request.headers.get('CF-Connecting-IP')||'unavailable',city:typeof cf?.city==='string'?cf.city:'',region:typeof cf?.region==='string'?cf.region:'',country:typeof cf?.country==='string'?cf.country:'',latitude:number(cf?.latitude,-90,90),longitude:number(cf?.longitude,-180,180),approximate:true,userAgent:(request.headers.get('user-agent')||'').slice(0,500)};}
export async function audit(request:Request,env:Env,p:Pick<Principal,'id'|'email'|'owner'>,event:string,outcome:string,status=200,target=''){
 if(!env.HWS_DATA_KEY)return; // Legacy deployments remain available until encryption is installed.
 const id=crypto.randomUUID();const context=await seal(env,{...requestContext(request),email:p.email},'audit:'+id);
 await database().prepare('INSERT INTO security_events (id,owner,actor,event,outcome,target,status,created_at,context) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,p.owner,p.id,event,outcome,target.slice(0,300),status,now(),context).run();
}
export async function principal(user:{id:string;email:string},env:Env):Promise<Principal>{
 // Bind only a verified authentication email. Never accept a user ID from a form.
 await database().prepare('UPDATE customer_accounts SET user_id=? WHERE owner=? AND lower(email)=lower(?) AND user_id IS NULL').bind(user.id,platformOwner(env),user.email).run();
 if(env.ADMIN_SUPABASE_USER_IDS.split(',').map(x=>x.trim()).includes(user.id))return {...user,owner:user.id,role:'owner'};
 await database().prepare('UPDATE team_members SET user_id=? WHERE email=? AND user_id IS NULL AND active=1').bind(user.id,user.email).run();
 const staff=await database().prepare('SELECT owner,role FROM team_members WHERE user_id=? AND active=1').bind(user.id).first<{owner:string;role:AccountRole}>();
 return {...user,owner:staff?.owner??platformOwner(env),role:staff?.role??'customer'};
}
export const staffAllowed=(role:AccountRole,path:string)=>role==='owner'||role==='admin'&&path!=='/api/team'||role==='support'&&['/api/me','/api/profile','/api/support','/api/onboarding','/api/account-password','/api/session'].includes(path)||role==='billing'&&['/api/me','/api/profile','/api/billing','/api/onboarding','/api/account-password','/api/session'].includes(path)||role==='customer';
export async function onboardingEnabled(env:Env,p:Pick<Principal,'owner'>){if(env.HWS_ONBOARDING_ENABLED==='true')return true;return Boolean((await database().prepare('SELECT onboarding_enabled FROM suite_security_settings WHERE owner=?').bind(p.owner).first<{onboarding_enabled:number}>())?.onboarding_enabled);}
const requiredPolicies=JSON.stringify(policies.map(({id,version})=>({id,version})));
// Check actual current acceptance records, including on older accounts whose UI
// already completed setup. Updating only Onboarding preserves manual suspension.
export async function reconcileOnboarding(request:Request,env:Env,p:Principal,userId?:string){
 const db=database(),complete=`a.must_change=0 AND a.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM json_each(?) required WHERE NOT EXISTS (SELECT 1 FROM policy_acceptances accepted WHERE accepted.owner=a.owner AND accepted.user_id=a.user_id AND accepted.policy_id=json_extract(required.value,'$.id') AND accepted.version=json_extract(required.value,'$.version')))`;
 const scope=userId?' AND a.user_id=?':'',args=userId?[p.owner,requiredPolicies,userId]:[p.owner,requiredPolicies];
 const result=await db.batch([
  db.prepare(`UPDATE customer_accounts AS a SET status='active',completed_at=COALESCE(completed_at,?),expires_at=NULL,error=NULL WHERE a.owner=? AND ${complete}${scope} AND status!='sending' AND (status!='active' OR completed_at IS NULL)`).bind(now(),...args),
  db.prepare(`UPDATE customers SET status='Active' WHERE owner=? AND status='Onboarding' AND archived=0 AND EXISTS (SELECT 1 FROM customer_accounts a WHERE a.customer_id=customers.id AND a.owner=customers.owner AND lower(a.email)=lower(customers.email) AND ${complete}${scope}) RETURNING id`).bind(...args)
 ]);
 for(const row of result[1].results as {id:string}[])await audit(request,env,p,'onboarding.complete','success',200,row.id);
}
export async function onboardingState(p:Principal){const db=database();const account=await db.prepare('SELECT must_change,expires_at FROM customer_accounts WHERE user_id=? AND must_change=1 LIMIT 1').bind(p.id).first<{must_change:number;expires_at:string}>();const accepted=await db.prepare('SELECT policy_id,version,accepted_at FROM policy_acceptances WHERE user_id=?').bind(p.id).all<{policy_id:string;version:string;accepted_at:string}>();const pending=p.role==='owner'?[]:policies.filter(policy=>!accepted.results.some(row=>row.policy_id===policy.id&&row.version===policy.version));return {mustChangePassword:Boolean(account),temporaryExpired:Boolean(account&&account.expires_at<now()),policies:pending,accepted:accepted.results,required:Boolean(account||pending.length)};}
async function consumeLimit(label:string,limit:number,windowMs:number){const bucket=Math.floor(Date.now()/windowMs),k=await digest(label+':'+bucket);const row=await database().prepare('INSERT INTO login_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(k,(bucket+1)*windowMs).first<{count:number}>();return (row?.count??limit+1)<=limit;}
export async function login(request:Request,env:Env){
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 let raw:string;try{raw=new TextDecoder().decode(await boundedBytes(request,12000));}catch(error){if(error instanceof RequestSizeError)return json({error:error.message},413);throw error;}
 let b:{email?:unknown;password?:unknown};try{b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('Invalid request');}catch{return json({error:'Invalid request.'},400);}
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';const password=typeof b.password==='string'?b.password:'';
 if(!email||email.length>254||!password||password.length>4096)return json({error:'Enter your email and password.'},400);
 const who={id:'anonymous',email,owner:platformOwner(env)};const ip=requestContext(request).ip;
 if(!await consumeLimit('ip:'+ip,100,900000)||!await consumeLimit('login:'+ip+':'+email,8,900000)){
  await audit(request,env,who,'login','rate_limited',429);return json({error:'Too many sign-in attempts. This attempt was logged. Wait up to 15 minutes before trying again.',logged:Boolean(env.HWS_DATA_KEY)},429);
 }
 const r=await fetch(env.SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 const data=await r.json() as {user?:{id:string;email:string};access_token?:string;refresh_token?:string};
 if(!r.ok||!data.user||!data.access_token){await audit(request,env,who,'login','failed',401);return json({error:'Invalid email or password. '+(env.HWS_DATA_KEY?'This sign-in attempt was logged.':''),logged:Boolean(env.HWS_DATA_KEY)},401);}
 const hold=await accessHold(env,data.user.id);if(hold)return holdResponse(hold.scope);
 const expired=await database().prepare('SELECT customer_id FROM customer_accounts WHERE user_id=? AND must_change=1 AND expires_at<?').bind(data.user.id,now()).first();
 if(expired){await audit(request,env,{...who,id:data.user.id},'login','temporary_password_expired',403);return json({error:'Your temporary password has expired. Ask your administrator to resend your invitation.'},403);}
 await audit(request,env,{...who,id:data.user.id},'login','success');return json(data);
}
export async function onboarding(request:Request,env:Env,p:Principal){
 if(request.method==='GET'){await reconcileOnboarding(request,env,p,p.id);return json(await onboardingState(p));}if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const state=await onboardingState(p);if(state.mustChangePassword)return json({error:'Change your temporary password first.'},403);
 const b=await request.json() as {policies?:{id:string;version:string}[]};
 if(!Array.isArray(b.policies)||b.policies.length!==policies.length||policies.some(policy=>!b.policies?.some(row=>row.id===policy.id&&row.version===policy.version)))return json({error:'Review and accept every current policy before continuing.'},400);
 const at=now(),db=database();const statements=[];
 for(const policy of policies){const id=crypto.randomUUID();statements.push(db.prepare('INSERT OR IGNORE INTO policy_acceptances (id,owner,user_id,policy_id,version,accepted_at,context) VALUES (?,?,?,?,?,?,?)').bind(id,p.owner,p.id,policy.id,policy.version,at,await seal(env,{...requestContext(request),email:p.email},'policy:'+p.id+':'+policy.id+':'+policy.version)));}
 await db.batch(statements);await reconcileOnboarding(request,env,p,p.id);await audit(request,env,p,'policies.accept','success',200,String(policies.length)+' policy versions');return json({ok:true,acceptedAt:at});
}
export async function changePassword(request:Request,env:Env,p:Principal){
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(!await consumeLimit('password:'+p.id,5,900000))return json({error:'Too many password changes. Try again later.'},429);
 const b=await request.json() as {password?:unknown;currentPassword?:unknown};if(typeof b.password!=='string'||b.password.length<12||b.password.length>256)return json({error:'Use a password between 12 and 256 characters.'},400);
 const account=await database().prepare('SELECT expires_at FROM customer_accounts WHERE user_id=? AND must_change=1').bind(p.id).first<{expires_at:string}>();if(account&&account.expires_at<now())return json({error:'The invitation expired. Ask your administrator to resend it.'},403);
 if(!account){
  if(typeof b.currentPassword!=='string'||!b.currentPassword||b.currentPassword.length>4096)return json({error:'Enter your current password to change it.'},400);
  const verified=await fetch(env.SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:p.email,password:b.currentPassword})});
  const identity=await verified.json() as {user?:{id:string}};
  if(!verified.ok||identity.user?.id!==p.id){await audit(request,env,p,'password.verify','failed',403);return json({error:'Your current password is incorrect.'},403);}
 }
 const r=await fetch(env.SUPABASE_URL+'/auth/v1/user',{method:'PUT',headers:{Authorization:request.headers.get('authorization')!,apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({password:b.password})});
 if(!r.ok)return json({error:'The password could not be changed. Use a different password or sign in again.'},400);
 await database().prepare("UPDATE customer_accounts SET must_change=0,status='onboarding',expires_at=NULL,error=NULL WHERE user_id=? AND owner=?").bind(p.id,p.owner).run();await reconcileOnboarding(request,env,p,p.id);await audit(request,env,p,'password.change','success');return json({ok:true});
}
export async function securityLog(request:Request,env:Env,p:Principal){
 if(!['owner','admin'].includes(p.role))return json({error:'Administrator access required.'},403);
 const db=database();
 if(request.method==='POST'){
  if(p.role!=='owner'||p.id!==platformOwner(env))return json({error:'Only the platform owner can delete audit records. Administrators have view access.'},403);
  const b=await request.json() as {action?:string;id?:string;confirmation?:string;before?:string};
  if(b.action==='delete'){
   if(b.confirmation!=='DELETE AUDIT ENTRY'||typeof b.id!=='string'||b.id.length>100)return json({error:'Confirm deletion of this audit entry.'},400);
   const result=await db.prepare('DELETE FROM security_events WHERE id=? AND owner=?').bind(b.id,p.owner).run();
   if(!result.meta.changes)return json({error:'Audit entry not found.'},404);
   await audit(request,env,p,'audit.delete','success',200,b.id);return json({ok:true,deleted:result.meta.changes});
  }
  if(b.action==='purge'){
   if(b.confirmation!=='PURGE AUDIT LOG'||typeof b.before!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(b.before)||!Number.isFinite(Date.parse(b.before))||b.before>now())return json({error:'Type PURGE AUDIT LOG to confirm, or refresh the log and try again.'},400);
   // Keep events arriving after the owner's reviewed snapshot. Policy acceptance
   // history is separate and is never deleted by these controls.
   const result=await db.prepare('DELETE FROM security_events WHERE owner=? AND created_at<=?').bind(p.owner,b.before).run();
   await audit(request,env,p,'audit.purge','success',200,String(result.meta.changes)+' entries deleted');return json({ok:true,deleted:result.meta.changes});
  }
  return json({error:'Unknown audit action.'},400);
 }
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 const url=new URL(request.url),cursor=url.searchParams.get('before')??'9999|~',[at,id='~']=cursor.split('|');
 const category=url.searchParams.get('category')??'all';
 const eventFilter=category==='failed-logins'?" AND ((event='login' AND outcome!='success') OR (event='POST /api/site-login' AND status>=400))":category==='logins'?" AND (event='login' OR event='POST /api/site-login')":'';
 const events=await db.prepare('SELECT * FROM security_events WHERE owner=?'+eventFilter+' AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 100').bind(p.owner,at,at,id).all<{id:string;context:string;created_at:string}>();
 let unreadableRecords=0;
 const readContext=async(value:string,purpose:string)=>{try{return await unseal(env,value,purpose);}catch{unreadableRecords++;return {email:'Encrypted details unavailable',ip:'Unavailable',city:'',region:'',country:'',latitude:null,longitude:null,userAgent:'Unavailable'};}};
 const rows=await Promise.all(events.results.map(async row=>({...row,context:await readContext(row.context,'audit:'+row.id)})));
 const [acceptAt,acceptId='~']=(url.searchParams.get('acceptancesBefore')??'9999|~').split('|');
 const accepted=await database().prepare('SELECT * FROM policy_acceptances WHERE owner=? AND (accepted_at<? OR (accepted_at=? AND id<?)) ORDER BY accepted_at DESC,id DESC LIMIT 500').bind(p.owner,acceptAt,acceptAt,acceptId).all<{id:string;accepted_at:string;user_id:string;policy_id:string;version:string;context:string}>();
 const acceptances=await Promise.all(accepted.results.map(async row=>({...row,context:await readContext(row.context,'policy:'+row.user_id+':'+row.policy_id+':'+row.version)})));
 return json({events:rows,acceptances,policies,canDelete:p.role==='owner'&&p.id===platformOwner(env),snapshotAt:now(),unreadableRecords,acceptancesNext:accepted.results.length===500?accepted.results.at(-1)!.accepted_at+'|'+accepted.results.at(-1)!.id:null,next:events.results.length===100?events.results.at(-1)!.created_at+'|'+events.results.at(-1)!.id:null,encryptionConfigured:Boolean(env.HWS_DATA_KEY)});
}
