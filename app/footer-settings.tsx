'use client';
import type {Website} from '@/lib/editor-model';
import {LinkField} from './editor-controls';
export const legalLinkLabels={privacy:'Privacy Policy',termsOfUse:'Terms of use',termsOfService:'Terms of service'} as const;
export function FooterSettings({site,onChange}:{site:Website;onChange:(site:Website)=>void}){
 return <div className="footer-settings"><p className="panel-label">COPYRIGHT & LEGAL LINKS</p>
 <label>Copyright company name<input maxLength={120} value={site.copyrightName??''} placeholder={site.name} onChange={e=>onChange({...site,copyrightName:e.target.value})}/><span className="field-help">Leave blank to use the website name. The year updates automatically.</span></label>
 <p className="field-help">copyright (c) {new Date().getFullYear()} {(site.copyrightName?.trim()||site.name).replace(/\.+$/,'')}. All Right Reserved.</p>
 {Object.entries(legalLinkLabels).map(([key,label])=>{const id=key as keyof typeof legalLinkLabels,link=site.legalLinks?.[id]??{enabled:false,url:''};const update=(patch:Partial<typeof link>)=>onChange({...site,legalLinks:{...site.legalLinks,[id]:{...link,...patch}}});return <div className="legal-link-setting" key={key}><label className="native-check"><input type="checkbox" checked={link.enabled} onChange={e=>update({enabled:e.target.checked})}/>Show {label}</label><LinkField label={label+' destination'} site={site} value={link.url} onChange={url=>update({url})}/>{link.enabled&&!link.url.trim()&&<p className="field-help">Choose a page or enter a URL for this link to appear.</p>}</div>;})}
 </div>;
}
