'use client';
import {readViewState,replaceViewState} from '@/lib/view-state';
import {useEffect,useState} from 'react';
import {Archive,ExternalLink,Plus} from 'lucide-react';
import {referenceTemplates} from '@/lib/templates';
import {templateChoices} from '@/lib/template-catalog';
import {appHref,assetUrl} from '@/lib/client-runtime';

export function TemplateLibrary({archivedIds,busy,onUse,onAction}:{archivedIds:string[];busy:boolean;onUse:(id:string)=>void;onAction:(payload:Record<string,unknown>)=>Promise<unknown>}){
 const [archived,setArchived]=useState(()=>readViewState('templates')==='archived');
 useEffect(()=>{replaceViewState({templates:archived?'archived':null});},[archived]);
 const choices=templateChoices.filter(t=>archivedIds.includes(t.id)===archived);
 return <><div className="list-toolbar"><label>Library view<select value={archived?'archived':'available'} onChange={e=>setArchived(e.target.value==='archived')}><option value="available">Available templates</option><option value="archived">Archived templates</option></select></label><span>{choices.length} templates</span></div><p className="template-library-help">Archiving removes a design from template pickers. Existing websites keep their design, content, and editing access.</p><div className="template-gallery">{choices.map(choice=>{
 const t=referenceTemplates.find(t=>t.id===choice.id);
 return <article className="reference-card" key={choice.id}>{t?<a href={appHref(`/editor/demo-${t.id}`)} className={'template-preview layout-preview-'+t.layout} style={{'--thumb-accent':t.accent} as React.CSSProperties}><div className="preview-top"><span>{t.name}</span><div><i/><i/><i/></div></div><div className="preview-photo"><img src={assetUrl(t.id==='paradis-photo-booths'?'/imported-templates/paradis-photo-booths/assets/d427c07a585344964fd59c9dfe21ad0d.jpg':'/demo-campus.webp')} alt={t.id==='paradis-photo-booths'?'Paradis Photo Booths original website':'Fictional sample campus'}/><span>{t.title}</span></div><div className="preview-columns"><i/><i/><i/></div></a>:<div className="template-preview simple-template-preview">{choice.name}</div>}<div className="reference-info"><span className="reference-category">{archived?'Archived':t?.category??'Flexible design'}</span><h2>{choice.name}</h2><p>{choice.description}</p><div>{t&&<a className="button" href={appHref(`/editor/demo-${t.id}`)}><ExternalLink size={14}/>Preview</a>}{!archived&&<button className="button primary" disabled={busy} onClick={()=>onUse(choice.id)}><Plus size={14}/>Use template</button>}<button className="button" disabled={busy} onClick={()=>void onAction({action:archived?'restore-template':'archive-template',templateId:choice.id})}><Archive size={14}/>{archived?'Restore template':'Archive template'}</button></div></div></article>;
 })}</div>{!choices.length&&<p className="large-empty">{archived?'No archived templates.':'No available templates. Restore a template or create a blank website.'}</p>}</>;
}
