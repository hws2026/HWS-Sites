import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import Suite from '@/app/admin/suite';
import Editor from '@/app/editor';
import {WebsiteView} from '@/app/website-view';
import {referenceTemplate,referenceTemplates} from '@/lib/templates';
import type {Website} from '@/lib/editor-model';
import {apiFetch,appHref,publishedSiteUrl,hasSession,setSessionToken} from '@/lib/client-runtime';
import {initializeAuth,AuthScreen,supabase} from './auth';
import '@/app/globals.css';
import '@/app/commerce.css';
import '@/app/website-fonts.css';
import '@/app/website-design.css';
import '@/app/website-fidelity.css';
import '@/app/finalsite-composition.css';
import '@/app/website-modules.css';
function Published({id,pageSlug}:{id:string;slug:string;pageSlug?:string}){const url=publishedSiteUrl(id,pageSlug);useEffect(()=>{window.location.replace(url);},[url]);return <main className="publication-empty" role="status">Opening public website… <a href={url}>Continue to website</a></main>;}
function DemoPreview({templateId,slug}:{templateId:string;slug?:string}){const [site]=useState(()=>referenceTemplate(templateId));const page=site.pages.find(p=>p.slug===slug)??site.pages[0];useEffect(()=>{document.title=page.name+' | '+site.name;window.scrollTo({top:0,behavior:'instant'});},[page.id,site.name]);return <div className="published-page"><WebsiteView site={site} siteId={'demo-'+templateId} page={page} base={appHref('/demo/'+templateId)} onPage={id=>{const destination=site.pages.find(p=>p.id===id);if(destination)location.hash='/demo/'+templateId+(destination.id===site.pages[0].id?'':'/'+destination.slug);}}/></div>;}
function Redirect({to}:{to:string}){useEffect(()=>{window.location.replace(appHref(to));},[to]);return <main className="publication-empty" role="status">Opening your workspace…</main>;}
function AccountHome(){
 const [destination,setDestination]=useState(hasSession()?'':'/signin');
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!hasSession())return;
  const abort=new AbortController();setError('');
  void apiFetch('/api/me',{signal:abort.signal}).then(async response=>{
   if(response.status===401){setSessionToken('');setDestination('/signin');return;}
   const account=await response.json() as {role?:string;error?:string};
   if(!response.ok)throw new Error(account.error??'Unable to load your account.');
   setDestination(account.role==='admin'?'/admin':'/portal');
  }).catch(error=>{if(!abort.signal.aborted)setError(error instanceof Error?error.message:'Unable to load your account.');});
  return()=>abort.abort();
 },[attempt]);
 if(destination)return <Redirect to={destination}/>;
 if(error)return <main className="publication-empty"><h1>Unable to open your workspace</h1><p role="alert">{error}</p><button className="button" onClick={()=>setAttempt(value=>value+1)}>Try again</button><a href={appHref('/signin')}>Sign in</a></main>;
 return <main className="publication-empty" role="status">Opening your workspace…</main>;
}
function App(){
 const [route,setRoute]=useState(window.location.hash.slice(1)||'/');
 useEffect(()=>{const onHash=()=>setRoute(window.location.hash.slice(1)||'/');window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
 const path=route.split('?')[0];
 if(path==='/')return <AccountHome/>;
 if(path==='/signout')return <SignOut/>;
 if(path.startsWith('/site-admin/'))return <AuthScreen key={path} siteId={decodeURIComponent(path.slice(12))}/>;
 if(path==='/signin')return <AuthScreen/>;
 if(path==='/reset-password')return <AuthScreen reset siteId={new URLSearchParams(route.split('?')[1]??'').get('site')??undefined}/>;
 if(path.startsWith('/demo/')){const [id,slug]=path.slice(6).split('/');if(referenceTemplates.some(t=>t.id===id))return <DemoPreview key={id} templateId={id} slug={slug}/>;}
 if(path.startsWith('/editor/')){
  const id=decodeURIComponent(path.slice(8));
  if(!id.startsWith('demo-')&&!hasSession())return <Redirect to={'/site-admin/'+encodeURIComponent(id)}/>;
  return <Editor key={path} siteId={id}/>;
 }
 if(path.startsWith('/website/')){const [, ,id,slug,pageSlug]=path.split('/');return <Published key={id+slug+pageSlug} id={id} slug={slug} pageSlug={pageSlug}/>;}
 if(path==='/admin'||path==='/portal'){
  if(!hasSession())return <Redirect to={'/signin?return_to='+encodeURIComponent(route)}/>;
  return <Suite key={path} portal={path==='/portal'}/>;
 }
 return <main className="publication-empty"><h1>Page not found</h1><a href={appHref('/')}>Return to sign in</a></main>;
}
function SignOut(){useEffect(()=>{void supabase?.auth.signOut().then(()=>{window.location.hash='/signin';});if(!supabase)window.location.hash='/signin';},[]);return <main className="publication-empty">Signing out…</main>;}
const params=new URLSearchParams(window.location.search);
const root=createRoot(document.getElementById('root')!);
let disposed=false;
import.meta.hot?.dispose(()=>{disposed=true;root.unmount();});
void initializeAuth().then(()=>{if(disposed)return;if(params.has('code')){const recovery=params.has('recovery');history.replaceState(null,'',window.location.pathname+(recovery?'#/reset-password'+(params.get('site')?'?site='+encodeURIComponent(params.get('site')!):''):'#/'));}root.render(<App/>);});
