import {database,visibleSites} from '../lib/suite-store';
import {boundedBytes,RequestSizeError} from '../lib/request-size';
import {honeyBookUrl,type HoneyBookPaymentDetails,type HoneyBookConnection} from '../lib/honeybook-model';
import {audit,digest,json,now,seal,unseal,type Principal} from './security';
import {CommerceError,failure} from './commerce-utils';
import type {Env} from './worker';

type Site={id:string;title:string;customer_id:string;owner:string};
type Connection=HoneyBookConnection&{owner:string;customer_id:string;token_hash:string};
type PaymentRow={id:string;site_id:string;source:'manual'|'automation';payload:string;voided:number;created_at:string};
function text(value:unknown,name:string,max=160,required=false){if(value===undefined||value===null){if(required)throw new CommerceError(name+' is required.');return '';}if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw new CommerceError('Check '+name+'.');const result=value.trim();if(required&&!result)throw new CommerceError(name+' is required.');return result;}
async function input(request:Request){let bytes:Uint8Array;try{bytes=await boundedBytes(request,16000);}catch(e){if(e instanceof RequestSizeError)throw new CommerceError('Request is too large. Maximum: 16 KB.',413);throw e;}try{const b=JSON.parse(new TextDecoder().decode(bytes));if(!b||Array.isArray(b)||typeof b!=='object')throw new Error();return b as Record<string,unknown>;}catch{throw new CommerceError('Send a JSON object.');}}
async function sitesFor(p:Principal){
 if(!['owner','admin','billing','customer'].includes(p.role))throw new CommerceError('Website billing access required.',403);
 // Editing content does not grant access to payer details or sync credentials.
 const available=await visibleSites(p.id);
 return (await Promise.all(available.filter(s=>s.role==='admin').map(async s=>({id:s.id,title:s.title,customer_id:s.customer_id,owner:(await database().prepare('SELECT owner FROM client_sites WHERE id=?').bind(s.id).first<{owner:string}>())!.owner}))));
}
function selectedSite(sites:Site[],value:unknown){const site=sites.find(s=>s.id===value);if(!site)throw new CommerceError('Website billing access denied.',403);return site;}
function paymentDetails(b:Record<string,unknown>):HoneyBookPaymentDetails {
 const paymentId=text(b.paymentId,'HoneyBook payment ID',200,true),label=text(b.label,'Payment label',160,true);
 // The integration contract uses major units, never guesses whether an integer is cents.
 const amountText=typeof b.amount==='number'?String(b.amount):b.amount;
 if(typeof amountText!=='string'||!/^\d{1,7}(?:\.\d{1,2})?$/.test(amountText.trim()))throw new CommerceError('Enter the payment amount in dollars, for example 125.00.');
 const [whole,fraction='']=amountText.trim().split('.'),amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999)throw new CommerceError('Payment amount must be between 0.01 and 9,999,999.99.');
 if(b.currency!=='USD'&&b.currency!=='CAD')throw new CommerceError('Choose USD or CAD.');
 const date=text(b.paidAt,'Payment date',50,true);
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(date)||!Number.isFinite(Date.parse(date))||Date.parse(date)>Date.now()+300000)throw new CommerceError('Use the actual payment date in ISO format with a time zone.');
 const clientEmail=text(b.clientEmail,'Client email',254);if(clientEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))throw new CommerceError('Check the client email.');
 const rawUrl=text(b.invoiceUrl,'Invoice URL',2000),invoiceUrl=rawUrl?honeyBookUrl(rawUrl):'';if(rawUrl&&!invoiceUrl)throw new CommerceError('Use an HTTPS invoice link on honeybook.com or hbportal.co.');
 return {paymentId,label,amount,currency:b.currency,paidAt:new Date(date).toISOString(),clientName:text(b.clientName,'Client name'),clientEmail,project:text(b.project,'Project'),invoiceUrl:invoiceUrl||''};
}
function sameHash(a:string,b:string){if(a.length!==b.length)return false;let difference=0;for(let n=0;n<a.length;n++)difference|=a.charCodeAt(n)^b.charCodeAt(n);return difference===0;}
async function limit(siteId:string){const bucket=Math.floor(Date.now()/3600000);const row=await database().prepare('INSERT INTO form_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(siteId+':honeybook:'+bucket,(bucket+2)*3600000).first<{count:number}>();if((row?.count??1001)>1000)throw new CommerceError('Too many sync requests. Retry in one hour.',429);}

async function recordPayment(env:Env,site:Site,details:HoneyBookPaymentDetails,source:'manual'|'automation',connection?:Connection){
 const db=database(),key=await digest(site.id+':'+details.paymentId),id=crypto.randomUUID(),at=now();
 const existing=await db.prepare('SELECT id,payload,voided FROM honeybook_payments WHERE site_id=? AND payment_key=?').bind(site.id,key).first<{id:string;payload:string;voided:number}>();
 if(existing){const old=await unseal<HoneyBookPaymentDetails>(env,existing.payload,'honeybook-payment:'+existing.id);if(old.amount!==details.amount||old.currency!==details.currency)throw new CommerceError('This payment ID already has a different amount or currency. Review it in HoneyBook; it was not overwritten.',409);return {id:existing.id,duplicate:true};}
 const payload=await seal(env,details,'honeybook-payment:'+id);
 const conditions=connection?' AND EXISTS (SELECT 1 FROM honeybook_connections hc WHERE hc.site_id=s.id AND hc.id=? AND hc.enabled=1 AND hc.token_hash=?)':'';
 // Recheck ownership, archival, and credentials in the write itself to close revocation races.
 const result=await db.prepare(`INSERT OR IGNORE INTO honeybook_payments (id,owner,customer_id,site_id,payment_key,source,payload,created_at) SELECT ?,s.owner,s.customer_id,s.id,?,?,?,? FROM client_sites s LEFT JOIN customers c ON c.id=s.customer_id AND c.owner=s.owner WHERE s.id=? AND s.owner=? AND s.customer_id=? AND s.archived=0 AND (s.customer_id='' OR c.archived=0)${conditions}`).bind(id,key,source,payload,at,site.id,site.owner,site.customer_id,...(connection?[connection.id,connection.token_hash]:[])).run();
 if(!result.meta.changes){const duplicate=await db.prepare('SELECT id,payload FROM honeybook_payments WHERE site_id=? AND payment_key=?').bind(site.id,key).first<{id:string;payload:string}>();if(!duplicate)throw new CommerceError('The website or connection changed. Refresh before retrying.',409);const old=await unseal<HoneyBookPaymentDetails>(env,duplicate.payload,'honeybook-payment:'+duplicate.id);if(old.amount!==details.amount||old.currency!==details.currency)throw new CommerceError('This payment ID already has a different amount or currency.',409);return {id:duplicate.id,duplicate:true};}
 return {id,duplicate:false};
}

export async function honeybook(request:Request,env:Env,p:Principal){try{
 if(!env.HWS_DATA_KEY)throw new CommerceError('Encrypted billing storage must be configured first.',503);
 const db=database(),url=new URL(request.url),sites=await sitesFor(p);
 if(request.method==='GET'){
  const siteId=url.searchParams.get('siteId');const filtered=siteId?[selectedSite(sites,siteId)]:sites.slice(0,1);
  if(!filtered.length)return json({sites:[],links:[],connections:[],payments:[],next:null});
  const ids=filtered.map(s=>s.id),slots=ids.map(()=>'?').join(',');
  const [links,connections]=await Promise.all([
   db.prepare(`SELECT id,site_id,url,enabled,kind,created_at FROM honeybook_links WHERE site_id IN (${slots}) ORDER BY created_at DESC,id DESC`).bind(...ids).all<{id:string;site_id:string;url:string;enabled:number;kind:string;created_at:string}>(),
   db.prepare(`SELECT id,site_id,enabled,last_received_at,last_test_at,created_at FROM honeybook_connections WHERE site_id IN (${slots})`).bind(...ids).all(),
  ]);
  const cursor=url.searchParams.get('before');let before='9999',beforeId='~';if(cursor){const parts=cursor.split('|');if(parts.length!==2||!Number.isFinite(Date.parse(parts[0]))||!/^[a-f0-9-]{36}$/.test(parts[1]))throw new CommerceError('Invalid payment history cursor.');[before,beforeId]=parts;}
  const payments=await db.prepare(`SELECT id,site_id,source,payload,voided,created_at FROM honeybook_payments WHERE site_id IN (${slots}) AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 101`).bind(...ids,before,before,beforeId).all<PaymentRow>();
  const rows=payments.results.slice(0,100),last=rows.at(-1);
  return json({sites:sites.map(({owner,...s})=>s),links:await Promise.all(links.results.map(async ({url,...row})=>({...row,...await unseal<{label:string;url:string}>(env,url,'honeybook:'+row.id)}))),connections:connections.results,payments:await Promise.all(rows.map(async ({payload,...row})=>({...row,...await unseal<HoneyBookPaymentDetails>(env,payload,'honeybook-payment:'+row.id)}))),next:payments.results.length>100&&last?last.created_at+'|'+last.id:null});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const b=await input(request),site=selectedSite(sites,b.siteId),action=b.action??'save-link';
 if(action==='connect'||action==='rotate'){
  if(b.confirmation!=='CONNECT PAYMENT SYNC')throw new CommerceError('Confirm that this key will allow your automation to submit payment records.');
  const existing=await db.prepare('SELECT id FROM honeybook_connections WHERE site_id=?').bind(site.id).first<{id:string}>();
  const id=existing?.id??crypto.randomUUID(),token='hws_hb_'+Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  await db.prepare('INSERT INTO honeybook_connections (id,site_id,owner,customer_id,token_hash,enabled,created_at) VALUES (?,?,?,?,?,1,?) ON CONFLICT(site_id) DO UPDATE SET token_hash=excluded.token_hash,enabled=1,last_test_at=NULL').bind(id,site.id,site.owner,site.customer_id,await digest(token),now()).run();
  await audit(request,env,p,'honeybook.connection.'+(existing?'rotate':'create'),'success',200,site.id);
  return json({ok:true,token,endpoint:url.origin+'/api/honeybook/events/'+id,message:'Copy this key now. It is shown once. Any previous key is invalid.'});
 }
 if(action==='disconnect'){
  await db.prepare("UPDATE honeybook_connections SET enabled=0,token_hash='' WHERE site_id=? AND owner=?").bind(site.id,site.owner).run();await audit(request,env,p,'honeybook.connection.disconnect','success',200,site.id);return json({ok:true});
 }
 if(action==='record-payment'){
  const result=await recordPayment(env,site,paymentDetails(b),'manual');if(!result.duplicate)await audit(request,env,p,'honeybook.payment.manual','success',200,result.id);return json({ok:true,...result});
 }
 if(action==='void-payment'){
  if(b.confirmation!=='VOID MANUAL RECORD')throw new CommerceError('Confirm that this only voids the suite record, not a payment or refund in HoneyBook.');
  const result=await db.prepare("UPDATE honeybook_payments SET voided=1,payment_key='void:'||id WHERE id=? AND site_id=? AND source='manual' AND voided=0").bind(text(b.id,'Payment ID',100,true),site.id).run();if(!result.meta.changes)throw new CommerceError('Only an active manually entered record can be voided.',409);await audit(request,env,p,'honeybook.payment.void','success',200,String(b.id));return json({ok:true});
 }
 if(action==='toggle'){
  if(typeof b.enabled!=='boolean')throw new CommerceError('Choose whether the link is enabled.');const result=await db.prepare('UPDATE honeybook_links SET enabled=? WHERE id=? AND site_id=? AND owner=?').bind(Number(b.enabled),text(b.id,'Link ID',100,true),site.id,site.owner).run();if(!result.meta.changes)throw new CommerceError('Link not found.',404);await audit(request,env,p,'honeybook.link.toggle','success',200,String(b.id));return json({ok:true});
 }
 if(action!=='save-link')throw new CommerceError('Unknown HoneyBook action.');
 const label=text(b.label,'Link label',160,true),destination=honeyBookUrl(b.url),kind=b.kind??'private_invoice';
 if(!destination)throw new CommerceError('Use a secure HTTPS link from honeybook.com or hbportal.co.');
 if(kind!=='private_invoice'&&kind!=='public_form')throw new CommerceError('Choose a private invoice or public lead form.');
 if(kind==='public_form'&&b.confirmPublic!==true)throw new CommerceError('Confirm this is a public HoneyBook lead form, not a private client invoice.');
 const id=crypto.randomUUID();await db.prepare('INSERT INTO honeybook_links (id,owner,site_id,label,url,enabled,kind,created_at) VALUES (?,?,?,?,?,1,?,?)').bind(id,site.owner,site.id,'Encrypted payment link',await seal(env,{label,url:destination},'honeybook:'+id),kind,now()).run();await audit(request,env,p,'honeybook.link','success',200,site.id);return json({ok:true,id});
 }catch(e){return failure(e);}}

// This is a customer-authorized automation receiver, not an invented HoneyBook API.
// A key can only submit payments for its bound website. It cannot read invoices,
// access the suite, charge a card, or change the customer's HoneyBook account.
export async function honeybookEvent(request:Request,env:Env,id:string){try{
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(request.headers.has('origin'))throw new CommerceError('Use a server-side automation connection.',403);
 if(!env.HWS_DATA_KEY)throw new CommerceError('Encrypted billing storage is unavailable.',503);
 const bearer=request.headers.get('authorization')??'';if(!/^Bearer hws_hb_[a-f0-9]{64}$/.test(bearer))throw new CommerceError('Invalid sync credential.',401);
 const db=database(),connection=await db.prepare('SELECT * FROM honeybook_connections WHERE id=? AND enabled=1').bind(id).first<Connection>();
 if(!connection||!sameHash(connection.token_hash,await digest(bearer.slice(7))))throw new CommerceError('Invalid sync credential.',401);
 const site=await db.prepare("SELECT s.id,s.title,s.customer_id,s.owner FROM client_sites s LEFT JOIN customers c ON c.id=s.customer_id AND c.owner=s.owner WHERE s.id=? AND s.owner=? AND s.customer_id=? AND s.archived=0 AND (s.customer_id='' OR c.archived=0)").bind(connection.site_id,connection.owner,connection.customer_id).first<Site>();if(!site)throw new CommerceError('This website is unavailable for syncing.',410);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new CommerceError('Send Content-Type: application/json.',415);
 await limit(site.id);const b=await input(request);
 const allowed=new Set(['type','paymentId','label','amount','currency','paidAt','clientName','clientEmail','project','invoiceUrl']);if(Object.keys(b).some(k=>!allowed.has(k)))throw new CommerceError('Unexpected field. Send only the documented payment fields; never card data or suite/customer IDs.');
 if(b.type==='test'){await db.prepare('UPDATE honeybook_connections SET last_test_at=? WHERE id=? AND enabled=1 AND token_hash=?').bind(now(),id,connection.token_hash).run();return json({ok:true,test:true,message:'Connection verified. No payment was recorded.'});}
 if(b.type!=='payment.paid')throw new CommerceError('Supported event: payment.paid. A booking, redirect, or project stage is not payment confirmation.');
 const details=paymentDetails(b),result=await recordPayment(env,site,details,'automation',connection);
 await db.prepare('UPDATE honeybook_connections SET last_received_at=?,last_test_at=? WHERE id=? AND enabled=1 AND token_hash=?').bind(now(),now(),id,connection.token_hash).run();
 if(!result.duplicate)await audit(request,env,{id:'honeybook:'+id,email:'',owner:site.owner},'honeybook.payment.received','success',200,result.id);
 return json({ok:true,...result});
 }catch(e){const response=failure(e);const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');if(response.status===429)headers.set('Retry-After','3600');return new Response(response.body,{status:response.status,headers});}}

export async function publicHoneyBookLink(env:Pick<Env,'HWS_DATA_KEY'>,siteId:string,linkId:string){
 const row=await database().prepare("SELECT h.id,h.url FROM honeybook_links h JOIN client_sites s ON s.id=h.site_id LEFT JOIN customers c ON c.id=s.customer_id AND c.owner=s.owner WHERE h.id=? AND h.site_id=? AND h.kind='public_form' AND h.enabled=1 AND s.archived=0 AND (s.customer_id='' OR c.archived=0) AND (s.customer_id='' OR c.status!='Paused')").bind(linkId,siteId).first<{id:string;url:string}>();
 if(!row)throw new CommerceError('This HoneyBook form is unavailable.',404);
 const link=await unseal<{label:string;url:string}>(env as Env,row.url,'honeybook:'+row.id),url=honeyBookUrl(link.url);if(!url)throw new CommerceError('The HoneyBook link is invalid.',503);
 return {provider:'honeybook' as const,label:link.label,url,available:true,testMode:false};
}

export async function honeybookEditorLinks(env:Pick<Env,'HWS_DATA_KEY'>,siteId:string){
 const rows=await database().prepare("SELECT id,url,enabled FROM honeybook_links WHERE site_id=? AND kind='public_form' ORDER BY created_at DESC").bind(siteId).all<{id:string;url:string;enabled:number}>();
 return Promise.all(rows.results.map(async row=>({id:row.id,enabled:row.enabled,label:(await unseal<{label:string}>(env as Env,row.url,'honeybook:'+row.id)).label})));
}
