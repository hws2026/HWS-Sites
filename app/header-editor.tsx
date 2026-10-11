'use client';
import {HeaderMenuEditor} from './header-menu-editor';
import {ColorEditor} from './color-editor';
import type {Website} from '@/lib/editor-model';
import {ImageField,LinkField} from './editor-controls';

export function HeaderEditor({site,onChange,onUpload,disabled}:{site:Website;onChange:(site:Website)=>void;onUpload:(file:File)=>void;disabled:boolean}){
 return <><p className="inspector-hint">Edit the header here. Click a menu name on the canvas to edit that menu’s links and style.</p>
  <label>Header name<input value={site.name} maxLength={120} onChange={e=>onChange({...site,name:e.target.value})}/></label>
  <ImageField label="Header logo" value={site.logo??''} onChange={logo=>onChange({...site,logo})} onUpload={onUpload} disabled={disabled}/>
  <label>Tagline<input value={site.utilityLabel??''} onChange={e=>onChange({...site,utilityLabel:e.target.value})}/></label>
  <label>Utility links<textarea rows={4} value={site.utilityLinks??''} onChange={e=>onChange({...site,utilityLinks:e.target.value})}/><span className="field-help">One per line: Label | Page address. Use #directory for the school selector.</span></label>
  <label>Header resource links<textarea rows={4} value={site.headerLinks??''} onChange={e=>onChange({...site,headerLinks:e.target.value})}/><span className="field-help">One per line: Label | Page address.</span></label>
  <label className="native-check"><input type="checkbox" checked={site.searchEnabled??false} onChange={e=>onChange({...site,searchEnabled:e.target.checked})}/>Show search</label>
  <label className="native-check"><input type="checkbox" checked={site.stickyHeader??false} onChange={e=>onChange({...site,stickyHeader:e.target.checked})}/>Keep header visible while scrolling</label>
  <label>Announcement<input value={site.announcement??''} onChange={e=>onChange({...site,announcement:e.target.value})}/></label>
  <LinkField label="Announcement destination" value={site.announcementLink??''} onChange={announcementLink=>onChange({...site,announcementLink})} site={site}/>
 <HeaderMenuEditor site={site} onChange={onChange}/>
 <ColorEditor site={site} onChange={onChange}/>
 </>;
}
