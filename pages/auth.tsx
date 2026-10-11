import {supabaseUrl,supabasePublishableKey} from './public-config';
import {createClient} from '@supabase/supabase-js';
import {useEffect,useState} from 'react';
import {apiFetch,appHref,setSessionToken} from '@/lib/client-runtime';
import {referenceTemplates} from '@/lib/templates';
const url=import.meta.env.VITE_SUPABASE_URL||supabaseUrl, key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||supabasePublishableKey;
export const supabase=url&&key?createClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:true}}):null;
export async function initializeAuth(){if(!supabase)return;const {data}=await supabase.auth.getSession();setSessionToken(data.session?.access_token??'');supabase.auth.onAuthStateChange((event,session)=>{setSessionToken(session?.access_token??'');if(event==='PASSWORD_RECOVERY'){const site=new URLSearchParams(window.location.search).get('site');window.location.hash='/reset-password'+(site?'?site='+encodeURIComponent(site):'');}});}
type LoginSite={id:string;name:string;accent:string;slug?:string};
export function AuthScreen({reset=false,siteId}:{reset?:boolean;siteId?:string}){
 const [mode,setMode]=useState<'login'|'forgot'>(window.location.hash.includes('mode=forgot')?'forgot':'login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const demo=siteId?.startsWith('demo-')?referenceTemplates.find(t=>t.id===siteId.slice(5)):undefined;
 const [site,setSite]=useState<LoginSite|null>(demo?{id:siteId!,name:demo.name,accent:demo.accent}:null);
 const root=window.location.origin+window.location.pathname;
 useEffect(()=>{if(!siteId||demo)return;const abort=new AbortController();void apiFetch('/api/site-login?id='+encodeURIComponent(siteId),{signal:abort.signal}).then(async response=>{if(response.ok){const data=await response.json() as {site:LoginSite};setSite(data.site);}}).catch(()=>{});return()=>abort.abort();},[siteId,demo]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;setBusy(true);setMessage('');setFailed(false);
  try{
   if(demo)throw new Error('This is a template preview. Create a customer website and assign its administrators before signing in.');
   if(reset){
    if(password!==confirm)throw new Error('Passwords do not match.');
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    setMessage('Password updated. Sign in again to open your website.');
   }else if(mode==='forgot'){
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:root+'?recovery=1'+(siteId?'&site='+encodeURIComponent(siteId):'')});if(error)throw error;
    setMessage('If this email has an account, a reset link will arrive shortly.');
   }else{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw new Error(siteId?'Invalid email or password for this website.':error.message);
    setSessionToken(data.session?.access_token??'');
    if(siteId){
     try{
      const response=await apiFetch('/api/site-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:siteId})});
      const access=await response.json() as {site:{id:string}|null;role?:string};
      if(!response.ok||access.site?.id!==siteId||!['admin','editor'].includes(access.role??''))throw new Error(response.status>=500?'Unable to verify website access. Please try again.':'Invalid account for this website.');
     }catch(error){setSessionToken('');await supabase.auth.signOut({scope:'local'});throw error;}
     window.location.hash='/editor/'+encodeURIComponent(siteId);
    }else{
     const target=new URLSearchParams(window.location.hash.split('?')[1]??'').get('return_to');
     const response=await apiFetch('/api/me');const account=await response.json() as {role?:string;error?:string};if(!response.ok)throw new Error(account.error??'Unable to load your account.');
     const targetPath=target?.split('?')[0];
     const validTarget=target&&/^\/(?:editor\/[a-zA-Z0-9-]+|admin|portal)(?:\?view=(?:billing|domains))?$/.test(target);
     window.location.hash=validTarget&&(targetPath!=='/admin'||account.role==='admin')?target:account.role==='admin'?'/admin':'/portal';
    }
   }
  }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
 }
 const returnLink=siteId?appHref('/site-admin/'+encodeURIComponent(siteId)):appHref('/signin');
 return <main className={'auth-screen'+(siteId?' site-auth-screen':'')} style={site?{'--login-accent':site.accent} as React.CSSProperties:undefined}>
  <a className="brand" href={site?.slug?appHref(`/website/${siteId}/${site.slug}`):demo?appHref('/editor/'+siteId):appHref('/')}>{site?.name??(siteId?'Website administration':'HWS Studio')}</a>
  <div className="auth-card">
   {siteId&&<span className="auth-site-label">{site?.name??'This website'} · Admin access</span>}
   <h1>{reset?'Set a new password':mode==='forgot'?'Reset your password':siteId?'Website admin login':'Welcome back'}</h1>
   <p>{reset?'Choose a password of at least 12 characters.':siteId?'Sign in with an account assigned to this website.':'Your websites and workspace, in one place.'}</p>
   {!supabase&&<p role="status">Sign-in is not configured yet.</p>}
   <form onSubmit={submit}>
    {!reset&&<label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>}
    {(reset||mode!=='forgot')&&<label>Password<input type="password" autoComplete={reset?'new-password':'current-password'} minLength={reset?12:1} value={password} onChange={e=>setPassword(e.target.value)} required/></label>}
    {reset&&<label>Confirm password<input type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>}
    <button className="button primary" disabled={busy||!supabase}>{busy?'Please wait…':reset?'Update password':mode==='forgot'?'Send reset email':'Sign in'}</button>
   </form>
   {message&&<p role={failed?'alert':'status'} className={failed?'auth-error':''}>{message}</p>}
   {!reset&&<div className="auth-links">
    {mode==='forgot'&&<button onClick={()=>{setMode('login');setMessage('');}}>Back to sign in</button>}
    {mode==='login'&&<button onClick={()=>{setMode('forgot');setMessage('');}}>Forgot password?</button>}
   </div>}
   {reset?<a href={returnLink}>Return to sign in</a>:siteId?<p className="auth-scope-note">Access to another customer’s website does not grant access here.</p>:<p className="auth-scope-note">Accounts are provided by your administrator. Sign in to access your workspace.</p>}
  </div>
 </main>;
}
