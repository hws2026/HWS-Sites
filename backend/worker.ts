import {login,principal,staffAllowed,onboardingEnabled,onboardingState,onboarding,changePassword,securityLog,audit,reconcileOnboarding} from './security';
import {accessHold,holdResponse,suiteLocked,incidentRoute,observeDenial,sendSecurityAlerts,isRecoveryOwner} from './incidents';
import {boundedBytes,RequestSizeError} from '../lib/request-size';
import {profile} from './profile';
import {honeybook,honeybookEvent} from './honeybook';
import {customerServices,team,support,inviteCustomer} from './customer-services';
import {websitePaymentsRoute,merchantWebhook,type MerchantEnv} from './website-payments';
import {isMobileRequest,isMobileApiAllowed,DESKTOP_REQUIRED_MESSAGE} from '../lib/device-access';
import {mobileWorkspace,mobileEvents} from './mobile';
import {publicSnapshot} from '../lib/publication';
import {formsInbox} from './forms';
import * as admin from '../app/api/admin/route';
import * as portal from '../app/api/portal/route';
import * as site from '../app/api/site/route';
import * as upload from '../app/api/upload/route';
import * as media from '../app/media/[id]/route';
import * as siteLogin from '../app/api/site-login/route';
import {withBackendEnv, type BackendEnv} from '../lib/server-context';
import {reminderRoute,sendDueReminders} from './reminders';
import {billingRoute,stripeWebhook,type BillingEnv} from './billing';
import {domainRoute,type DomainEnv} from './domains';
import {publicSite} from './public-site';
import type {NextRequest} from 'next/server';
export type Env=BackendEnv & BillingEnv & MerchantEnv & DomainEnv & {SUPABASE_URL:string;SUPABASE_PUBLISHABLE_KEY:string;ADMIN_SUPABASE_USER_IDS:string;RESEND_API_KEY?:string;EMAIL_FROM?:string;HWS_DATA_KEY?:string;HWS_ONBOARDING_ENABLED?:string;SECURITY_ALERT_EMAIL?:string;SECURITY_EMAIL_FROM?:string};
const json=(data:unknown,status=200)=>Response.json(data,{status});
export async function authenticate(request:Request,env:Env,fetcher:typeof fetch=fetch){const bearer=request.headers.get('authorization');if(!bearer||!/^Bearer [\w.-]+$/.test(bearer))return null;const result=await fetcher(env.SUPABASE_URL+'/auth/v1/user',{headers:{Authorization:bearer,apikey:env.SUPABASE_PUBLISHABLE_KEY}});if(!result.ok)return null;const user=await result.json() as {id?:string;email?:string;email_confirmed_at?:string;phone?:string};return user.id&&user.email&&user.email_confirmed_at?{id:user.id,email:user.email.toLowerCase(),phone:user.phone??''}:null;}
export default {
 async fetch(request:Request,env:Env){const origin=request.headers.get('origin');const allowed=env.FRONTEND_URL?new URL(env.FRONTEND_URL).origin:'';const cors=(response:Response)=>{const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Strict-Transport-Security','max-age=31536000');if(origin===allowed){headers.set('Access-Control-Allow-Origin',allowed);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, Range, X-HWS-Device');headers.set('Access-Control-Expose-Headers','Content-Disposition, Content-Range, Accept-Ranges');headers.set('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');}return new Response(response.body,{status:response.status,headers});};
 const url=new URL(request.url);
 const honeybookHook=url.pathname.match(/^\/api\/honeybook\/events\/([a-f0-9-]{36})$/);
 if(honeybookHook)return cors(await withBackendEnv(env,()=>honeybookEvent(request,env,honeybookHook[1])));
 if(url.pathname==='/api/stripe/connect-webhook')return withBackendEnv(env,()=>merchantWebhook(request,env));
 if(url.pathname==='/api/stripe/webhook')return withBackendEnv(env,()=>stripeWebhook(request,env));
 try{const visitor=await withBackendEnv(env,()=>publicSite(request,env));if(visitor)return visitor;}catch(error){console.error('Public routing unavailable',error instanceof Error?error.message:'Unknown failure');return cors(json({error:'Website service unavailable.'},503));}
 if(origin&&origin!==allowed)return cors(json({error:'This origin is not allowed.'},403));if(request.method==='OPTIONS')return cors(new Response(null,{status:204}));
 if(url.pathname==='/api/published'&&request.method==='GET')return withBackendEnv(env,async()=>{if(await suiteLocked(env))return cors(holdResponse('suite'));const snapshot=await publicSnapshot(url.searchParams.get('id')??'');return cors(snapshot?json({site:snapshot}):json({error:'This website is unpublished or unavailable.'},404));});
 if(url.pathname==='/api/login'){try{return cors(await withBackendEnv(env,()=>login(request,env)));}catch{return cors(json({error:'Sign-in is temporarily unavailable. Please try again.'},503));}}
 if(url.pathname==='/health')return cors(json({ok:true,authentication:'supabase'}));
 if(isMobileRequest(request.headers)&&!isMobileApiAllowed(url.pathname,request.method)&&!['/api/security','/api/incidents'].includes(url.pathname))return cors(json({error:DESKTOP_REQUIRED_MESSAGE,code:'DESKTOP_REQUIRED'},403));
 
 if(url.pathname==='/api/site-login'&&request.method==='GET'){try{const req=request as NextRequest;Object.defineProperty(req,'nextUrl',{value:url});return cors(await withBackendEnv(env,()=>siteLogin.GET(req)));}catch{return cors(json({site:null,error:'Website unavailable.'},503));}}
 try{if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.ADMIN_SUPABASE_USER_IDS)return cors(json({error:'Backend authentication has not been configured.'},503));const user=await authenticate(request,env);if(!user)return cors(json({error:'Sign in to continue.'},401));const p=await withBackendEnv(env,()=>principal(user,env));const hold=await withBackendEnv(env,()=>accessHold(env,p.id));if(hold)return cors(holdResponse(hold.scope));if(isMobileRequest(request.headers)&&!isMobileApiAllowed(url.pathname,request.method)&&!(isRecoveryOwner(env,p.id)&&['/api/security','/api/incidents'].includes(url.pathname)))return cors(json({error:DESKTOP_REQUIRED_MESSAGE,code:'DESKTOP_REQUIRED'},403));const isAdmin=p.role==='owner'||p.role==='admin';if(!staffAllowed(p.role,url.pathname)){await withBackendEnv(env,async()=>{await audit(request,env,p,request.method+' '+url.pathname,'role_denied',403);await observeDenial(request,env,p,403);});return cors(json({error:'Your team role does not allow this action.'},403));}const effective={...user,id:isAdmin||p.role==='billing'?p.owner:user.id,isAdmin:isAdmin||p.role==='billing'};
 // Never accept identity headers supplied by a browser. Shared handlers see only verified identity.
 const headers=new Headers(request.headers);headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');headers.set('oai-authenticated-user-id',effective.id);headers.set('oai-authenticated-user-email',user.email);const body=request.body&&url.pathname!=='/api/upload'?await boundedBytes(request,1024*1024):request.body;const req=new Request(request.url,{method:request.method,headers,body,redirect:request.redirect}) as NextRequest;Object.defineProperty(req,'nextUrl',{value:url});Object.defineProperty(req,'cf',{value:request.cf});
 return await withBackendEnv(env,async()=>{
 let auditEvent=request.method+' '+url.pathname,auditTarget=url.searchParams.get('id')??url.searchParams.get('siteId')??'';
 const run=async()=>{
  if(url.pathname==='/api/me')return json({email:user.email,role:p.role==='owner'||p.role==='admin'?'admin':p.role,teamRole:p.role,onboardingRequired:(await onboardingState(p)).mustChangePassword||await onboardingEnabled(env,p)&&(await onboardingState(p)).required});
  if(url.pathname==='/api/onboarding')return onboarding(req,env,p);
  if(url.pathname==='/api/account-password')return changePassword(req,env,p);
  if(url.pathname==='/api/session'){if(req.method!=='POST')return json({error:'Method not allowed.'},405);return json({ok:true});}
  if((await onboardingState(p)).mustChangePassword||await onboardingEnabled(env,p)&&(await onboardingState(p)).required)return json({error:'Complete your password and policy setup before opening the workspace.',code:'ONBOARDING_REQUIRED'},428);
  if(url.pathname==='/api/incidents')return incidentRoute(req,env,p);
  if(url.pathname==='/api/profile')return profile(req,env,p,user.phone);
  if(isAdmin&&req.method==='GET'&&['/api/admin','/api/customer-services'].includes(url.pathname))await reconcileOnboarding(req,env,p);
  if(url.pathname==='/api/customer-services')return customerServices(req,env,p);
  if(url.pathname==='/api/team')return team(req,env,p);
  if(url.pathname==='/api/security')return securityLog(req,env,p);
  if(url.pathname==='/api/support')return support(req,env,p);
  if(url.pathname==='/api/honeybook')return honeybook(req,env,p);
  if(url.pathname==='/api/mobile')return mobileWorkspace(req,effective);
  if(url.pathname==='/api/events')return mobileEvents(req,effective);
  if(url.pathname==='/api/forms')return formsInbox(req,effective.id);
  if(url.pathname==='/api/website-payments')return websitePaymentsRoute(req,env,effective);
  if(url.pathname==='/api/billing')return billingRoute(req,env,effective);
  if(url.pathname==='/api/domains')return domainRoute(req,env,effective);
  if((url.pathname==='/api/admin'||url.pathname==='/api/reminders')&&!isAdmin)return json({error:'Platform administrator access required.'},403);
  if(url.pathname==='/api/reminders')return reminderRoute(req,effective.id);
  const handlers:Record<string,Record<string,unknown>>={'/api/admin':admin,'/api/portal':portal,'/api/site':site,'/api/upload':upload,'/api/site-login':siteLogin};
  const match=url.pathname.match(/^\/media\/([a-zA-Z0-9-]+)$/);if(match&&request.method==='GET')return media.GET(req,{params:Promise.resolve({id:match[1]})});
  const handler=handlers[url.pathname]?.[request.method];
  const customerBody=url.pathname==='/api/admin'&&req.method==='POST'?await req.clone().json() as Record<string,unknown>:null;
  if(customerBody){if(typeof customerBody.action==='string'&&/^[a-z-]{1,50}$/.test(customerBody.action))auditEvent+=' '+customerBody.action;const target=customerBody.id??customerBody.customerId??customerBody.siteId;if(typeof target==='string')auditTarget=target;}
  const response=typeof handler==='function'?await handler(req) as Response:json({error:'Not found.'},404);
  if(response.ok&&customerBody?.action==='customer'&&!customerBody.id){const record=await response.clone().json() as {id:string};const invitation=await inviteCustomer(request,env,p,record.id);const email=await invitation.json() as Record<string,unknown>;return json({...record,...email});}
  return response;
 };
 const response=await run();if(url.pathname!=='/api/security'||!response.ok)await audit(request,env,p,auditEvent,response.ok?'success':'denied_or_failed',response.status,auditTarget);await observeDenial(request,env,p,response.status);return cors(response);
 });}catch(e){if(e instanceof RequestSizeError)return cors(json({error:e.message},413));console.error('Backend request failed',e instanceof Error?e.message:'unknown error');return cors(json({error:'The service is temporarily unavailable.'},503));}
 },scheduled(controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(withBackendEnv(env,async()=>{await sendSecurityAlerts(env);if(new Date(controller.scheduledTime).getUTCMinutes()!==0)return;await Promise.all([sendDueReminders(env),env.DB?.prepare('DELETE FROM login_limits WHERE expires_at < ?').bind(Date.now()).run(),env.DB?.prepare('DELETE FROM form_rate_limits WHERE expires_at < ?').bind(Date.now()).run()]);}));}
};
