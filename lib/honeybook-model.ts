export type HoneyBookLinkKind = 'private_invoice' | 'public_form';
export type HoneyBookLink = {id:string;site_id:string;label:string;url:string;enabled:number;kind:HoneyBookLinkKind;created_at:string};
export type HoneyBookPaymentDetails = {paymentId:string;label:string;amount:number;currency:'USD'|'CAD';paidAt:string;clientName:string;clientEmail:string;project:string;invoiceUrl:string};
export type HoneyBookPayment = HoneyBookPaymentDetails & {id:string;site_id:string;source:'manual'|'automation';voided:number;created_at:string};
export type HoneyBookConnection = {id:string;site_id:string;enabled:number;last_received_at:string|null;last_test_at:string|null;created_at:string};
export type HoneyBookData = {sites:{id:string;title:string;customer_id:string}[];links:HoneyBookLink[];connections:HoneyBookConnection[];payments:HoneyBookPayment[];next:string|null};

// The browser and server use the same allowlist. No redirects are fetched by HWS.
export function honeyBookUrl(value:unknown):string|null {
 if(typeof value!=='string'||value.length>2000)return null;
 try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(url.hostname==='honeybook.com'||url.hostname.endsWith('.honeybook.com'))?url.href:null;}catch{return null;}
}

export const honeyBookSetup = {
 honeybook:'https://help.honeybook.com/en/articles/2209205-automate-tasks-with-zapier',
 webhook:'https://help.zapier.com/hc/en-us/articles/8496326446989-Send-webhooks-in-Zaps',
 payLinks:'https://help.honeybook.com/en/articles/11067573-create-and-share-pay-links-in-honeybook',
};
