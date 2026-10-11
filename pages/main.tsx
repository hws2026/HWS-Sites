import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import Suite from '@/app/admin/suite';
import Editor from '@/app/editor';
import {WebsiteView} from '@/app/website-view';
import {referenceTemplate,referenceTemplates} from '@/lib/templates';
import type {Website} from '@/lib/editor-model';
import {apiFetch,appHref} from '@/lib/client-runtime';
import {initializeAuth,AuthScreen,supabase} from './auth';
import '@/app/globals.css';
import '@/app/commerce.css';
import '@/app/website-fonts.css';
import '@/app/website-design.css';
import '@/app/website-fidelity.css';
import '@/app/finalsite-composition.css';
function Published({id,slug,pageSlug}:{id:string;slug:string;pageSlug?:string}){const [site,setSite]=useState<Website|null>(null);const [error,setError]=useState('');useEffect(()=>{const abort=new AbortController();void apiFetch('/api/published?id='+encodeURIComponent(id),{signal:abort.signal}).then(async r=>{const data=await r.json() as {error?:string;site:Website};if(!r.ok)throw new Error(data.error??'Website unavailable');setSite(data.site);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[id]);if(error)return <main className="publication-empty"><h1>Website unavailable</h1><p>{error}</p><a href={appHref('/signin')}>Sign in</a></main>;if(!site)return <main className="publication-empty">Loading website…</main>;const page=pageSlug?site.pages.find(p=>p.slug===pageSlug):site.pages[0];if(site.slug!==slug||!page)return <main className="publication-empty">Page not found.</main>;return <div className="published-page"><WebsiteView site={site} siteId={id} page={page} base={appHref(`/website/${id}/${slug}`)}/></div>;}
function DemoPreview({templateId}:{templateId:string}){useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[templateId]);const [site]=useState(()=>referenceTemplate(templateId));const [pageId,setPageId]=useState(site.pages[0].id);const page=site.pages.find(p=>p.id===pageId)??site.pages[0];return <div className="published-page"><WebsiteView site={site} siteId={'demo-'+templateId} page={page} onPage={id=>{setPageId(id);window.scrollTo({top:0,behavior:'instant'});}}/></div>;}
function App(){const [route,setRoute]=useState(window.location.hash.slice(1)||'/');useEffect(()=>{const onHash=()=>setRoute(window.location.hash.slice(1)||'/');window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);const path=route.split('?')[0];if(path==='/signout'){return <SignOut/>;}if(path.startsWith('/site-admin/'))return <AuthScreen key={path} siteId={decodeURIComponent(path.slice(12))}/>;if(path==='/signin')return <AuthScreen/>;if(path==='/reset-password')return <AuthScreen reset siteId={new URLSearchParams(route.split('?')[1]??'').get('site')??undefined}/>;if(path.startsWith('/demo/')){const id=path.slice(6);if(referenceTemplates.some(t=>t.id===id))return <DemoPreview key={id} templateId={id}/>;}if(path.startsWith('/editor/'))return <Editor key={path} siteId={decodeURIComponent(path.slice(8))}/>;if(path.startsWith('/website/')){const [, ,id,slug,pageSlug]=path.split('/');return <Published key={id+slug+pageSlug} id={id} slug={slug} pageSlug={pageSlug}/>;}if(path==='/'||path==='/admin'||path==='/portal')return <Suite key={path} portal={path==='/portal'}/>;return <main className="publication-empty"><h1>Page not found</h1><a href={appHref('/')}>Return to dashboard</a></main>;}
function SignOut(){useEffect(()=>{void supabase?.auth.signOut().then(()=>{window.location.hash='/signin';});if(!supabase)window.location.hash='/signin';},[]);return <main className="publication-empty">Signing out…</main>;}
const params=new URLSearchParams(window.location.search);
const root=createRoot(document.getElementById('root')!);
let disposed=false;
import.meta.hot?.dispose(()=>{disposed=true;root.unmount();});
void initializeAuth().then(()=>{if(disposed)return;if(params.has('code')){const recovery=params.has('recovery');history.replaceState(null,'',window.location.pathname+(recovery?'#/reset-password'+(params.get('site')?'?site='+encodeURIComponent(params.get('site')!):''):'#/portal'));}root.render(<App/>);});
