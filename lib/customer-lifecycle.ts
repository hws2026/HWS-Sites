import {database,logStatement} from './suite-store';
import {backendEnv} from './server-context';
import {deleteMediaObjects} from './media-storage';
import {removeCustomerHostname,type DomainEnv} from '../backend/domains';
import {checkCustomerDeletionBilling,type BillingEnv} from '../backend/billing';

// 0 = active, 1 = archived, 2 = deletion in progress. Failed cleanup is retryable.
export async function customerLifecycle(input:Record<string,unknown>,owner:string){
 const db=database(),id=typeof input.id==='string'?input.id:'',action=input.action;
 const customer=await db.prepare('SELECT id,name,archived FROM customers WHERE id=? AND owner=?').bind(id,owner).first<{id:string;name:string;archived:number}>();
 const fail=(error:string,status=409)=>Response.json({error},{status});
 if(!customer)return fail('Customer not found.',404);
 if(action==='restore-customer'){
  if(customer.archived===2)return fail('Deletion has started. Retry deletion to finish removing this customer.');
  await db.batch([db.prepare('UPDATE customers SET archived=0 WHERE id=? AND owner=? AND archived=1').bind(id,owner),logStatement(owner,'Restored customer '+customer.name)]);
  return Response.json({ok:true});
 }
 const siteIds='SELECT id FROM client_sites WHERE customer_id=? AND owner=?';
 if(action==='archive-customer'){
  if(customer.archived===2)return fail('Deletion has started. Retry deletion to finish.');
  await db.batch([
   db.prepare('UPDATE customers SET archived=1 WHERE id=? AND owner=? AND archived=0').bind(id,owner),
   db.prepare(`UPDATE site_publications SET enabled=0 WHERE site_id IN (${siteIds})`).bind(id,owner),
   db.prepare('UPDATE reminders SET enabled=0 WHERE customer_id=? AND owner=?').bind(id,owner),
   logStatement(owner,'Archived customer '+customer.name),
  ]);
  return Response.json({ok:true});
 }
 if(!customer.archived)return fail('Archive this customer before permanently deleting their websites.');
 if(input.confirmName!==customer.name)return fail('Type the customer name exactly to confirm deletion.',400);
 const env=backendEnv() as ReturnType<typeof backendEnv>&DomainEnv&BillingEnv;
 await checkCustomerDeletionBilling(env,id);
 await db.prepare('UPDATE customers SET archived=2 WHERE id=? AND owner=? AND archived!=0').bind(id,owner).run();
 const locked=await db.prepare('SELECT archived FROM customers WHERE id=? AND owner=?').bind(id,owner).first<{archived:number}>();
 if(locked?.archived!==2)return fail('Customer status changed. Archive the customer and try again.');
 // Keep records until external cleanup succeeds, so a partial failure can be retried.
 const domains=await db.prepare(`SELECT id,hostname,cloudflare_id FROM site_domains WHERE site_id IN (${siteIds})`).bind(id,owner).all<{id:string;hostname:string;cloudflare_id:string|null}>();
 for(const domain of domains.results){if(domain.cloudflare_id)await removeCustomerHostname(env,domain.hostname);}
 const files=await db.prepare(`SELECT key FROM media WHERE site_id IN (${siteIds})`).bind(id,owner).all<{key:string}>();
 for(let i=0;i<files.results.length;i+=100)await deleteMediaObjects(env,files.results.slice(i,i+100).map(row=>row.key));
 const statements=['form_attachments','form_submissions','site_access','site_domains','site_publications','media','activity'].map(table=>db.prepare(`DELETE FROM ${table} WHERE site_id IN (${siteIds})`).bind(id,owner));
 statements.push(db.prepare(`DELETE FROM form_rate_limits WHERE EXISTS (SELECT 1 FROM client_sites s WHERE s.customer_id=? AND s.owner=? AND substr(form_rate_limits.key,1,length(s.id)+1)=s.id||':')`).bind(id,owner));
 statements.push(db.prepare('DELETE FROM reminder_deliveries WHERE reminder_id IN (SELECT id FROM reminders WHERE customer_id=? AND owner=?)').bind(id,owner));
 for(const table of ['reminders','billing_payments','billing_agreements','billing_accounts','client_sites'])statements.push(db.prepare(`DELETE FROM ${table} WHERE customer_id=? AND owner=?`).bind(id,owner));
 statements.push(db.prepare('DELETE FROM customers WHERE id=? AND owner=? AND archived=2').bind(id,owner),logStatement(owner,'Permanently deleted customer '+customer.name+' and their websites'));
 await db.batch(statements);
 return Response.json({ok:true});
}
