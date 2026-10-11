'use client';
import {useState} from 'react';
import {ArrowUp,ArrowDown,Plus} from 'lucide-react';
import {MAX_PAGES,makeBlock,slugify,uid,type Website,type Page} from '@/lib/editor-model';

export function NavigationEditor({site,onChange,selectedId,onSelect}:{site:Website;onChange:(site:Website)=>void;selectedId:string;onSelect:(id:string)=>void}){
 const [newName,setNewName]=useState('');const [existingId,setExistingId]=useState('');
 const page=site.pages.find(p=>p.id===selectedId)??site.pages[0];
 const siblings=site.pages.filter(p=>p.parentId===page.parentId&&p!==site.pages[0]);
 const position=siblings.findIndex(p=>p.id===page.id);
 const patch=(value:Partial<Page>)=>onChange({...site,pages:site.pages.map(p=>p.id===page.id?{...p,...value}:p)});
 const move=(direction:number)=>{const other=siblings[position+direction];if(!other)return;const pages=[...site.pages],a=pages.findIndex(p=>p.id===page.id),b=pages.findIndex(p=>p.id===other.id);[pages[a],pages[b]]=[pages[b],pages[a]];onChange({...site,pages});};
 const parents=site.pages.filter(p=>p!==site.pages[0]&&!p.parentId&&p.id!==page.id);
 const hasChildren=site.pages.some(p=>p.parentId===page.id);
 const name=newName.trim(),slug=slugify(name),canAdd=name&&slug&&!site.pages.some(p=>p.slug===slug)&&site.pages.length<MAX_PAGES;
 const children=site.pages.filter(p=>p.parentId===page.id);const parent=site.pages.find(p=>p.id===page.parentId);const menu=parent??page;const effectiveStyle=menu.menuStyle??site.navigationStyle??'dropdown';
 return <div className="navigation-editor"><p className="inspector-hint">{parent?'Edit this link, or return to its parent menu.':'Choose a menu style, then edit the links inside it.'}</p>{parent&&<button className="button" onClick={()=>onSelect(parent.id)}>Back to {parent.navLabel||parent.name}</button>}
  <label>Menu item<select value={page.id} onChange={e=>onSelect(e.target.value)}>{site.pages.map(p=><option key={p.id} value={p.id}>{p.parentId?'↳ ':''}{p.navLabel||p.name}{p.hidden?' (hidden)':''}</option>)}</select></label>
  <label>Menu label<input maxLength={100} value={page.navLabel??page.name} onChange={e=>patch({navLabel:e.target.value})}/><span className="field-help">The page title stays “{page.name}”.</span></label>
  {!parent&&<><p className="panel-label">MENU STYLE</p><div className="menu-style-options">{[['dropdown','Mini dropdown','A compact list of links.'],['mega','Mega menu','A wider menu with columns or cards.']].map(([value,label,help])=><button type="button" key={value} aria-pressed={effectiveStyle===value} onClick={()=>patch({menuStyle:value as 'dropdown'|'mega'})}><strong>{label}</strong><span>{help}</span></button>)}</div>{effectiveStyle==='mega'&&<label>Mega-menu layout<select value={site.megaMenuLayout??'featured'} onChange={e=>onChange({...site,megaMenuLayout:e.target.value as Website['megaMenuLayout']})}><option value="featured">Overview and description cards</option><option value="columns">Two columns of links</option></select></label>}</>}
  <label className="native-check"><input type="checkbox" checked={!page.hidden} onChange={e=>patch({hidden:!e.target.checked})}/>Show in navigation</label>
  <label>Parent menu<select value={page.parentId??''} disabled={hasChildren||page===site.pages[0]} onChange={e=>patch({parentId:e.target.value||undefined})}><option value="">Main navigation</option>{parents.map(p=><option key={p.id} value={p.id}>{p.navLabel||p.name}{p.hidden?' (hidden)':''}</option>)}</select>{hasChildren&&<span className="field-help">Move this menu’s subpages before nesting it under another menu.</span>}</label>

  <div className="item-actions"><button className="button" disabled={position<=0} onClick={()=>move(-1)}><ArrowUp size={14}/>Earlier</button><button className="button" disabled={position<0||position===siblings.length-1} onClick={()=>move(1)}><ArrowDown size={14}/>Later</button></div>
  {!parent&&<><p className="panel-label">LINKS IN THIS MENU</p><div className="menu-child-list">{children.length?children.map(child=><div key={child.id}><button type="button" onClick={()=>onSelect(child.id)}><strong>{child.navLabel||child.name}</strong><span>{child.hidden?'Hidden · ':''}/{child.slug}</span></button><label className="menu-visible-toggle"><input type="checkbox" aria-label={`Show ${child.navLabel||child.name} in menu`} checked={!child.hidden} onChange={e=>onChange({...site,pages:site.pages.map(p=>p.id===child.id?{...p,hidden:!e.target.checked}:p)})}/>Show</label></div>):<p>No links yet. Add an existing page or create a page below.</p>}</div><label>Add an existing page<select value={existingId} onChange={e=>setExistingId(e.target.value)}><option value="">Choose a page…</option>{site.pages.filter(p=>p!==site.pages[0]&&p.id!==page.id&&p.parentId!==page.id&&!site.pages.some(c=>c.parentId===p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="button" className="button" disabled={!existingId} onClick={()=>{onChange({...site,pages:site.pages.map(p=>p.id===existingId?{...p,parentId:page.id,hidden:false}:p)});setExistingId('');}}>Add link to this menu</button></>}
  <div className="settings-divider"/><label>New {page.parentId?'sibling':'submenu'} page<input maxLength={100} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. School calendar"/></label>
  <button className="button" disabled={!canAdd} onClick={()=>{if(!canAdd)return;const id=uid(),parentId=page.parentId??(page===site.pages[0]?undefined:page.id);onChange({...site,pages:[...site.pages,{id,name,slug,parentId,blocks:[{...makeBlock('text'),title:name}]}]});onSelect(id);setNewName('');}}><Plus size={14}/>Add page to menu</button>
 </div>;
}
