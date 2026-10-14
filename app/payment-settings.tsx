'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import type {Block} from '@/lib/editor-model';
import type {PaymentOffer} from '@/lib/website-payment-model';
import {apiFetch,appHref} from '@/lib/client-runtime';
import {money,intervalLabel} from '@/lib/commerce-model';
export const PaymentEditorContext=createContext('');
export function PaymentSettings({block,onChange}:{block:Block;onChange:(patch:Partial<Block>)=>void}){
 const siteId=useContext(PaymentEditorContext),[offers,setOffers]=useState<PaymentOffer[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{if(!siteId||siteId.startsWith('demo-'))return;let current=true;setLoading(true);setError('');apiFetch('/api/website-payments?siteId='+encodeURIComponent(siteId)).then(async r=>{const d=await r.json() as {offers:PaymentOffer[];error?:string};if(!r.ok)throw new Error(d.error);if(current)setOffers(d.offers);}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[siteId,version]);
 return <div className="form-field-editor"><p className="field-help">Create a price in Website payments, then select it here. Amounts are verified by the server when visitors check out.</p><label>Payment offer<select value={block.paymentOfferId??''} disabled={loading} onChange={e=>onChange({paymentOfferId:e.target.value})}><option value="">Select an offer</option>{offers.map(o=><option key={o.id} value={o.id}>{o.label} · {money(o.amount,o.currency)} {intervalLabel(o.interval)}{o.enabled?'':' · Disabled'}</option>)}{block.paymentOfferId&&!offers.some(o=>o.id===block.paymentOfferId)&&<option value={block.paymentOfferId}>Unavailable offer — select one for this website</option>}</select></label>{error&&<p role="alert">{error}</p>}<button type="button" className="button" onClick={()=>setVersion(v=>v+1)}>Refresh offers</button><a className="button" href={appHref('/portal?view=payments')} target="_blank" rel="noopener noreferrer">Open website payments</a><label>Button label<input value={block.label} onChange={e=>onChange({label:e.target.value})}/></label>{siteId.startsWith('demo-')&&<p className="field-help">Create a website from this template to attach its own payment offers.</p>}</div>;
}
