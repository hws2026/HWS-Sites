import {CommerceError} from './commerce-utils';
import {database} from '../lib/suite-store';
export type DnsRecord={type:string;name:string;value:string};
export type DnsScan={zone:string;provider:'cloudflare'|'godaddy'|'manual';providerName?:string;nameservers:string[];records:DnsRecord[];checkedAt:string};
const clean=(s:string)=>s.toLowerCase().replace(/\.$/,'');
const txt=(s:string)=>s.replace(/"\s*"/g,'').replace(/^"|"$/g,'');
export async function dnsQuery(name:string,type:string){
 const r=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name,type}),{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new CommerceError('DNS scan is temporarily unavailable. Try again.',502);
 const d=await r.json() as {Status:number;Answer?:{name:string;type:number;data:string}[]};
 if(![0,3].includes(d.Status))throw new CommerceError('DNS did not answer reliably. Check the domain’s nameservers and retry.',502);
 return (d.Answer??[]).filter(a=>clean(a.name)===clean(name));
}
const query=dnsQuery;
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
 const names:[string,RegExp][]=[['Cloudflare',/\.ns\.cloudflare\.com$/],['GoDaddy',/\.domaincontrol\.com$/],['IONOS',/\.ui-dns\.(com|de|org|biz)$/],['Wix',/\.wixdns\.net$/],['Namecheap',/\.registrar-servers\.com$/],['Hostinger',/\.dns-parking\.com$/],['Bluehost',/\.bluehost\.com$/],['Porkbun',/\.ns\.porkbun\.com$/],['WordPress.com',/\.wordpress\.com$/]];
 const providerName=names.find(([,pattern])=>nameservers.every(n=>pattern.test(n)))?.[0];
 return {zone,provider,providerName,nameservers,records,checkedAt:new Date().toISOString()};
}
export async function dnsRateLimit(id:string){const hour=Math.floor(Date.now()/3600000);const r=await database().prepare('INSERT INTO form_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind('dns:'+id+':'+hour,(hour+2)*3600000).first<{count:number}>();if((r?.count??61)>60)throw new CommerceError('DNS check limit reached. Try again in an hour.',429);}
