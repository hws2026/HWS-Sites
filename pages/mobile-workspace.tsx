import {useEffect,useState} from 'react';
import {CalendarDays,CreditCard,Inbox,LogOut,Monitor,RefreshCw} from 'lucide-react';
import {Toaster} from 'sonner';
import {BillingPanel} from '@/app/admin/billing-panel';
import {WebsitePaymentsPanel} from '@/app/admin/website-payments-panel';
import {FormsInbox} from '@/app/forms-inbox';
import {CalendarManager} from '@/app/calendar-editor';
import {apiFetch,appHref,assetUrl} from '@/lib/client-runtime';
import {responseJson,failureReason} from '@/lib/api-error';
import {isMobileBrowser} from '@/lib/device-access';
import type {Website} from '@/lib/editor-model';
import './mobile-workspace.css';

type Site={id:string;title:string;role:string};
type Workspace={email:string;role:string;sites:Site[]};
type View='billing'|'forms'|'events';
const tabs=[{id:'billing',label:'Billing',icon:CreditCard},{id:'forms',label:'Forms',icon:Inbox},{id:'events',label:'Events',icon:CalendarDays}] as const;

export function MobileWorkspace({route}:{route:string}){
 const params=new URLSearchParams(route.split('?')[1]??''),view=(tabs.some(t=>t.id===params.get('view'))?params.get('view'):'forms') as View;
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[dirty,setDirty]=useState(false),[billing,setBilling]=useState<'suite'|'website'>('suite');
 useEffect(()=>{
  document.title='Mobile workspace | Husky Suite';const abort=new AbortController();setError('');
  void (async()=>{await responseJson(await apiFetch('/api/mobile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'activate'}),signal:abort.signal}));const next=await responseJson<Workspace>(await apiFetch('/api/mobile',{signal:abort.signal}));if(!abort.signal.aborted)setData(next);})().catch(e=>{if(!abort.signal.aborted){setData(null);setError(failureReason(e));}});
  return()=>abort.abort();
 },[attempt]);
 function navigate(next:View){if(next===view)return;if(dirty&&!window.confirm('Leave without saving your event changes?'))return;setDirty(false);location.hash='/mobile?view='+next;}
 const editable=data?.sites.filter(s=>s.role==='admin'||s.role==='editor')??[];
 return <div className="mobile-workspace">
  <header className="mobile-workspace-header"><a href={appHref('/mobile')} aria-label="Husky Suite mobile workspace"><img src={assetUrl('/husky-suite-logo.png')} alt="Husky Suite"/></a><div><strong>Mobile workspace</strong><small>{data?.email??'Your suite, on the go'}</small></div><a className="mobile-signout" href={appHref('/signout')} aria-label="Sign out"><LogOut size={20}/></a></header>
  <main className="mobile-workspace-main">
   {error?<div className="mobile-state" role="alert"><h1>Unable to open your workspace</h1><p>{error}</p><button className="button" onClick={()=>setAttempt(v=>v+1)}><RefreshCw size={16}/>Try again</button><a href={appHref('/signin')}>Sign in again</a></div>:!data?<p className="mobile-state" role="status">Loading your workspace…</p>:<>
    <div className="mobile-view-heading"><span>HUSKY SUITE</span><h1>{tabs.find(t=>t.id===view)?.label}</h1><p>{view==='billing'?'Manage bills and payments.':view==='forms'?'Read and manage your website responses.':'Keep your website calendars up to date.'}</p></div>
    {view==='billing'&&<><div className="mobile-billing-switch" role="group" aria-label="Billing area"><button aria-pressed={billing==='suite'} onClick={()=>setBilling('suite')}>Suite billing</button><button aria-pressed={billing==='website'} onClick={()=>setBilling('website')}>Website payments</button></div>{billing==='suite'?<BillingPanel demo={false} portal={data.role!=='admin'} customers={[]}/>:<WebsitePaymentsPanel/>}</>}
    {view==='forms'&&<FormsInbox sites={editable} initialSiteId={params.get('site')??''}/>}
    {view==='events'&&<MobileEvents sites={editable} initialSiteId={params.get('site')??''} onDirty={setDirty}/>}
    <p className="mobile-desktop-note"><Monitor size={16}/>Use a computer for the website editor and full administration.{!isMobileBrowser()&&<a href={appHref(data.role==='admin'?'/admin':'/portal')}>Open full workspace</a>}</p>
   </>}
  </main>
  {data&&<nav className="mobile-workspace-nav" aria-label="Mobile workspace">{tabs.map(({id,label,icon:Icon})=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={22}/><span>{label}</span></button>)}</nav>}
  <Toaster richColors position="top-center"/>
 </div>;
}

type CalendarData={site:Website;revision:number;role:string;published:boolean};
function MobileEvents({sites,initialSiteId,onDirty}:{sites:Site[];initialSiteId:string;onDirty:(dirty:boolean)=>void}){
 const [siteId,setSiteId]=useState(sites.some(s=>s.id===initialSiteId)?initialSiteId:sites[0]?.id??'');
 const [data,setData]=useState<CalendarData|null>(null),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{onDirty(dirty);const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>{window.removeEventListener('beforeunload',warn);onDirty(false);};},[dirty,onDirty]);
 useEffect(()=>{
  setData(null);setError('');setNotice('');setDirty(false);if(!siteId)return;
  const abort=new AbortController();void apiFetch('/api/events?siteId='+encodeURIComponent(siteId),{signal:abort.signal}).then(responseJson<CalendarData>).then(next=>{if(!abort.signal.aborted)setData(next);}).catch(e=>{if(!abort.signal.aborted)setError(failureReason(e));});return()=>abort.abort();
 },[siteId,attempt]);
 async function save(publish:boolean){
  if(!data||busy)return;setBusy(true);setError('');setNotice('');
  try{const next=await responseJson<CalendarData>(await apiFetch('/api/events?siteId='+encodeURIComponent(siteId),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:data.revision,calendarEvents:data.site.calendarEvents,calendarTimeZone:data.site.calendarTimeZone??'America/New_York',publish})}));setData({...data,...next});setDirty(false);setNotice(publish?'Events published. Connected live calendars are updated.':'Events saved. Publish events to update the live website.');}catch(e){setError(failureReason(e));}finally{setBusy(false);}
 }
 if(!sites.length)return <div className="mobile-state"><CalendarDays size={32}/><h2>No calendars available</h2><p>Your administrator can assign you a website with event editing access.</p></div>;
 return <section className="mobile-events" aria-label="Website events">
  <label>Website<select value={siteId} disabled={busy} onChange={e=>{if(!dirty||window.confirm('Discard your unsaved event changes and switch websites?'))setSiteId(e.target.value);}}>{sites.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
  {error&&<div className="commerce-error" role="alert"><p>{error}</p><button className="button" disabled={busy} onClick={()=>{if(!dirty||window.confirm('Discard your unsaved changes and reload the latest events?'))setAttempt(n=>n+1);}}>Reload events</button></div>}
  {notice&&<p className="mobile-save-notice" role="status">{notice}</p>}
  {data?<><div className="mobile-event-save"><span>{busy?'Saving…':dirty?'Unsaved event changes':'Saved calendar'}</span><button className="button" disabled={busy||!dirty} onClick={()=>void save(false)}>Save events</button>{data.role==='admin'&&<button className="button primary" disabled={busy||!data.published} onClick={()=>void save(true)}>Publish events</button>}</div>{!data.published&&<p className="field-help">This website is unpublished. Save events here, then publish the website from a computer.</p>}<fieldset className="mobile-calendar-fields" disabled={busy}><CalendarManager key={siteId} site={data.site} saveHint="Add or edit an event, then tap Save events. Administrators can publish calendar changes without publishing other website edits." onChange={site=>{setData({...data,site});setDirty(true);setNotice('');}}/></fieldset></>:!error&&<p role="status">Loading events…</p>}
 </section>;
}
