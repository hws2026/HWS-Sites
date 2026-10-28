import {supportNoticeStatements,sendSupportNotifications} from './support-notifications';
import {createClient} from '@supabase/supabase-js';
import {database} from '../lib/suite-store';
import {isTemplateId} from '../lib/template-catalog';
import {archivedTemplateIds} from '../lib/template-catalog-store';
import {audit,json,now,seal,unseal,onboardingEnabled,reconcileOnboarding,type Principal} from './security';
import type {Env} from './worker';
const text=(v:unknown,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function inviteCustomer(request:Request,env:Env,p:Principal,customerId:string){
 const db=database();const c=await db.prepare('SELECT id,name,email FROM customers WHERE id=? AND owner=? AND archived=0').bind(customerId,p.owner).first<{id:string;name:string;email:string}>();
 if(!c)return json({error:'Customer not found.'},404);return deliverInvitation(request,env,p,c.id,c.email,c.name);
}
export async function deliverInvitation(request:Request,env:Env,p:Principal,id:string,email:string,name:string){
 const db=database();await db.prepare("INSERT OR IGNORE INTO customer_accounts (customer_id,owner,email,status) VALUES (?,?,?,'pending')").bind(id,p.owner,email).run();
 if(!await onboardingEnabled(env,p)){const reason='Welcome email is pending: upload the new suite, then choose Enable customer setup in Customers.';await db.prepare("UPDATE customer_accounts SET status='pending',error=? WHERE customer_id=?").bind(reason,id).run();return json({ok:true,emailSent:false,message:reason},202);}
 if(!env.RESEND_API_KEY||!env.EMAIL_FROM||!env.SUPABASE_STORAGE_SECRET_KEY||!env.HWS_DATA_KEY){const reason='Welcome email is pending: configure the verified onboarding@huskysol.com sender, email provider key, and encrypted account service.';await db.prepare("UPDATE customer_accounts SET status='pending',error=? WHERE customer_id=?").bind(reason,id).run();return json({ok:true,emailSent:false,message:reason},202);}
 const locked=await db.prepare("UPDATE customer_accounts SET status='sending',sending_at=?,error=NULL WHERE customer_id=? AND (status!='sending' OR sending_at IS NULL OR sending_at<?)").bind(now(),id,new Date(Date.now()-300000).toISOString()).run();if(!locked.meta.changes)return json({error:'An invitation is already being sent. Refresh its status before retrying.'},409);
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_STORAGE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 let password='',userId='';
 try{
  const existing=await db.prepare('SELECT user_id,must_change,email FROM customer_accounts WHERE customer_id=?').bind(id).first<{user_id:string|null;must_change:number;email:string}>();
  if(existing?.user_id&&existing.email!==email)throw new Error('The customer email changed. Revoke the old account access and review the new address before sending another invitation.');
  password=Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
  if(existing?.user_id){userId=existing.user_id;if(existing.must_change){const r=await client.auth.admin.updateUserById(userId,{password});if(r.error)throw new Error('Could not renew the temporary password.');}else password='';}
  else{
   const r=await client.auth.admin.createUser({email,password,email_confirm:true});
   if(r.error){if(!['email_exists','user_already_exists'].includes(r.error.code??''))throw new Error('Account creation failed. Check the Supabase authentication settings.');
    password='';for(let page=1;page<=20&&!userId;page++){const found=await client.auth.admin.listUsers({page,perPage:100});if(found.error)throw new Error('Could not check the existing account.');userId=found.data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase())?.id??'';if(found.data.users.length<100)break;}
    if(!userId)throw new Error('An existing account could not be verified. Ask the customer to use password reset, then retry.');
   }else userId=r.data.user.id;
  }
  const expires=password?new Date(Date.now()+86400000).toISOString():null;
  await db.prepare('UPDATE customer_accounts SET user_id=?,email=?,must_change=?,expires_at=? WHERE customer_id=?').bind(userId,email,password?1:0,expires,id).run();
  const signIn=env.FRONTEND_URL+'#/signin';const instructions=password?'Temporary password: '+password+'\nThis expires in 24 hours. You must set a new password and accept the policies before opening your workspace.':'Use your existing password. If you forgot it, choose Forgot password on the sign-in page. Your existing password was not changed.';
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'onboarding-'+id+'-'+(expires??now())},body:JSON.stringify({from:env.EMAIL_FROM,to:[email],subject:'Your Husky Suite account is ready',text:`Welcome ${name}\n\nSign in: ${signIn}\nEmail: ${email}\n${instructions}\n\nPolicies: https://www.huskysol.com/legal`,html:`<div style="font:16px Arial;color:#333333;max-width:600px;margin:auto"><div style="padding:24px;border-top:6px solid #2020b7"><img width="140" alt="Husky Suite" src="${esc(env.FRONTEND_URL??'')}husky-suite-logo.png"><h1>Welcome to Husky Suite</h1><p>Hello ${esc(name)}, your workspace is ready.</p><p><strong>Email:</strong> ${esc(email)}</p><p style="white-space:pre-wrap">${esc(instructions)}</p><p><a style="background:#2020b7;color:white;padding:14px 22px;display:inline-block" href="${esc(signIn)}">Sign in to Husky Suite</a></p><p>After signing in, review and accept our policies. Keep your temporary password private.</p><a href="https://www.huskysol.com/legal">Husky Solutions policies</a></div></div>`})});
  if(!r.ok)throw new Error('The email provider rejected delivery (HTTP '+r.status+'). Check sender verification, quota, and the provider key.');
  await db.prepare("UPDATE customer_accounts SET status=?,sent_at=?,error=NULL WHERE customer_id=?").bind(password?'invited':'onboarding',now(),id).run();await reconcileOnboarding(request,env,p,userId);await audit(request,env,p,'invitation.send','success',200,id);return json({ok:true,emailSent:true,message:'Welcome email accepted by the email provider.'});
 }catch(e){const message=e instanceof Error?e.message:'Invitation failed.';await db.prepare("UPDATE customer_accounts SET status='failed',error=? WHERE customer_id=?").bind(message,id).run();await audit(request,env,p,'invitation.send','failed',502,id);return json({ok:true,emailSent:false,message},202);}finally{password='';}
}
export async function customerServices(request:Request,env:Env,p:Principal){
 if(!['owner','admin'].includes(p.role))return json({error:'Administrator access required.'},403);const db=database();
 if(request.method==='GET'){const accounts=await db.prepare('SELECT customer_id,email,status,sent_at,error,expires_at,completed_at FROM customer_accounts WHERE owner=?').bind(p.owner).all();const templates=await db.prepare('SELECT t.* FROM customer_templates t JOIN customers c ON c.id=t.customer_id WHERE c.owner=?').bind(p.owner).all();return json({accounts:accounts.results,templates:templates.results,onboardingEnabled:await onboardingEnabled(env,p),canActivate:p.role==='owner',emailConfigured:Boolean(env.RESEND_API_KEY&&env.EMAIL_FROM&&env.SUPABASE_STORAGE_SECRET_KEY&&env.HWS_DATA_KEY),sender:env.EMAIL_FROM??'onboarding@huskysol.com'});}
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const b=await request.json() as Record<string,unknown>,id=text(b.customerId);
 if(b.action==='activate-onboarding'){if(p.role!=='owner')return json({error:'Only the platform owner can enable customer setup.'},403);if(!env.HWS_DATA_KEY)return json({error:'Configure encrypted storage before enabling customer setup.'},503);await db.prepare('INSERT INTO suite_security_settings (owner,onboarding_enabled,updated_at) VALUES (?,1,?) ON CONFLICT(owner) DO UPDATE SET onboarding_enabled=1,updated_at=excluded.updated_at').bind(p.owner,now()).run();await audit(request,env,p,'onboarding.activate','success');return json({ok:true,message:'Customer setup is enabled. Customers and staff must complete the current policies before entering the suite. Resend any pending invitations below.'});}
 if(b.action==='invite')return inviteCustomer(request,env,p,id);
 if(b.action==='template'){
  if(!isTemplateId(b.templateId)||(await archivedTemplateIds()).includes(String(b.templateId)))return json({error:'Choose an available template.'},400);
  if(!await db.prepare('SELECT id FROM customers WHERE id=? AND owner=? AND archived=0').bind(id,p.owner).first())return json({error:'Customer not found.'},404);
  await db.prepare('INSERT INTO customer_templates (customer_id,template_id,updated_at) VALUES (?,?,?) ON CONFLICT(customer_id) DO UPDATE SET template_id=excluded.template_id,updated_at=excluded.updated_at').bind(id,b.templateId,now()).run();await audit(request,env,p,'customer.template','success',200,id);return json({ok:true});
 }return json({error:'Unknown customer action.'},400);
}
export async function team(request:Request,env:Env,p:Principal){
 if(p.role!=='owner')return json({error:'Only the platform owner can manage the team.'},403);const db=database();
 if(request.method==='GET')return json({members:(await db.prepare('SELECT id,email,user_id,role,active,created_at FROM team_members WHERE owner=? ORDER BY created_at DESC').bind(p.owner).all()).results});
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const b=await request.json() as Record<string,unknown>;
 if(b.action==='revoke'){const changed=await db.prepare('UPDATE team_members SET active=0 WHERE id=? AND owner=?').bind(text(b.id),p.owner).run();return json({ok:Boolean(changed.meta.changes)});}
 const email=text(b.email,254).toLowerCase(),role=text(b.role);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['admin','support','billing'].includes(role)||email===p.email)return json({error:'Choose a different team email and a valid role.'},400);
 const existing=await db.prepare('SELECT id,owner FROM team_members WHERE email=?').bind(email).first<{id:string;owner:string}>();if(existing&&existing.owner!==p.owner)return json({error:'That email belongs to another team.'},409);
 const id=existing?.id??crypto.randomUUID();await db.prepare('INSERT INTO team_members (id,owner,email,role,active,created_at) VALUES (?,?,?,?,1,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,active=1').bind(id,p.owner,email,role,now()).run();await audit(request,env,p,'team.assign','success',200,id+':'+role);return deliverInvitation(request,env,p,'team:'+id,email,'team member');
}
async function customerAccess(id:string,p:Principal){const c=await database().prepare('SELECT id,owner,name,email FROM customers WHERE id=? AND archived=0').bind(id).first<{id:string;owner:string;name:string;email:string}>();if(!c)return null;if(p.role!=='customer')return c.owner===p.owner?c:null;if(await database().prepare('SELECT customer_id FROM customer_accounts WHERE customer_id=? AND owner=? AND user_id=?').bind(id,c.owner,p.id).first())return c;const assigned=await database().prepare("SELECT a.id FROM site_access a JOIN client_sites s ON s.id=a.site_id WHERE a.user_id=? AND a.role!='viewer' AND s.customer_id=? AND s.archived=0").bind(p.id,id).first();return assigned?c:null;}
export async function support(request:Request,env:Env,p:Principal){
 const db=database();if(p.role==='billing')return json({error:'Support access required.'},403);
 if(!env.HWS_DATA_KEY)return json({error:'Encrypted support storage must be configured first.'},503);
 if(request.method==='GET'){
  const threadId=new URL(request.url).searchParams.get('thread');
  if(threadId){const t=await db.prepare('SELECT * FROM support_threads WHERE id=?').bind(threadId).first<{id:string;customer_id:string;subject:string}>();if(!t||!await customerAccess(t.customer_id,p))return json({error:'Conversation not found.'},404);const messages=await db.prepare('SELECT * FROM support_messages WHERE thread_id=? ORDER BY created_at DESC,id DESC LIMIT 200').bind(t.id).all<{id:string;payload:string}>();return json({messages:await Promise.all(messages.results.reverse().map(async row=>({...row,payload:await unseal(env,row.payload,'message:'+row.id)})))});}
  const customers=(await db.prepare(p.role==='customer'?"SELECT DISTINCT c.id,c.name FROM customers c LEFT JOIN client_sites s ON s.customer_id=c.id LEFT JOIN site_access a ON a.site_id=s.id WHERE c.archived=0 AND (EXISTS (SELECT 1 FROM customer_accounts ca WHERE ca.customer_id=c.id AND ca.owner=c.owner AND ca.user_id=?) OR (a.user_id=? AND a.role!='viewer' AND s.archived=0))":'SELECT id,name FROM customers WHERE owner=? AND archived=0').bind(...(p.role==='customer'?[p.id,p.id]:[p.owner])).all<{id:string;name:string}>()).results;
  const rows=customers.length?(await db.prepare('SELECT * FROM support_threads WHERE customer_id IN ('+customers.map(()=>'?').join(',')+') ORDER BY updated_at DESC,id DESC LIMIT 200').bind(...customers.map(c=>c.id)).all<{id:string;customer_id:string;subject:string}>()).results:[];
  const members=p.role==='customer'?[]:(await db.prepare("SELECT id,email FROM team_members WHERE owner=? AND active=1 AND role IN ('admin','support')").bind(p.owner).all()).results;
  return json({customers,threads:await Promise.all(rows.map(async row=>({...row,subject:await unseal<string>(env,row.subject,'thread:'+row.id)}))),members,staff:p.role!=='customer'});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const b=await request.json() as Record<string,unknown>,threadId=text(b.threadId);let t=threadId?await db.prepare('SELECT id,customer_id,status FROM support_threads WHERE id=?').bind(threadId).first<{id:string;customer_id:string;status:string}>():null;
 if(b.action==='status'){
  if(p.role==='customer'||!t||!await customerAccess(t.customer_id,p)||!['open','closed'].includes(String(b.status)))return json({error:'Conversation cannot be updated.'},403);
  const assignee=text(b.assignee)||null;if(assignee&&!await db.prepare("SELECT id FROM team_members WHERE id=? AND owner=? AND active=1 AND role IN ('admin','support')").bind(assignee,p.owner).first())return json({error:'Choose an active support agent.'},400);
  await db.prepare('UPDATE support_threads SET status=?,assignee=?,updated_at=? WHERE id=?').bind(b.status,assignee,now(),t.id).run();return json({ok:true});
 }
 const message=text(b.message,8000);if(!message)return json({error:'Enter a message.'},400);const customer=await customerAccess(t?.customer_id??text(b.customerId),p);if(!customer||threadId&&!t)return json({error:'Conversation not found.'},404);
 const recent=await db.prepare('SELECT COUNT(*) n FROM support_messages WHERE actor=? AND created_at>?').bind(p.id,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();if((recent?.n??0)>=60)return json({error:'Message limit reached. Try again later.'},429);
 const at=now(),id=crypto.randomUUID(),statements=[];
 if(!t){const subject=text(b.subject,160);if(!subject)return json({error:'Enter a conversation subject.'},400);t={id:crypto.randomUUID(),customer_id:customer.id,status:'open'};statements.push(db.prepare("INSERT INTO support_threads (id,owner,customer_id,subject,status,created_at,updated_at) VALUES (?,?,?,?,'open',?,?)").bind(t.id,customer.owner,customer.id,await seal(env,subject,'thread:'+t.id),at,at));}
 if(t.status==='closed')return json({error:'This conversation is closed. Start a new conversation or ask support to reopen it.'},409);
 statements.push(db.prepare('INSERT INTO support_messages (id,thread_id,actor,payload,created_at) VALUES (?,?,?,?,?)').bind(id,t.id,p.id,await seal(env,{message,email:p.email,staff:p.role!=='customer'},'message:'+id),at),db.prepare('UPDATE support_threads SET updated_at=? WHERE id=?').bind(at,t.id));statements.push(...await supportNoticeStatements(env,p,id,t.id,customer.id,customer.owner));await db.batch(statements);await audit(request,env,p,'support.message','success',200,t.id);const delivery=await sendSupportNotifications(env,id).catch(()=>({accepted:0,pending:true}));return json({ok:true,threadId:t.id,message:delivery.accepted?'Message saved. Email notification accepted by the email provider.':delivery.pending?'Message saved. Email notification queued for retry.':'Message saved. The email notification needs delivery settings reviewed.'});
}
