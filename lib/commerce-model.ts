export const billingCurrencies=['USD','CAD','EUR','GBP','AUD','SGD'] as const;
export type BillingInterval='one_time'|'month'|'year';
export type BillingAgreement={id:string;customer_id:string;customer_name:string;label:string;amount:number;currency:string;interval:BillingInterval;status:string;revision:number;stripe_subscription_id:string|null;session_expires:number;cancel_at_period_end:number;updated_at:string};
export type BillingPayment={id:string;agreement_id:string;customer_id:string;amount:number;currency:string;status:string;invoice_url:string|null;created_at:string};
export type BillingData={agreements:BillingAgreement[];payments:BillingPayment[];customers:{id:string;name:string;email:string}[];configured:boolean;portalConfigured:boolean;testMode:boolean;admin:boolean};
export type DomainRecord={id:string;site_id:string;hostname:string;status:string;verification_token:string;is_primary:number;verified_at:string|null;ssl_status:string;hostname_status:string;validation_records:string;last_error:string|null;checked_at:string|null};
export type DomainData={domains:DomainRecord[];sites:{id:string;title:string;enabled:number;is_published:number;can_manage:number;can_publish:number}[];configured:boolean;target:string;admin:boolean};
export function amountInMinorUnits(value:unknown){if(typeof value!=='string'||!/^\d{1,6}(?:\.\d{1,2})?$/.test(value.trim()))throw new Error('Enter an amount with no more than two decimal places.');const [whole,fraction='']=value.trim().split('.');const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(amount<50||amount>99999999)throw new Error('The amount must be between 0.50 and 999,999.99.');return amount;}
export const money=(amount:number,currency:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(amount/100);
export const intervalLabel=(interval:BillingInterval)=>interval==='month'?'Monthly':interval==='year'?'Yearly':'One-time';
