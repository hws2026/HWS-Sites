import {CommerceError} from './commerce-utils';
import {database} from '../lib/suite-store';
export type DnsRecord={type:string;name:string;value:string};
export type DnsScan={zone:string;provider:'cloudflare'|'godaddy'|'manual';nameservers:string[];records:DnsRecord[];checkedAt:string};
const clean=(s:string)=>s.toLowerCase().replace(/\.$/,'');
const txt=(s:string)=>s.replace(/"\s*"/g,'').replace(/^"|"$/g,'');
async function query(name:string,type:string){
 const r=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name,type}),{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new CommerceError('DNS scan is temporarily unavailable. Try again.',502);
 const d=await r.json() as {Status:number;Answer?:{name:string;type:number;data:string}[]};
 if(![0,3].includes(d.Status))throw new CommerceError('DNS did not answer reliably. Check the domain’s nameservers and retry.',502);
 return (d.Answer??[]).filter(a=>clean(a.name)===clean(name));
}
export async function scanDns(host:string):Promise<DnsScan>{
 const parts=host.split('.');let zone='',nameservers:string[]=[];
 for(let n=0;n<parts.length-1&&n<8;n++){
  const candidate=parts.slice(n).join('.'),answer=await query(candidate,'NS');
  nameservers=answer.filter(a=>a.type===2).map(a=>clean(a.data));if(nameservers.length){zone=candidate;break;}
 }
 if(!zone)throw new CommerceError('No active DNS nameservers were found for this domain. Activate DNS with your provider, then scan again.',409);
 const results=await Promise.all([query(host,'CNAME'),query(host,'A'),query(host,'AAAA'),query('_hws-verify.'+host,'TXT')]);
 const types:Record<number,string>={1:'A',5:'CNAME',16:'TXT',28:'AAAA'};
 const records=results.flat().filter(a=>types[a.type]).map(a=>({type:types[a.type],name:clean(a.name),value:a.type===16?txt(a.data):clean(a.data)}));
 const provider=nameservers.every(n=>n.endsWith('.ns.cloudflare.com'))?'cloudflare':nameservers.every(n=>n.endsWith('.domaincontrol.com'))?'godaddy':'manual';
 return {zone,provider,nameservers,records,checkedAt:new Date().toISOString()};
}
async function providerRequest(url:string,token:string,method='GET',body?:unknown){
 let r:Response;try{r=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(15000)});}catch{throw new CommerceError('The DNS provider did not confirm the request. Scan again before retrying; any completed records are preserved.',502);}
 const d=await r.json().catch(()=>null) as {success?:boolean;result?:{id:string;name:string;status:string;type:string;content:string}[];result_info?:{total_pages:number};items?:{type:string;name:string;data:string}[];totalPages?:number}|null;
 if(!r.ok||d?.success===false)throw new CommerceError(r.status===401||r.status===403?'The DNS provider rejected this connection. Check that the token belongs to this domain and permits reading and adding DNS records.':`The DNS provider could not complete the request (HTTP ${r.status}). Scan again before retrying.`,502);
 return d;
}
export async function dnsRateLimit(id:string){const hour=Math.floor(Date.now()/3600000);const r=await database().prepare('INSERT INTO form_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind('dns:'+id+':'+hour,(hour+2)*3600000).first<{count:number}>();if((r?.count??61)>60)throw new CommerceError('DNS check limit reached. Try again in an hour.',429);}
export async function insertDns(scan:DnsScan,expected:DnsRecord[],token:unknown){
 if(scan.provider==='manual')throw new CommerceError('This provider has no automatic connector yet. Add the displayed records in its DNS settings, then check the connection.',409);
 if(typeof token!=='string'||!token.trim()||token.length>2000||/[\s\u0000-\u001f]/.test(token.trim()))throw new CommerceError('Enter a valid DNS API token. It is used only for this request.');
 const credential=token.trim(),zone=scan.zone;
 if(!expected.length||expected.some(r=>!['TXT','CNAME'].includes(r.type)||!r.name.endsWith('.'+zone)&&r.name!==zone))throw new CommerceError('A required record is outside this DNS zone. Add it manually with the provider that hosts that record.',409);
 if(scan.provider==='godaddy'&&expected.some(r=>r.type==='CNAME'&&r.name===zone))throw new CommerceError('Use a www address with GoDaddy DNS. This host requires a CNAME; GoDaddy cannot add one at the root of the domain.',409);
 let endpoint='',existing:DnsRecord[]=[];
 if(scan.provider==='cloudflare'){
  const zones=await providerRequest('https://api.cloudflare.com/client/v4/zones?'+new URLSearchParams({name:zone}),credential);
  const found=zones?.result?.filter((z:{id:string;name:string;status:string})=>z.name===zone&&z.status==='active');if(found?.length!==1||!/^\w{32}$/.test(found[0].id))throw new CommerceError('The token must have Zone: Read and DNS: Edit access to this active Cloudflare zone.',403);
  endpoint='https://api.cloudflare.com/client/v4/zones/'+found[0].id+'/dns_records';
  for(const name of new Set(expected.map(r=>r.name))){
   const d=await providerRequest(endpoint+'?'+new URLSearchParams({name,per_page:'100'}),credential);
   if(!Array.isArray(d?.result)||d.result.length>=100||(d.result_info?.total_pages??1)>1)throw new CommerceError('Too many records share this name. Review this domain in your DNS provider before connecting.',409);
   existing.push(...d.result.map((r:{type:string;name:string;content:string})=>({type:r.type,name:clean(r.name),value:r.type==='TXT'?txt(r.content):clean(r.content)})));
  }
 }else{
  endpoint='https://api.godaddy.com/v3/domains/zones/'+encodeURIComponent(zone)+'/dns-records';
  for(const name of new Set(expected.map(r=>r.name))){
   const relative=name===zone?'@':name.slice(0,-zone.length-1);
   const d=await providerRequest(endpoint+'?'+new URLSearchParams({name:relative,pageSize:'100',totalRequired:'true'}),credential);
   if(!Array.isArray(d?.items)||d.items.length>=100||(d.totalPages??1)>1)throw new CommerceError('The DNS provider returned an incomplete record list. Review this domain in GoDaddy before connecting.',409);
   existing.push(...d.items.map((r:{type:string;name:string;data:string})=>({type:r.type,name:r.name==='@'?zone:clean(r.name)+'.'+zone,value:r.type==='TXT'?txt(r.data):clean(r.data)})));
  }
 }
 // Preflight every record before any mutation. Never replace an existing destination or mail record.
 const missing=expected.filter(r=>!existing.some(e=>e.type===r.type&&e.name===r.name&&e.value===r.value));
 for(const r of missing){const conflicts=existing.filter(e=>e.name===r.name&&(r.type==='CNAME'?!['NS','SOA'].includes(e.type):e.type==='CNAME'));
  if(conflicts.length)throw new CommerceError('Conflicting '+[...new Set(conflicts.map(c=>c.type))].join(', ')+' records exist at '+r.name+'. Review and remove only the old website records in your DNS provider, then retry. Nothing was changed.',409);
 }
 let added=0;
 for(const r of missing){
  await providerRequest(endpoint,credential,'POST',scan.provider==='cloudflare'?{type:r.type,name:r.name,content:r.value,ttl:300,...(r.type==='CNAME'?{proxied:false}:{})}:{type:r.type,name:r.name===zone?'@':r.name.slice(0,-zone.length-1),data:r.value,ttl:600});added++;
 }
 return {added,existing:expected.length-added,message:added?'DNS records added. Propagation and the HTTPS certificate are still being checked.':'The required DNS records are already present. Check the connection for certificate status.'};
}
