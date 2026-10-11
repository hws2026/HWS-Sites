'use client';
import {useId,useState} from 'react';
import {ChevronDown,X} from 'lucide-react';
import type {DirectoryMenu} from '@/lib/editor-model';

export function WebsiteDirectory({directory,onClose,href,onNavigate,open=true}:{open?:boolean;directory:DirectoryMenu;onClose:()=>void;href:(value:string)=>string;onNavigate:(event:React.MouseEvent,value:string)=>void}){
 const [selected,setSelected]=useState(directory.groups[0]?.id);const id=useId();
 const group=directory.groups.find(group=>group.id===selected)??directory.groups[0];
 if(!group)return null;
 return <section className={'website-directory-panel'+(open?' is-open':'')} aria-hidden={!open} inert={!open} aria-label={directory.label} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
  <button type="button" className="directory-close" aria-label={`Close ${directory.label}`} onClick={onClose}><X size={24}/></button>
  <div className="directory-tabs" role="tablist" aria-label={`${directory.label} categories`}>
   {directory.groups.map((entry,index)=><button key={entry.id} id={`${id}-tab-${index}`} type="button" role="tab" aria-selected={group.id===entry.id} aria-controls={`${id}-panel-${index}`} tabIndex={group.id===entry.id?0:-1} onClick={()=>setSelected(entry.id)} onKeyDown={event=>{
    let next=index;if(event.key==='ArrowRight')next=(index+1)%directory.groups.length;else if(event.key==='ArrowLeft')next=(index-1+directory.groups.length)%directory.groups.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=directory.groups.length-1;else return;
    event.preventDefault();setSelected(directory.groups[next].id);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
   }}>{entry.name}<ChevronDown size={16} aria-hidden="true"/></button>)}
  </div>
  <div id={`${id}-panel-${directory.groups.indexOf(group)}`} role="tabpanel" aria-labelledby={`${id}-tab-${directory.groups.indexOf(group)}`} tabIndex={0} className="directory-links">
   {group.items.length?group.items.map(item=><a key={item.id} href={href(item.link)} onClick={event=>onNavigate(event,item.link)}>{item.name}</a>):<p>No listings in this category yet.</p>}
  </div>
 </section>;
}
