import {scanDns,dnsRateLimit} from './dns-connect';
import {database,logStatement,sitePermission,visibleSites,siteScope} from '../lib/suite-store';
import {body,CommerceError,failure,field,json,type CommerceUser} from './commerce-utils';

export type DomainEnv={FRONTEND_URL?:string;CUSTOM_DOMAIN_ACCOUNT_ID?:string;CUSTOM_DOMAIN_PROJECT?:string;CUSTOM_DOMAIN_TARGET?:string;CLOUDFLARE_PAGES_TOKEN?:string};
type Domain={id:string;site_id:string;owner:string;hostname:string;verification_token:string;status:string;cloudflare_id:string|null};
type PagesDomain={id:string;name:string;status:string;validation_data?:{status:string;method?:string;txt_name?:string;txt_value?:string;error_message?:string};verification_data?:{status:string;error_message?:string}};
const configured=(env:DomainEnv)=>Boolean(env.CUSTOM_DOMAIN_ACCOUNT_ID&&env.CUSTOM_DOMAIN_PROJECT&&env.CUSTOM_DOMAIN_TARGET&&env.CLOUDFLARE_PAGES_TOKEN);
export async function removeCustomerHostname(env:DomainEnv,host:string){await cf(env,'/'+encodeURIComponent(host),'DELETE');}
export function hostname(value:unknown){const raw=field(value,253).toLowerCase().replace(/\.$/,'');if(!/^[a-z0-9.-]+$/.test(raw)||raw.length>253||!raw.includes('.')||!/[a-z]/.test(raw.split('.').at(-1)!)||raw.split('.').some(label=>!/^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])$/.test(label))||/\.(localhost|local|internal|test|invalid|example)$/.test(raw))throw new CommerceError('Enter a domain such as www.yourschool.org, without https://, a port, or a path.');return raw;}
async function canManage(siteId:string,user:CommerceUser){const access=await sitePermission(siteId,user.id);if(!access||access.row.archived||access.role!=='admin')throw new CommerceError('Website not found or domain access is unavailable.',404);return access;}
async function cf<T>(env:DomainEnv,path:string,method='GET',payload?:unknown):Promise<T>{
 if(!configured(env))throw new CommerceError('Customer domain hosting needs its free Cloudflare Pages project and API connection configured by the administrator.',503);
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(env.CUSTOM_DOMAIN_ACCOUNT_ID!)+'/pages/projects/'+encodeURIComponent(env.CUSTOM_DOMAIN_PROJECT!)+'/domains';
 const response=await fetch(endpoint+path,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_PAGES_TOKEN!.trim(),'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});
 if(response.status===404&&method==='DELETE')return {} as T;
 if(response.status===404&&method==='GET')return null as T;
 const data=await response.json().catch(()=>null) as {success:boolean;result:T;errors?:{code?:number}[]}|null;
 if(!response.ok||!data?.success){
  // Only expose numeric diagnostics, never provider text that could echo credentials.
  const codes=(data?.errors??[]).map(error=>error.code).filter(code=>Number.isSafeInteger(code)).slice(0,5);
  const detail=' (HTTP '+response.status+(codes.length?'; Cloudflare code '+codes.join(', '):'')+').';
  const message=response.status===401||response.status===403||codes.some(code=>code===9106||code===10000)?'Cloudflare rejected the saved API token. The administrator must replace CLOUDFLARE_PAGES_TOKEN with a valid token that has Cloudflare Pages: Edit access to this account':response.status===429?'Cloudflare is limiting domain requests. Wait briefly and check again':'Cloudflare rejected the domain '+(method==='GET'?'status check':method==='POST'?'connection':'removal')+'. Ask the administrator to check the Pages connection';
  throw new CommerceError(message+detail,502);
 }
 return data.result;
}
async function verify(d:Domain,env:DomainEnv){
 if(d.status==='disconnected')throw new CommerceError('Remove this disconnected domain before adding it again.',409);
 const db=database(),now=new Date().toISOString();
 const response=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:'_hws-verify.'+d.hostname,type:'TXT'}),{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new CommerceError('DNS lookup is unavailable. Try again shortly.',502);
 const dns=await response.json() as {Status:number;Answer?:{type:number;data:string}[]};
 const verified=dns.Status===0&&dns.Answer?.some(r=>r.type===16&&r.data.replace(/"\s*"/g,'').replace(/^"|"$/g,'')==='hws-verification='+d.verification_token);
 if(!verified){await db.prepare("UPDATE site_domains SET status='pending_dns',checked_at=?,last_error=? WHERE id=? AND status!='disconnected'").bind(now,'The ownership TXT record was not found yet. DNS changes can take time.',d.id).run();return;}
 await db.prepare("UPDATE site_domains SET verified_at=?,checked_at=?,status=CASE WHEN status='active' THEN status ELSE 'verified' END,last_error=NULL WHERE id=? AND status!='disconnected'").bind(now,now,d.id).run();
 if(!configured(env))return;
 let record=await cf<PagesDomain|null>(env,'/'+encodeURIComponent(d.hostname));
 if(!record){
  const all=await cf<PagesDomain[]>(env,'');
  if(all.length>=100)throw new CommerceError('The free hosting project has reached 100 connected domains. Remove an unused domain before adding another. No paid upgrade will be started.',409);
  record=await cf<PagesDomain>(env,'','POST',{name:d.hostname});
 }
 if(record.name!==d.hostname)throw new CommerceError('The provider returned a different hostname.',502);
 const active=record.status==='active',validation=record.validation_data;
 const records=validation?.txt_name&&validation.txt_value?[{type:'TXT',name:validation.txt_name,value:validation.txt_value}]:[];
 const error=[validation?.error_message,record.verification_data?.error_message].filter(Boolean).join(' ').slice(0,500)||null;
 await db.prepare("UPDATE site_domains SET cloudflare_id=?,status=?,hostname_status=?,ssl_status=?,validation_records=?,last_error=?,checked_at=? WHERE id=? AND status!='disconnected'").bind(record.name,active?'active':'pending_ssl',record.status,active?'active':validation?.status??'pending',JSON.stringify(records),error,now,d.id).run();

}
export async function domainRoute(request:Request,env:DomainEnv,user:CommerceUser){try{
 const db=database();if(request.method==='GET'){
  const scope=await siteScope(user.id),visible=await visibleSites(user.id);
  const sites=visible.map(s=>({...s,can_manage:Number(s.role==='admin'),can_publish:Number(s.role==='admin')}));
  const domains=await db.prepare(`SELECT d.id,d.site_id,d.hostname,d.status,d.verification_token,d.is_primary,d.verified_at,d.ssl_status,d.hostname_status,d.validation_records,d.last_error,d.checked_at FROM site_domains d JOIN client_sites s ON s.id=d.site_id WHERE s.archived=0 AND ${scope.sql} ORDER BY d.created_at`).bind(...scope.args).all();
  return json({sites,domains:domains.results,configured:configured(env),target:env.CUSTOM_DOMAIN_TARGET??'',admin:user.isAdmin});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);const input=await body(request),action=input.action;
 if(action==='add'||action==='publication'){
  const siteId=field(input.siteId),access=await canManage(siteId,user);
  if(action==='publication'){if(access.role!=='admin')throw new CommerceError('Only the website administrator can enable public access.',403);if(typeof input.enabled!=='boolean')throw new CommerceError('Choose whether public access is enabled.');if(input.enabled&&!access.row.published)throw new CommerceError('Publish a website version in the editor first.',409);await db.prepare('INSERT INTO site_publications (site_id,owner,enabled) VALUES (?,?,?) ON CONFLICT(site_id) DO UPDATE SET enabled=excluded.enabled').bind(siteId,access.row.owner,input.enabled?1:0).run();await logStatement(access.row.owner,(input.enabled?'Enabled':'Disabled')+' public domain access',siteId).run();return json({ok:true});}
  const host=hostname(input.hostname);if(host===new URL(env.FRONTEND_URL!).hostname||host===env.CUSTOM_DOMAIN_TARGET||host.endsWith('.workers.dev')||host.endsWith('.github.io')||host.endsWith('.pages.dev'))throw new CommerceError('Use a domain you own, separate from the platform hosting address.');
  if(await db.prepare('SELECT id FROM site_domains WHERE hostname=?').bind(host).first())throw new CommerceError('This domain is already connected or awaiting verification.',409);
  const count=await db.prepare('SELECT count(*) n FROM site_domains WHERE site_id=?').bind(siteId).first<{n:number}>();if((count?.n??0)>=10)throw new CommerceError('A website can have up to 10 connected domains.');
  const id=crypto.randomUUID();await db.prepare('INSERT INTO site_domains (id,site_id,owner,hostname,verification_token,created_at) VALUES (?,?,?,?,?,?)').bind(id,siteId,access.row.owner,host,crypto.randomUUID(),new Date().toISOString()).run();await logStatement(access.row.owner,'Added domain '+host,siteId).run();return json({ok:true,id});
 }
 const d=await db.prepare('SELECT * FROM site_domains WHERE id=?').bind(field(input.id)).first<Domain>();if(!d)throw new CommerceError('Domain not found.',404);await canManage(d.site_id,user);
 if(action==='scan'){
  if(d.status==='disconnected')throw new CommerceError('Add this domain again before checking DNS.',409);
  await dnsRateLimit(d.id);return json({scan:await scanDns(d.hostname)});
 }
 if(action==='connect-dns'||action==='start-provider-connection')throw new CommerceError('Automatic DNS configuration has been removed. Add the displayed records in your provider’s DNS settings, then check the connection.',410);
 if(action==='verify'){try{await verify(d,env);}catch(error){await db.prepare('UPDATE site_domains SET last_error=?,checked_at=? WHERE id=?').bind(error instanceof CommerceError?error.message:'Verification could not be completed.',new Date().toISOString(),d.id).run();throw error;}return json({ok:true});}
 if(action==='primary'){if(d.status!=='active')throw new CommerceError('Connect and verify this domain first.',409);await db.batch([db.prepare('UPDATE site_domains SET is_primary=0 WHERE site_id=?').bind(d.site_id),db.prepare("UPDATE site_domains SET is_primary=1 WHERE id=? AND status='active'").bind(d.id)]);return json({ok:true});}
 if(action==='remove'){
  // Stop serving immediately even when provider cleanup needs a retry.
  await db.prepare("UPDATE site_domains SET status='disconnected',is_primary=0 WHERE id=?").bind(d.id).run();
  if(d.cloudflare_id)await removeCustomerHostname(env,d.hostname);
  await db.prepare('DELETE FROM site_domains WHERE id=?').bind(d.id).run();await logStatement(d.owner,'Disconnected domain '+d.hostname,d.site_id).run();return json({ok:true});
 }
 throw new CommerceError('Unknown domain action.');
 }catch(error){return failure(error);}}
