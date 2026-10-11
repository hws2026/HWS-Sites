import {database,logStatement,sitePermission} from '../lib/suite-store';
import {body,CommerceError,failure,field,json,type CommerceUser} from './commerce-utils';

export type DomainEnv={FRONTEND_URL?:string;CUSTOM_DOMAIN_ZONE_ID?:string;CUSTOM_DOMAIN_TARGET?:string;CLOUDFLARE_SAAS_TOKEN?:string};
type Domain={id:string;site_id:string;owner:string;hostname:string;verification_token:string;status:string;cloudflare_id:string|null};
type CFHostname={id:string;hostname:string;status:string;ownership_verification?:{type:string;name:string;value:string};ssl?:{status:string;validation_records?:{txt_name?:string;txt_value?:string;http_url?:string;http_body?:string}[];validation_errors?:{message:string}[]}};
const configured=(env:DomainEnv)=>Boolean(env.CUSTOM_DOMAIN_ZONE_ID&&env.CUSTOM_DOMAIN_TARGET&&env.CLOUDFLARE_SAAS_TOKEN);
export function hostname(value:unknown){const raw=field(value,253).toLowerCase().replace(/\.$/,'');if(!/^[a-z0-9.-]+$/.test(raw)||raw.length>253||!raw.includes('.')||!/[a-z]/.test(raw.split('.').at(-1)!)||raw.split('.').some(label=>!/^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])$/.test(label))||/\.(localhost|local|internal|test|invalid|example)$/.test(raw))throw new CommerceError('Enter a domain such as www.yourschool.org, without https://, a port, or a path.');return raw;}
async function canManage(siteId:string,user:CommerceUser){const access=await sitePermission(siteId,user.id);if(!access||access.row.archived||access.role==='viewer')throw new CommerceError('Website not found or domain access is unavailable.',404);return access;}
async function cf<T>(env:DomainEnv,path:string,method='GET',payload?:unknown):Promise<T>{if(!configured(env))throw new CommerceError('Custom-domain hosting has not been configured by the platform administrator.',503);const response=await fetch('https://api.cloudflare.com/client/v4/zones/'+encodeURIComponent(env.CUSTOM_DOMAIN_ZONE_ID!)+'/custom_hostnames'+path,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_SAAS_TOKEN,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});if(response.status===404&&method==='DELETE')return {} as T;const data=await response.json() as {success:boolean;result:T};if(!response.ok||!data.success)throw new CommerceError('The hosting provider could not update this domain. Check the hosting configuration and try again.',502);return data.result;}
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
 let record:CFHostname;
 if(d.cloudflare_id)record=await cf<CFHostname>(env,'/'+encodeURIComponent(d.cloudflare_id));
 else{const existing=await cf<CFHostname[]>(env,'?'+new URLSearchParams({hostname:d.hostname}));record=existing.find(item=>item.hostname===d.hostname)??await cf<CFHostname>(env,'','POST',{hostname:d.hostname,ssl:{method:'txt',type:'dv',settings:{min_tls_version:'1.2'}}});await db.prepare('UPDATE site_domains SET cloudflare_id=? WHERE id=?').bind(record.id,d.id).run();}
 if(record.hostname!==d.hostname)throw new CommerceError('The provider returned a different hostname.',502);
 const records:{type:string;name:string;value:string}[]=[];
 if(record.ownership_verification?.type==='txt')records.push({type:'TXT',name:record.ownership_verification.name,value:record.ownership_verification.value});
 for(const r of record.ssl?.validation_records??[])if(r.txt_name&&r.txt_value)records.push({type:'TXT',name:r.txt_name,value:r.txt_value});
 const active=record.status==='active'&&record.ssl?.status==='active';
 await db.prepare("UPDATE site_domains SET status=?,hostname_status=?,ssl_status=?,validation_records=?,last_error=?,checked_at=? WHERE id=? AND status!='disconnected'").bind(active?'active':'pending_ssl',record.status,record.ssl?.status??'pending',JSON.stringify(records),record.ssl?.validation_errors?.map(e=>e.message).join(' ').slice(0,500)??null,now,d.id).run();
}
export async function domainRoute(request:Request,env:DomainEnv,user:CommerceUser){try{
 const db=database();if(request.method==='GET'){
  const sites=await db.prepare('SELECT s.id,s.title,COALESCE(p.enabled,0) enabled,(s.published IS NOT NULL) is_published,(s.owner=? OR a.role IN (\'admin\',\'editor\')) can_manage,(s.owner=?) can_publish FROM client_sites s LEFT JOIN site_publications p ON p.site_id=s.id LEFT JOIN site_access a ON a.site_id=s.id AND a.user_id=? WHERE s.archived=0 AND (s.owner=? OR a.user_id=?) GROUP BY s.id ORDER BY s.title').bind(user.id,user.id,user.id,user.id,user.id).all();
  const domains=await db.prepare('SELECT d.id,d.site_id,d.hostname,d.status,d.verification_token,d.is_primary,d.verified_at,d.ssl_status,d.hostname_status,d.validation_records,d.last_error,d.checked_at FROM site_domains d JOIN client_sites s ON s.id=d.site_id WHERE s.archived=0 AND (s.owner=? OR EXISTS (SELECT 1 FROM site_access a WHERE a.site_id=s.id AND a.user_id=?)) ORDER BY d.created_at').bind(user.id,user.id).all();
  return json({sites:sites.results,domains:domains.results,configured:configured(env),target:env.CUSTOM_DOMAIN_TARGET??'',admin:user.isAdmin});
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
 if(action==='verify'){try{await verify(d,env);}catch(error){await db.prepare('UPDATE site_domains SET last_error=?,checked_at=? WHERE id=?').bind(error instanceof CommerceError?error.message:'Verification could not be completed.',new Date().toISOString(),d.id).run();throw error;}return json({ok:true});}
 if(action==='primary'){if(d.status!=='active')throw new CommerceError('Connect and verify this domain first.',409);await db.batch([db.prepare('UPDATE site_domains SET is_primary=0 WHERE site_id=?').bind(d.site_id),db.prepare("UPDATE site_domains SET is_primary=1 WHERE id=? AND status='active'").bind(d.id)]);return json({ok:true});}
 if(action==='remove'){
  // Stop serving immediately even when provider cleanup needs a retry.
  await db.prepare("UPDATE site_domains SET status='disconnected',is_primary=0 WHERE id=?").bind(d.id).run();
  if(d.cloudflare_id)await cf(env,'/'+encodeURIComponent(d.cloudflare_id),'DELETE');
  await db.prepare('DELETE FROM site_domains WHERE id=?').bind(d.id).run();await logStatement(d.owner,'Disconnected domain '+d.hostname,d.site_id).run();return json({ok:true});
 }
 throw new CommerceError('Unknown domain action.');
 }catch(error){return failure(error);}}
