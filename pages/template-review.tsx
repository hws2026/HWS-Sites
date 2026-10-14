// Local-only review entry. It is deliberately absent from production build inputs.
import {createRoot} from 'react-dom/client';
import {useMemo,useState} from 'react';
import {referenceTemplate,referenceTemplates} from '@/lib/templates';
import {WebsiteView} from '@/app/website-view';
import '@/app/globals.css';
import '@/app/website-fonts.css';
import '@/app/website-design.css';
import '@/app/website-fidelity.css';
import '@/app/finalsite-composition.css';
import '@/app/website-modules.css';
function Review(){const [id,setId]=useState('sau70'),[width,setWidth]=useState(390),[slug,setSlug]=useState('home'),[motion,setMotion]=useState(false);const site=useMemo(()=>referenceTemplate(id),[id]),page=site.pages.find(p=>p.slug===slug)??site.pages[0];return <><div style={{padding:20,display:'flex',gap:24,background:'#edf2ee'}}><label>Template<select aria-label="Review template" value={id} onChange={e=>{setId(e.target.value);setSlug('home');}}>{referenceTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Width<select aria-label="Review width" value={width} onChange={e=>setWidth(Number(e.target.value))}>{[320,390,768,1024,1440].map(w=><option key={w}>{w}</option>)}</select></label><label>Page<select aria-label="Review page" value={page.slug} onChange={e=>setSlug(e.target.value)}>{site.pages.map(p=><option key={p.id} value={p.slug}>{p.name}</option>)}</select></label><label>Motion<input aria-label="Review motion" type="checkbox" checked={motion} onChange={e=>setMotion(e.target.checked)}/></label><strong>{site.pages.length} editable pages</strong></div><div data-review-canvas style={{width,maxWidth:'none',margin:20}}><WebsiteView site={{...site,animations:motion}} page={page} siteId={'demo-'+id} onPage={pageId=>setSlug(site.pages.find(p=>p.id===pageId)?.slug??'home')}/></div></>;}
createRoot(document.getElementById('root')!).render(<Review/>);
