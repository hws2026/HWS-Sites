'use client';
import {useState} from 'react';
import {ChevronDown,Search} from 'lucide-react';
import {iconCatalog,suggestedIcon,type IconName} from '@/lib/icon-catalog';
import {WebsiteIcon} from './website-icons';
import {SiteImage} from './site-image';

export function IconPicker({value,title,image,onChange}:{value?:IconName;title:string;image:string;onChange:(icon:IconName|undefined)=>void}){
 const [query,setQuery]=useState('');
 const selected=iconCatalog.find(icon=>icon.id===value);
 const matches=iconCatalog.filter(icon=>`${icon.label} ${icon.keywords}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <details className="icon-picker" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
  <summary aria-label={`Choose icon for ${title||'item'}`}>
   {image?<SiteImage src={image} alt=""/>:<WebsiteIcon name={value} title={title} size={24}/>}
   <span><strong>Choose icon</strong><small>{image?'Custom image':selected?.label??'Automatic'}</small></span><ChevronDown size={15}/>
  </summary>
  <div className="icon-picker-content">
   <label className="icon-search"><Search size={15} aria-hidden="true"/><input aria-label="Search icons" placeholder="Search icons…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
   <div className="icon-options" role="group" aria-label="Available icons">
    {!query&&<button type="button" aria-label="Choose automatic icon" aria-pressed={!value&&!image} onClick={()=>onChange(undefined)}><WebsiteIcon name={suggestedIcon(title)} size={23}/><span>Automatic</span></button>}
    {matches.map(icon=><button type="button" key={icon.id} aria-label={`Choose ${icon.label} icon`} aria-pressed={value===icon.id&&!image} onClick={()=>onChange(icon.id)}><WebsiteIcon name={icon.id} size={23}/><span>{icon.label}</span></button>)}
   </div>
   {!matches.length&&<p className="field-help" role="status">No icons match “{query}”. Try another word.</p>}
   <p className="field-help">{image?'Choosing an icon replaces the custom image.':'36 icons. Choose one, or use a custom image below.'}</p>
  </div>
 </details>;
}
