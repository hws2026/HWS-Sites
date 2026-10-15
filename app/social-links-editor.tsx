'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,Plus,Trash2} from 'lucide-react';
import {uid,type Website} from '@/lib/editor-model';
import {SocialLogo,normalizeSocialUrl,parseSocialLinks,serializeSocialLinks,socialPlatform,socialPlatforms,validSocialUrl,type SocialLink} from './social-links';
type Row=SocialLink&{id:string;saved?:SocialLink};
const readRows=(value?:string):Row[]=>parseSocialLinks(value).map(link=>({...link,id:uid(),saved:link.label&&validSocialUrl(link.url)?link:undefined}));

export function SocialLinksEditor({site,onChange}:{site:Website;onChange:(site:Website)=>void}){
 const value=site.socialLinks??'',lastValue=useRef(value),[rows,setRows]=useState(()=>readRows(value));
 useEffect(()=>{if(value!==lastValue.current){lastValue.current=value;setRows(readRows(value));}},[value]);
 const update=(next:Row[])=>{const checked=next.map(row=>({...row,saved:!row.url.trim()?undefined:row.label.trim()&&validSocialUrl(row.url)?{label:row.label.trim(),url:row.url.trim()}:row.saved}));setRows(checked);const socialLinks=serializeSocialLinks(checked.flatMap(row=>row.saved?[row.saved]:[]));lastValue.current=socialLinks;if(socialLinks!==value)onChange({...site,socialLinks});};
 const patch=(id:string,change:Partial<SocialLink>)=>update(rows.map(row=>row.id===id?{...row,...change}:row));
 const move=(index:number,offset:number)=>{const next=[...rows];[next[index],next[index+offset]]=[next[index+offset],next[index]];update(next);};
 return <section className="social-links-editor" aria-label="Social media links"><p className="panel-label">SOCIAL MEDIA LINKS</p><p className="field-help">Choose a logo and paste its profile URL. Links appear in your footer and wherever your template includes social links.</p>
 {!rows.length&&<p className="social-links-empty">No social links yet. Add one below.</p>}
 {rows.map((row,index)=>{const platform=socialPlatform(row.label),invalid=Boolean(row.url)&&(!row.label.trim()||!validSocialUrl(row.url)),errorId='social-url-'+row.id;return <div className="social-link-row" key={row.id}>
 <div className="social-link-row-heading"><span className="social-logo-preview"><SocialLogo label={row.label} size={21}/></span><strong>{row.label||'Website'}</strong><div className="social-link-actions"><button type="button" disabled={index===0} title="Move up" aria-label={`Move ${row.label} up`} onClick={()=>move(index,-1)}><ArrowUp size={14}/></button><button type="button" disabled={index===rows.length-1} title="Move down" aria-label={`Move ${row.label} down`} onClick={()=>move(index,1)}><ArrowDown size={14}/></button><button type="button" title="Remove link" aria-label={`Remove ${row.label} link`} onClick={()=>update(rows.filter(item=>item.id!==row.id))}><Trash2 size={14}/></button></div></div>
 <label>Logo<select aria-label={`Social logo ${index+1}`} value={platform?.id??'custom'} onChange={e=>patch(row.id,{label:socialPlatforms.find(p=>p.id===e.target.value)?.label??'Website'})}>{socialPlatforms.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}<option value="custom">Website / custom link</option></select></label>
 {!platform&&<label>Link label<input maxLength={100} value={row.label} onChange={e=>patch(row.id,{label:e.target.value.replace(/[|\r\n]/g,'')})}/></label>}
 <label>Profile URL<input type="url" inputMode="url" aria-label={`${row.label} profile URL`} aria-invalid={invalid||undefined} aria-describedby={errorId} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={300} placeholder={platform?.placeholder??'https://example.com/your-profile'} value={row.url} onChange={e=>patch(row.id,{url:e.target.value.replace(/[\r\n]/g,'')})} onBlur={()=>{if(row.url.trim())patch(row.id,{url:normalizeSocialUrl(row.url)});}}/></label>
 <p id={errorId} className={'field-help'+(invalid?' social-link-error':'')}>{invalid?`${!row.label.trim()?'Enter a link label.':'Use a full HTTPS URL.'} ${row.saved?'Your previous valid link is kept until this is corrected.':'This row is not saved yet.'}`:!row.url?'Enter a URL to include this link. Empty rows are not saved.':'Opens in a new tab.'}</p>
 </div>;})}
 <button className="button social-link-add" type="button" disabled={rows.length>=12} onClick={()=>{const next=socialPlatforms.find(p=>!rows.some(row=>socialPlatform(row.label)?.id===p.id))??socialPlatforms[0];update([...rows,{id:uid(),label:next.label,url:''}]);}}><Plus size={15}/>Add social link</button><p className="field-help">{rows.length}/12 links · Remove a link to hide it.</p>
 </section>;
}
