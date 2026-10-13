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
export type Env=BackendEnv & BillingEnv & DomainEnv & {SUPABASE_URL:string;SUPABASE_PUBLISHABLE_KEY:string;ADMIN_SUPABASE_USER_IDS:string;RESEND_API_KEY?:string;EMAIL_FROM?:string};
const json=(data:unknown,status=200)=>Response.json(data,{status});
export async function authenticate(request:Request,env:Env,fetcher:typeof fetch=fetch){const bearer=request.headers.get('authorization');if(!bearer||!/^Bearer [\w.-]+$/.test(bearer))return null;const result=await fetcher(env.SUPABASE_URL+'/auth/v1/user',{headers:{Authorization:bearer,apikey:env.SUPABASE_PUBLISHABLE_KEY}});if(!result.ok)return null;const user=await result.json() as {id?:string;email?:string;email_confirmed_at?:string};return user.id&&user.email&&user.email_confirmed_at?{id:user.id,email:user.email.toLowerCase()}:null;}
export default {
 async fetch(request:Request,env:Env){const origin=request.headers.get('origin');const allowed=env.FRONTEND_URL?new URL(env.FRONTEND_URL).origin:'';const cors=(response:Response)=>{const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');if(origin===allowed){headers.set('Access-Control-Allow-Origin',allowed);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');}return new Response(response.body,{status:response.status,headers});};
 const url=new URL(request.url);
 if(url.pathname==='/api/stripe/webhook')return withBackendEnv(env,()=>stripeWebhook(request,env));
 try{const visitor=await withBackendEnv(env,()=>publicSite(request,env));if(visitor)return visitor;}catch(error){console.error('Public routing unavailable',error instanceof Error?error.message:'Unknown failure');return cors(json({error:'Website service unavailable.'},503));}
 if(origin&&origin!==allowed)return cors(json({error:'This origin is not allowed.'},403));if(request.method==='OPTIONS')return cors(new Response(null,{status:204}));
 if(url.pathname==='/api/published'&&request.method==='GET')return withBackendEnv(env,async()=>{const snapshot=await publicSnapshot(url.searchParams.get('id')??'');return cors(snapshot?json({site:snapshot}):json({error:'This website is unpublished or unavailable.'},404));});
 if(url.pathname==='/health')return cors(json({ok:true,authentication:'supabase'}));
 if(url.pathname==='/api/site-login'&&request.method==='GET'){try{const req=request as NextRequest;Object.defineProperty(req,'nextUrl',{value:url});return cors(await withBackendEnv(env,()=>siteLogin.GET(req)));}catch{return cors(json({site:null,error:'Website unavailable.'},503));}}
 try{if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.ADMIN_SUPABASE_USER_IDS)return cors(json({error:'Backend authentication has not been configured.'},503));const user=await authenticate(request,env);if(!user)return cors(json({error:'Sign in to continue.'},401));const isAdmin=env.ADMIN_SUPABASE_USER_IDS.split(',').map(s=>s.trim()).includes(user.id);
 // Never accept identity headers supplied by a browser. Shared handlers see only verified identity.
 const headers=new Headers(request.headers);headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');headers.set('oai-authenticated-user-id',user.id);headers.set('oai-authenticated-user-email',user.email);const req=new Request(request,{headers}) as NextRequest;Object.defineProperty(req,'nextUrl',{value:url});
 return await withBackendEnv(env,async()=>{if(url.pathname==='/api/forms')return cors(await formsInbox(req,user.id));if(url.pathname==='/api/billing')return cors(await billingRoute(req,env,{...user,isAdmin}));if(url.pathname==='/api/domains')return cors(await domainRoute(req,env,{...user,isAdmin}));if((url.pathname==='/api/admin'||url.pathname==='/api/reminders')&&!isAdmin)return cors(json({error:'Platform administrator access required.'},403));if(url.pathname==='/api/me')return cors(json({email:user.email,role:isAdmin?'admin':'customer'}));if(url.pathname==='/api/reminders')return cors(await reminderRoute(req,user.id));
 const handlers:Record<string,Record<string,unknown>>={'/api/admin':admin,'/api/portal':portal,'/api/site':site,'/api/upload':upload,'/api/site-login':siteLogin};const match=url.pathname.match(/^\/media\/([a-zA-Z0-9-]+)$/);if(match&&request.method==='GET')return cors(await media.GET(req,{params:Promise.resolve({id:match[1]})}));const handler=handlers[url.pathname]?.[request.method];return cors(typeof handler==='function'?await handler(req):json({error:'Not found.'},404));});}catch(e){console.error('Backend request failed',e instanceof Error?e.message:'unknown error');return cors(json({error:'The service is temporarily unavailable.'},503));}
 },scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(withBackendEnv(env,()=>Promise.all([sendDueReminders(env),env.DB?.prepare('DELETE FROM form_rate_limits WHERE expires_at < ?').bind(Date.now()).run()])));}
};
