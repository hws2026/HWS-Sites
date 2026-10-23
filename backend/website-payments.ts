import {boundedBytes,RequestSizeError} from '../lib/request-size';
import {database,sitePermission} from '../lib/suite-store';
import {visibleBlocks,type Website} from '../lib/editor-model';
import {amountInMinorUnits,billingCurrencies} from '../lib/commerce-model';
import {stripe,validSignature,type BillingEnv} from './billing';
import {body,CommerceError,failure,field,json,providerUrl,type CommerceUser} from './commerce-utils';

export type MerchantEnv=BillingEnv&{STRIPE_CONNECT_WEBHOOK_SECRET?:string};
type Customer={id:string;owner:string;email:string;archived:number;status:string};
type Merchant={customer_id:string;owner:string;account_id:string|null;live:number;charges_enabled:number;details_submitted:number;disconnected:number};
type Account={id:string;charges_enabled:boolean;details_submitted:boolean};
type Offer={id:string;owner:string;customer_id:string;site_id:string;label:string;amount:number;currency:string;interval:string;enabled:number;revision:number};
type Order=Offer&{offer_id:string;account_id:string;live:number;status:string;session_id:string|null;session_url:string|null;expires:number;return_url:string;subscription_id:string|null};
type Session={id:string;url:string;status:string;payment_status:string;livemode:boolean;amount_total:number;currency:string;subscription:string|null;invoice:string|null;metadata?:Record<string,string>};
const now=()=>new Date().toISOString();
const live=(env:MerchantEnv)=>Number(Boolean(env.STRIPE_SECRET_KEY?.includes('_live_')));
const configured=(env:MerchantEnv)=>Boolean(env.STRIPE_SECRET_KEY&&env.STRIPE_CONNECT_WEBHOOK_SECRET);
async function customerAccess(id:string,user:CommerceUser){const c=await database().prepare('SELECT * FROM customers WHERE id=?').bind(id).first<Customer>();if(!c||!(user.isAdmin?c.owner===user.id:c.email.toLowerCase()===user.email))throw new CommerceError('Payment account not found.',404);return c;}
function active(c:Customer){if(c.archived||c.status==='Paused')throw new CommerceError('Restore and activate this customer before accepting payments.',409);}
async function merchant(id:string,env:MerchantEnv){const m=await database().prepare('SELECT * FROM merchant_accounts WHERE customer_id=?').bind(id).first<Merchant>();if(m&&m.live!==live(env))throw new CommerceError('Stripe test/live mode does not match this payment account. Contact the administrator.',409);return m;}
async function refresh(env:MerchantEnv,m:Merchant){if(!m.account_id||m.disconnected)throw new CommerceError('Connect this business to Stripe first.',409);const a=await stripe<Account>(env,'accounts/'+encodeURIComponent(m.account_id));if(a.id!==m.account_id)throw new CommerceError('Stripe account mismatch.',502);await database().prepare('UPDATE merchant_accounts SET charges_enabled=?,details_submitted=?,updated_at=? WHERE customer_id=? AND account_id=? AND disconnected=0').bind(Number(a.charges_enabled),Number(a.details_submitted),now(),m.customer_id,m.account_id).run();return a;}
function suiteReturn(env:MerchantEnv,user:CommerceUser){const u=new URL(env.FRONTEND_URL!);u.hash=(user.isAdmin?'/':'/portal')+'?view=payments';return u.href;}

export async function websitePaymentsRoute(request:Request,env:MerchantEnv,user:CommerceUser){try{
 const db=database(),url=new URL(request.url);
 if(request.method==='GET'){
  const siteId=url.searchParams.get('siteId');
  if(siteId){if(!await sitePermission(siteId,user.id))throw new CommerceError('Website not found.',404);const rows=await db.prepare('SELECT id,label,amount,currency,interval,enabled FROM payment_offers WHERE site_id=? ORDER BY updated_at DESC').bind(siteId).all();return json({offers:rows.results});}
  const condition=user.isAdmin?'c.owner=?':'lower(c.email)=?',identity=user.isAdmin?user.id:user.email;
  const [customers,sites,accounts,offers,orders,payments]=await Promise.all([
   db.prepare(`SELECT c.id,c.name,c.email,c.archived FROM customers c WHERE ${condition}`).bind(identity).all(),
   db.prepare(`SELECT s.id,s.title,s.customer_id FROM client_sites s JOIN customers c ON c.id=s.customer_id WHERE ${condition} AND c.archived=0 AND s.archived=0`).bind(identity).all(),
   db.prepare(`SELECT m.* FROM merchant_accounts m JOIN customers c ON c.id=m.customer_id WHERE ${condition}`).bind(identity).all(),
   db.prepare(`SELECT o.* FROM payment_offers o JOIN customers c ON c.id=o.customer_id WHERE ${condition} ORDER BY o.updated_at DESC`).bind(identity).all(),
   db.prepare(`SELECT o.id,o.site_id,o.customer_id,o.label,o.amount,o.currency,o.interval,o.status,o.subscription_status,o.live,o.created_at FROM website_orders o JOIN customers c ON c.id=o.customer_id WHERE ${condition} ORDER BY o.created_at DESC LIMIT 100`).bind(identity).all(),
   db.prepare(`SELECT p.* FROM website_payments p JOIN customers c ON c.id=p.customer_id WHERE ${condition} ORDER BY p.created_at DESC LIMIT 100`).bind(identity).all(),
  ]);
  return json({customers:customers.results,sites:sites.results,accounts:accounts.results,offers:offers.results,orders:orders.results,payments:payments.results,configured:configured(env),testMode:!live(env),email:user.email});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const input=await body(request),action=input.action;
 if(action==='connect'||action==='refresh'){
  const c=await customerAccess(field(input.customerId),user);active(c);
  // Account onboarding exposes financial details: only the named business contact may open it.
  if(action==='connect'&&c.email.toLowerCase()!==user.email)throw new CommerceError('The customer’s account contact must sign in to connect their own Stripe account.',403);
  if(!configured(env))throw new CommerceError('The administrator must connect Stripe and its connected-account webhook before onboarding businesses.',503);
  let m=await merchant(c.id,env);
  if(action==='refresh'){if(!m)throw new CommerceError('Connect Stripe first.',409);await refresh(env,m);return json({ok:true});}
  if(m?.disconnected)throw new CommerceError('This Stripe connection was revoked. Contact the administrator before reconnecting.',409);
  if(!m?.account_id){
   await db.prepare('INSERT OR IGNORE INTO merchant_accounts (customer_id,owner,live,updated_at) VALUES (?,?,?,?)').bind(c.id,c.owner,live(env),now()).run();
   const a=await stripe<Account>(env,'accounts',{'controller[fees][payer]':'account','controller[losses][payments]':'stripe','controller[requirement_collection]':'stripe','controller[stripe_dashboard][type]':'full','metadata[hws_customer_id]':c.id},'hws-merchant-'+live(env)+'-'+c.id);
   await db.prepare('UPDATE merchant_accounts SET account_id=?,updated_at=? WHERE customer_id=? AND account_id IS NULL AND live=?').bind(a.id,now(),c.id,live(env)).run();m=(await merchant(c.id,env))!;
  }
  const session=await stripe<{url:string}>(env,'account_links',{account:m.account_id!,type:'account_onboarding',return_url:suiteReturn(env,user)+'&stripe=returned',refresh_url:suiteReturn(env,user)+'&stripe=expired'});
  const link=providerUrl(session.url,['connect.stripe.com']);if(!link)throw new CommerceError('Stripe did not return a valid onboarding link.',502);return json({url:link});
 }
 if(action==='save-offer'){
  const siteId=field(input.siteId),s=await db.prepare('SELECT customer_id,archived FROM client_sites WHERE id=?').bind(siteId).first<{customer_id:string;archived:number}>();if(!s||s.archived)throw new CommerceError('Active website not found.',404);
  const c=await customerAccess(s.customer_id,user);active(c);let amount:number;try{amount=amountInMinorUnits(input.amount);}catch(e){throw new CommerceError(e instanceof Error?e.message:'Invalid amount.');}
  const label=field(input.label,120),currency=field(input.currency).toUpperCase(),interval=field(input.interval);
  if(!billingCurrencies.includes(currency as typeof billingCurrencies[number])||!['one_time','month','year'].includes(interval))throw new CommerceError('Choose a supported currency and schedule.');
  // Prices are immutable. Create a new offer when changing a price; existing subscriptions keep their terms.
  const id=crypto.randomUUID();await db.prepare('INSERT INTO payment_offers (id,owner,customer_id,site_id,label,amount,currency,interval,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,c.owner,c.id,siteId,label,amount,currency,interval,now()).run();return json({ok:true,id});
 }
 if(action==='toggle-offer'){
  const o=await db.prepare('SELECT * FROM payment_offers WHERE id=?').bind(field(input.id)).first<Offer>();if(!o)throw new CommerceError('Payment offer not found.',404);const c=await customerAccess(o.customer_id,user);if(input.enabled)active(c);
  if(typeof input.enabled!=='boolean')throw new CommerceError('Choose whether this offer accepts payments.');
  // Expire outstanding checkouts before disabling, while keeping accepted payments/subscriptions intact.
  if(!input.enabled){await db.prepare('UPDATE payment_offers SET enabled=0,revision=revision+1,updated_at=? WHERE id=?').bind(now(),o.id).run();const open=await db.prepare("SELECT * FROM website_orders WHERE offer_id=? AND status='pending' AND expires>?").bind(o.id,Math.floor(Date.now()/1000)).all<Order>();for(const order of open.results){if(!order.session_id)throw new CommerceError('Checkout is being prepared. Retry after it completes or expires.',409);const session=await stripe<Session>(env,'checkout/sessions/'+encodeURIComponent(order.session_id),undefined,undefined,order.account_id);if(session.status==='open')await stripe(env,'checkout/sessions/'+encodeURIComponent(order.session_id)+'/expire',{},'close-'+order.id,order.account_id);}}
  if(input.enabled)await db.prepare('UPDATE payment_offers SET enabled=1,revision=revision+1,updated_at=? WHERE id=?').bind(now(),o.id).run();return json({ok:true});
 }
 throw new CommerceError('Unknown website payment action.');
 }catch(e){return failure(e);}}

async function rateLimit(request:Request,siteId:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.headers.get('cf-connecting-ip')??'unknown'));
 const digest=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join(''),hour=Math.floor(Date.now()/3600000),key=siteId+':payments:'+hour+':'+digest;
 const row=await database().prepare('INSERT INTO form_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(hour+2)*3600000).first<{count:number}>();if(row&&row.count>20)throw new CommerceError('Too many checkout attempts. Please try again later.',429);
}
export async function publicPayment(request:Request,env:MerchantEnv,siteId:string,site:Website,basePath:string){try{
 const url=new URL(request.url),db=database();
 if(request.method==='GET'&&url.searchParams.has('order')){const order=await db.prepare('SELECT status,subscription_status,offer_id FROM website_orders WHERE id=? AND site_id=?').bind(field(url.searchParams.get('order')),siteId).first();if(!order)throw new CommerceError('Payment not found.',404);return json(order);}
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 const input=request.method==='POST'?await body(request):Object.fromEntries(url.searchParams),page=site.pages.find(p=>p.id===input.pageId),block=page&&visibleBlocks(page.blocks).find(b=>b.id===input.blockId&&b.type==='payment');
 if(!page||!block?.paymentOfferId)throw new CommerceError('This payment section is unavailable.',404);
 const offer=await db.prepare('SELECT o.* FROM payment_offers o JOIN client_sites s ON s.id=o.site_id AND s.customer_id=o.customer_id JOIN customers c ON c.id=o.customer_id WHERE o.id=? AND o.site_id=? AND o.enabled=1 AND c.archived=0 AND c.status!=?').bind(block.paymentOfferId,siteId,'Paused').first<Offer>();if(!offer)throw new CommerceError('This payment offer is no longer available.',404);
 const m=await merchant(offer.customer_id,env);
 if(request.method==='GET')return json({label:offer.label,amount:offer.amount,currency:offer.currency,interval:offer.interval,testMode:!live(env),available:configured(env)&&Boolean(m?.account_id&&!m.disconnected&&m.charges_enabled)});
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new CommerceError('Start checkout from this website.',403);
 if(!configured(env))throw new CommerceError('Online payments are not connected yet. Please contact this business.',503);
 if(!m?.account_id||m.disconnected)throw new CommerceError('This business has not connected Stripe yet.',503);
 const account=await refresh(env,m);if(!account.charges_enabled)throw new CommerceError('This business must complete its Stripe verification before accepting payments.',503);
 const requestId=field(input.requestId,100);if(!/^[a-f0-9-]{36}$/i.test(requestId))throw new CommerceError('Reload the payment section and try again.');await rateLimit(request,siteId);
 let order=await db.prepare('SELECT * FROM website_orders WHERE site_id=? AND request_id=?').bind(siteId,requestId).first<Order>();
 if(order&&(order.offer_id!==offer.id||order.account_id!==m.account_id||order.live!==live(env)))throw new CommerceError('Checkout changed. Reload this page before paying.',409);
 if(order&&(order.status!=='pending'||order.expires<=Date.now()/1000))throw new CommerceError('This checkout has completed or expired. Reload the page to start again.',409);
 if(!order){const id=crypto.randomUUID(),returnUrl=url.origin+basePath+(page.id===site.pages[0].id?'/':'/'+encodeURIComponent(page.slug))+'?hws_payment='+id;
  await db.prepare("INSERT OR IGNORE INTO website_orders (id,owner,customer_id,site_id,offer_id,request_id,account_id,live,label,amount,currency,interval,status,expires,return_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?)").bind(id,offer.owner,offer.customer_id,siteId,offer.id,requestId,m.account_id,live(env),offer.label,offer.amount,offer.currency,offer.interval,Math.floor(Date.now()/1000)+3600,returnUrl,now(),now()).run();
  order=(await db.prepare('SELECT * FROM website_orders WHERE site_id=? AND request_id=?').bind(siteId,requestId).first<Order>())!;
 }
 if(order.offer_id!==offer.id)throw new CommerceError('Checkout changed. Reload this page.',409);
 if(order.session_id){const previous=await stripe<Session>(env,'checkout/sessions/'+encodeURIComponent(order.session_id),undefined,undefined,order.account_id);if(previous.status!=='open')throw new CommerceError('This payment is being confirmed or has expired. Reload this page.',409);const previousUrl=providerUrl(previous.url,['checkout.stripe.com']);if(previousUrl)return json({url:previousUrl});}
 const p:Record<string,string>={mode:order.interval==='one_time'?'payment':'subscription','metadata[hws_order_id]':order.id,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':order.currency.toLowerCase(),'line_items[0][price_data][unit_amount]':String(order.amount),'line_items[0][price_data][product_data][name]':order.label,success_url:order.return_url,cancel_url:order.return_url+'&canceled=1',expires_at:String(order.expires)};
 if(order.interval!=='one_time'){p['line_items[0][price_data][recurring][interval]']=order.interval;p['subscription_data[metadata][hws_order_id]']=order.id;}
 // Direct charges: funds and Stripe fees belong to the connected business. No HWS application fee.
 const session=await stripe<Session>(env,'checkout/sessions',p,'hws-website-'+order.id,order.account_id),checkoutUrl=providerUrl(session.url,['checkout.stripe.com']);if(!checkoutUrl)throw new CommerceError('Stripe did not return a valid payment page.',502);
 await db.prepare('UPDATE website_orders SET session_id=?,session_url=?,updated_at=? WHERE id=? AND session_id IS NULL').bind(session.id,checkoutUrl,now(),order.id).run();
 // A concurrent disable must not leave a new payable link behind.
 const current=await db.prepare('SELECT enabled,revision FROM payment_offers WHERE id=?').bind(offer.id).first<{enabled:number;revision:number}>();if(!current?.enabled||current.revision!==offer.revision){await stripe(env,'checkout/sessions/'+encodeURIComponent(session.id)+'/expire',{},'close-'+order.id,order.account_id);throw new CommerceError('This offer changed. Reload the website.',409);}
 return json({url:checkoutUrl});
 }catch(e){return failure(e);}}

export async function merchantWebhook(request:Request,env:MerchantEnv){try{
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);if(!env.STRIPE_CONNECT_WEBHOOK_SECRET)return json({error:'Webhook is not configured.'},503);
 let raw:string;try{raw=new TextDecoder().decode(await boundedBytes(request,1000000));}catch(error){if(error instanceof RequestSizeError)return json({error:'Event too large.'},413);throw error;}
 if(!await validSignature(raw,request.headers.get('stripe-signature'),env.STRIPE_CONNECT_WEBHOOK_SECRET))return json({error:'Invalid signature.'},400);
 const event=JSON.parse(raw) as {id:string;account:string;livemode:boolean;type:string;data:{object:{id:string}}};if(!event.id||!event.account||!event.data?.object?.id)return json({error:'Invalid connected-account event.'},400);
 // Connect can send both test and live events. Ignore the opposite mode without mutating anything.
 if(Number(event.livemode)!==live(env))return json({received:true,ignored:'mode'});
 const db=database();if(await db.prepare('SELECT id FROM merchant_events WHERE id=?').bind(event.id).first())return json({received:true});
 const m=await db.prepare('SELECT * FROM merchant_accounts WHERE account_id=? AND live=?').bind(event.account,live(env)).first<Merchant>();if(!m)return json({received:true});
 const statements:D1PreparedStatement[]=[];
 if(event.type==='account.application.deauthorized'){statements.push(db.prepare('UPDATE merchant_accounts SET disconnected=1,charges_enabled=0,updated_at=? WHERE account_id=?').bind(now(),event.account));}
 else if(event.type==='account.updated'){if(!m.disconnected)await refresh(env,m);}
 else if(!m.disconnected&&event.type.startsWith('checkout.session.')){
  const session=await stripe<Session>(env,'checkout/sessions/'+encodeURIComponent(event.data.object.id),undefined,undefined,event.account);
  const o=await db.prepare('SELECT * FROM website_orders WHERE id=? AND account_id=? AND live=?').bind(session.metadata?.hws_order_id??'',event.account,live(env)).first<Order>();
  if(o){if(!o.session_id)return json({error:'Checkout association pending. Retry.'},503);if(o.session_id!==session.id||session.amount_total!==o.amount||session.currency.toUpperCase()!==o.currency||Number(session.livemode)!==o.live)return json({error:'Payment does not match order.'},400);
   const status=session.payment_status==='paid'?'paid':session.status==='expired'?'expired':event.type==='checkout.session.async_payment_failed'?'failed':'pending';
   statements.push(db.prepare("UPDATE website_orders SET status=CASE WHEN status='paid' THEN status ELSE ? END,subscription_id=COALESCE(?,subscription_id),updated_at=? WHERE id=?").bind(status,session.subscription,now(),o.id));
   if(status==='paid'&&!session.subscription)statements.push(db.prepare("INSERT INTO website_payments (id,order_id,customer_id,owner,amount,currency,status,created_at) VALUES (?,?,?,?,?,?,'paid',?) ON CONFLICT(id) DO NOTHING").bind(session.id,o.id,o.customer_id,o.owner,o.amount,o.currency,now()));
  }
 }else if(!m.disconnected&&(event.type.startsWith('invoice.')||event.type.startsWith('customer.subscription.'))){
  type Subscription={id:string;status:string;metadata?:Record<string,string>};type Invoice={id:string;parent?:{subscription_details?:{subscription:string}};subscription?:string;status:string;amount_paid:number;amount_due:number;currency:string;hosted_invoice_url:string;created:number};
  let invoice:Invoice|undefined,sub:Subscription|undefined;
  if(event.type.startsWith('invoice.')){invoice=await stripe<Invoice>(env,'invoices/'+encodeURIComponent(event.data.object.id),undefined,undefined,event.account);const subId=invoice.parent?.subscription_details?.subscription??invoice.subscription;if(subId)sub=await stripe<Subscription>(env,'subscriptions/'+encodeURIComponent(subId),undefined,undefined,event.account);}
  else sub=await stripe<Subscription>(env,'subscriptions/'+encodeURIComponent(event.data.object.id),undefined,undefined,event.account);
  const o=sub&&await db.prepare('SELECT * FROM website_orders WHERE id=? AND account_id=? AND live=?').bind(sub.metadata?.hws_order_id??'',event.account,live(env)).first<Order>();
  if(o&&sub){if(!o.subscription_id)return json({error:'Subscription association pending. Retry.'},503);if(o.subscription_id!==sub.id)return json({error:'Subscription mismatch.'},400);
   statements.push(db.prepare('UPDATE website_orders SET subscription_status=?,updated_at=? WHERE id=?').bind(sub.status,now(),o.id));
   if(invoice)statements.push(db.prepare('INSERT INTO website_payments (id,order_id,customer_id,owner,amount,currency,status,receipt_url,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,status=excluded.status,receipt_url=excluded.receipt_url').bind(event.account+':'+invoice.id,o.id,o.customer_id,o.owner,invoice.status==='paid'?invoice.amount_paid:invoice.amount_due,invoice.currency.toUpperCase(),invoice.status,providerUrl(invoice.hosted_invoice_url,['stripe.com']),new Date(invoice.created*1000).toISOString()));
  }
 }
 statements.push(db.prepare('INSERT OR IGNORE INTO merchant_events (id,processed_at) VALUES (?,?)').bind(event.id,now()));await db.batch(statements);return json({received:true});
 }catch(e){console.error('Connected Stripe event failed',e instanceof Error?e.message:'Unknown failure');return json({error:'Event processing failed. Retry this event.'},503);}}

export async function checkWebsitePaymentDeletion(env:MerchantEnv,customerId:string){
 const orders=await database().prepare('SELECT * FROM website_orders WHERE customer_id=?').bind(customerId).all<Order>();
 for(const o of orders.results){if(o.subscription_id){const s=await stripe<{status:string}>(env,'subscriptions/'+encodeURIComponent(o.subscription_id),undefined,undefined,o.account_id);if(!['canceled','incomplete_expired'].includes(s.status))throw new CommerceError('Cancel this customer’s website subscriptions in Stripe before deleting. Archiving does not cancel payments.',409);}if(o.status==='pending'){if(o.session_id){const s=await stripe<Session>(env,'checkout/sessions/'+encodeURIComponent(o.session_id),undefined,undefined,o.account_id);if(s.status!=='expired')throw new CommerceError('Resolve pending website payments before deleting this customer.',409);}else if(o.expires>Date.now()/1000)throw new CommerceError('Wait for the pending website checkout to expire before deleting this customer.',409);}}
}
