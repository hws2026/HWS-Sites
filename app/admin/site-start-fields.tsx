'use client';
import type {ClientSite,Customer} from '@/lib/suite-model';
import {templateChoices,archivedTemplateMessage} from '@/lib/template-catalog';
import type {WebsiteSource} from '@/lib/create-website';
import type {TemplateStartMode} from '@/lib/template-start';
import {TemplateStartOptions} from '../template-start-options';

export function SiteStartFields(props:{
 portal:boolean;email:string;customers:Customer[];sites:ClientSite[];archivedIds:string[];
 customerId:string;setCustomerId:(id:string)=>void;source:WebsiteSource;setSource:(value:WebsiteSource)=>void;
 sourceSiteId:string;setSourceSiteId:(id:string)=>void;contextSiteId:string;setContextSiteId:(id:string)=>void;
 templateId:string;setTemplateId:(id:string)=>void;startMode:TemplateStartMode|'outline'|'design';setStartMode:(mode:TemplateStartMode|'outline'|'design')=>void;
}){
 const {portal,email,customers,sites,archivedIds,customerId,setCustomerId,source,setSource,sourceSiteId,setSourceSiteId,contextSiteId,setContextSiteId,templateId,setTemplateId,startMode,setStartMode}=props;
 const eligible=sites.filter(s=>!s.archived&&s.role!=='viewer'&&(!portal||s.customer_id||s.role==='admin'));
 const context=eligible.find(s=>s.id===contextSiteId);
 const sameOrganization=eligible.filter(s=>s.customer_id===(portal?context?.customer_id:customerId==='self'?'':customerId));
 const available=templateChoices.filter(t=>!archivedIds.includes(t.id));
 const selected=eligible.find(s=>s.id===sourceSiteId);
 function chooseSource(value:WebsiteSource){setSource(value);setStartMode(value==='existing'?'outline':'scratch');if(value==='existing'&&!sameOrganization.some(s=>s.id===sourceSiteId))setSourceSiteId(sameOrganization[0]?.id??'');if(value==='template'&&!available.some(t=>t.id===templateId))setTemplateId(available[0]?.id??'');}
 return <>
  {portal?<label>Organization website<select value={contextSiteId} required onChange={e=>{setContextSiteId(e.target.value);setSourceSiteId(e.target.value);}}><option value="">Choose an organization…</option>{eligible.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><span className="field-help">The new website belongs to the same organization as this assigned site.</span></label>:<label>Website owner<select value={customerId} onChange={e=>{setCustomerId(e.target.value);const existing=eligible.find(s=>s.customer_id===(e.target.value==='self'?'':e.target.value));setSourceSiteId(existing?.id??'');setSource(existing?'existing':'blank');setStartMode(existing?'outline':'scratch');}}><option value="self">My account{email?' · '+email:''}</option>{customers.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
  <fieldset className="template-start-options site-source-options"><legend>Starting point</legend>{[
   {value:'blank',title:'Blank website',description:'A neutral design and one empty Home page. Build everything your way.'},
   {value:'template',title:'Template library',description:'Choose an available design and decide how much sample content to include.'},
   {value:'existing',title:'Use an existing website',description:'Keep your organization’s current design, pages, and menus.'},
  ].map(option=><label className={source===option.value?'selected':''} key={option.value}><input type="radio" name="website-source" checked={source===option.value} disabled={option.value==='existing'&&!sameOrganization.length||option.value==='template'&&!available.length} onChange={()=>chooseSource(option.value as WebsiteSource)}/><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</fieldset>
  {source==='template'&&<><label>Starting template<select value={templateId} required onChange={e=>setTemplateId(e.target.value)}><option value="" disabled>Choose a template…</option>{available.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><TemplateStartOptions value={startMode==='full'?'full':'scratch'} onChange={setStartMode}/></>}
  {source==='existing'&&<><label>Source website<select value={sourceSiteId} required onChange={e=>setSourceSiteId(e.target.value)}><option value="">Choose a website…</option>{sameOrganization.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>{selected&&archivedIds.includes(selected.template_id)&&<p className="template-archive-notice" role="status">{archivedTemplateMessage}</p>}<fieldset className="template-start-options"><legend>What should carry over?</legend>{[
   {value:'outline',title:'Copy outline; start with empty pages',description:'Keep the header/footer, colors, pages, and menus. Clear page sections, sample events, and saved content.'},
   {value:'design',title:'Copy design only',description:'Keep the visual style and branding with one empty Home page. Build new pages and menus.'},
   {value:'full',title:'Copy the whole website',description:'Start with the current saved design and content, then customize the new draft.'},
  ].map(option=><label className={startMode===option.value?'selected':''} key={option.value}><input name="existing-start-mode" type="radio" checked={startMode===option.value} onChange={()=>setStartMode(option.value as 'outline'|'design'|'full')}/><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</fieldset><p className="field-help">The original website stays as it is. The copy starts unpublished, with separate responses and domain settings.</p></>}
 </>;
}
