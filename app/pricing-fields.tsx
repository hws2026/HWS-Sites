'use client';
import type {BlockItem,PricingDetails} from '@/lib/editor-model';

export function PricingFields({item,onChange}:{item:BlockItem;onChange:(patch:Partial<BlockItem>)=>void}){
 const value:PricingDetails=item.price??{amount:'',period:'',annual:'',badge:'',features:[]};
 const patch=(update:Partial<PricingDetails>)=>onChange({price:{...value,...update}});
 return <div className="pricing-fields">
  <label>Price or amount<input maxLength={200} placeholder="$29 or Contact Sales" value={value.amount} onChange={e=>patch({amount:e.target.value})}/></label>
  <label>Billing period<input maxLength={200} placeholder="/month, one-time, or per session" value={value.period} onChange={e=>patch({period:e.target.value})}/></label>
  <label>Annual price / secondary price<input maxLength={200} placeholder="or $290/year" value={value.annual} onChange={e=>patch({annual:e.target.value})}/></label>
  <label>Badge<input maxLength={200} placeholder="Recommended (optional)" value={value.badge} onChange={e=>patch({badge:e.target.value})}/></label>
  <label>Included features<textarea rows={8} value={value.features.join('\n')} onChange={e=>patch({features:e.target.value.split('\n')})}/><span className="field-help">One feature per line, up to 30. These cards display information; editing them does not change billing or account limits.</span></label>
 </div>;
}
