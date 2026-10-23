import {SignInLocationOption} from './signin-location';
import {validSignInLocation,type SignInLocation} from '@/lib/signin-location';
import {idleSession,sessionIdentity} from '@/lib/idle-session';
import {isMobileBrowser,isPublicSuitePath} from '@/lib/device-access';
import {supabaseUrl,supabasePublishableKey} from './public-config';
import {createClient} from '@supabase/supabase-js';
import {useEffect,useState} from 'react';
import {assetUrl,apiFetch,appHref,setSessionToken,setSessionUser,setSessionGuard} from '@/lib/client-runtime';
import {referenceTemplates} from '@/lib/templates';
const url=import.meta.env.VITE_SUPABASE_URL||supabaseUrl, key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||supabasePublishableKey;
export const supabase=url&&key?createClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:true}}):null;
const authStorageKey='sb-'+(url?new URL(url).hostname.split('.')[0]:'')+'-auth-token';
let ending:Promise<void>|null=null;
export function endBrowserSession(reason:'inactive'|'signout'='signout'){
 if(ending)return ending;
 if(reason==='signout'&&idleSession.remaining()>0)void apiFetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})}).catch(()=>{});
 window.dispatchEvent(new Event('hws-session-ending'));
 const expiredSession=idleSession.read()?.session;
 idleSession.expire();setSessionToken('');setSessionUser('');
 window.dispatchEvent(new Event('hws-auth-changed'));
 ending=(async()=>{
  let deadline:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([supabase?.auth.signOut({scope:'local'}),new Promise(resolve=>{deadline=setTimeout(resolve,5000);})]);}catch{/* The local session must still end when offline. */}finally{clearTimeout(deadline);}
  if(idleSession.read()?.session===expiredSession&&idleSession.read()?.expired){
   try{localStorage.removeItem(authStorageKey);localStorage.removeItem(authStorageKey+'-code-verifier');localStorage.removeItem(authStorageKey+'-user');}catch{/* Storage may be unavailable. */}
  }
  const path=window.location.hash.slice(1).split('?')[0];
  if(reason!=='inactive'||!isPublicSuitePath(path)&&!path.startsWith('/editor/demo-'))window.location.hash='/signin'+(reason==='inactive'?'?reason=inactive':'');
 })().finally(()=>{ending=null;});
 return ending;
}
export async function initializeAuth(){
 if(!supabase)return;
 setSessionGuard(()=>{if(idleSession.remaining()>0)return true;void endBrowserSession('inactive');return false;});
 const accept=(session:{access_token:string;user:{id:string}}|null)=>{
  if(!session){setSessionToken('');setSessionUser('');return;}
  if(!idleSession.accept(sessionIdentity(session.access_token,session.user.id),session.user.id)){setSessionToken('');setSessionUser('');setTimeout(()=>void endBrowserSession('inactive'),0);return;}
  setSessionToken(session.access_token);setSessionUser(session.user.id);
 };
 const {data}=await supabase.auth.getSession();accept(data.session);
 supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){window.dispatchEvent(new Event('hws-session-ending'));idleSession.expire();}
  accept(session);window.dispatchEvent(new Event('hws-auth-changed'));
  if(event==='PASSWORD_RECOVERY'){const site=new URLSearchParams(window.location.search).get('site');window.location.hash='/reset-password'+(site?'?site='+encodeURIComponent(site):'');}
 });
}

type LoginSite={id:string;name:string;accent:string;slug?:string};
export function AuthScreen({reset=false,siteId}:{reset?:boolean;siteId?:string}){
 const [mode,setMode]=useState<'login'|'forgot'>(window.location.hash.includes('mode=forgot')?'forgot':'login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const [invalidLogin,setInvalidLogin]=useState(false);
 const [deviceLocation,setDeviceLocation]=useState<SignInLocation>();
 useEffect(()=>{setDeviceLocation(undefined);},[email,mode,reset]);
 const demo=siteId?.startsWith('demo-')?referenceTemplates.find(t=>t.id===siteId.slice(5)):undefined;
 const [site,setSite]=useState<LoginSite|null>(demo?{id:siteId!,name:demo.name,accent:demo.accent}:null);
 const root=window.location.origin+window.location.pathname;
 useEffect(()=>{if(!siteId||demo)return;const abort=new AbortController();void apiFetch('/api/site-login?id='+encodeURIComponent(siteId),{signal:abort.signal}).then(async response=>{if(response.ok){const data=await response.json() as {site:LoginSite};setSite(data.site);}}).catch(()=>{});return()=>abort.abort();},[siteId,demo]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;setBusy(true);setMessage('');setFailed(false);setInvalidLogin(false);
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
    if(ending)await ending;
    const loginResponse=await apiFetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,deviceLocation:validSignInLocation(deviceLocation)})});const login=await loginResponse.json() as {error?:string;access_token:string;refresh_token:string};if(!loginResponse.ok){setInvalidLogin(loginResponse.status===401);throw new Error(login.error??'Sign-in failed.');}const {data,error}=await supabase.auth.setSession({access_token:login.access_token,refresh_token:login.refresh_token});if(error)throw error;
    if(data.session){idleSession.start(sessionIdentity(data.session.access_token,data.session.user.id),data.session.user.id);setSessionUser(data.session.user.id);}
    setSessionToken(data.session?.access_token??'');window.dispatchEvent(new Event('hws-auth-changed'));
    const setupResponse=await apiFetch('/api/me');const setup=await setupResponse.json() as {onboardingRequired?:boolean;role?:string;error?:string};if(!setupResponse.ok)throw new Error(setup.error??'Could not verify account setup.');if(setup.onboardingRequired){window.location.hash='/onboarding';return;}if(setup.role==='support'||setup.role==='billing'){window.location.hash='/team-workspace';return;}
    if(siteId){
     try{
      const response=await apiFetch('/api/site-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:siteId})});
      const access=await response.json() as {site:{id:string}|null;role?:string};
      if(!response.ok||access.site?.id!==siteId||!['admin','editor'].includes(access.role??''))throw new Error(response.status>=500?'Unable to verify website access. Please try again.':'Invalid account for this website.');
     }catch(error){setSessionToken('');await supabase.auth.signOut({scope:'local'});throw error;}
     window.location.hash=isMobileBrowser()?'/mobile?view=forms&site='+encodeURIComponent(siteId):'/editor/'+encodeURIComponent(siteId);
    }else{
     const target=new URLSearchParams(window.location.hash.split('?')[1]??'').get('return_to');
     const response=await apiFetch('/api/me');const account=await response.json() as {role?:string;error?:string};if(!response.ok)throw new Error(account.error??'Unable to load your account.');
     const targetPath=target?.split('?')[0];
     const validTarget=target&&/^\/(?:editor\/[a-zA-Z0-9-]+|admin|portal|mobile)(?:\?view=(?:billing|domains|forms|events))?$/.test(target);
     window.location.hash=isMobileBrowser()?'/mobile':validTarget&&(targetPath!=='/admin'||account.role==='admin')?target:account.role==='admin'?'/admin':'/portal';
    }
   }
  }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);setDeviceLocation(undefined);}
 }
 const returnLink=siteId?appHref('/site-admin/'+encodeURIComponent(siteId)):appHref('/signin');
 return <main className={'auth-screen'+(siteId?' site-auth-screen':'')} style={site?{'--login-accent':site.accent} as React.CSSProperties:undefined}>
  <a className="brand" href={site?.slug?appHref(`/website/${siteId}/${site.slug}`):demo?appHref('/editor/'+siteId):appHref('/')}>{siteId?(site?.name??'Website administration'):<img className="husky-suite-logo" src={assetUrl('/husky-suite-logo.png')} alt="Husky Suite"/>}</a>
  <div className="auth-card">
   {siteId&&<span className="auth-site-label">{site?.name??'This website'} · Admin access</span>}
   <h1>{reset?'Set a new password':mode==='forgot'?'Reset your password':siteId?'Website admin login':'Welcome back'}</h1>
   <p>{reset?'Choose a password of at least 12 characters.':siteId?'Sign in with an account assigned to this website.':isMobileBrowser()?'Sign in to manage Billing, Forms, and Events.':'Your websites and workspace, in one place.'}</p>
   {!reset&&new URLSearchParams(window.location.hash.split('?')[1]??'').get('reason')==='inactive'&&<p role="status">You were signed out after 30 minutes of inactivity. Sign in again to continue. Any unsaved website draft can be recovered in its editor in this tab.</p>}
   {!supabase&&<p role="status">Sign-in is not configured yet.</p>}
   <form onSubmit={submit}>
    {!reset&&<label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>}
    {(reset||mode!=='forgot')&&<label>Password<input type="password" autoComplete={reset?'new-password':'current-password'} minLength={reset?12:1} value={password} onChange={e=>setPassword(e.target.value)} required/></label>}
    {reset&&<label>Confirm password<input type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>}
    {!reset&&mode==='login'&&!demo&&<SignInLocationOption key={email} value={deviceLocation} onChange={setDeviceLocation} disabled={busy}/>}
    <button className="button primary" disabled={busy||!supabase}>{busy?'Please wait…':reset?'Update password':mode==='forgot'?'Send reset email':'Sign in'}</button>
   </form>
   {invalidLogin&&!reset&&mode==='login'?<p role="alert" className="auth-error auth-login-error">Login failed, please make sure your username and password are correct. For security reasons, your attempt will be logged, for more information please visit: <a href="https://www.huskysol.com/legal" target="_blank" rel="noopener noreferrer">Privacy and account policies</a></p>:message&&<p role={failed?'alert':'status'} className={failed?'auth-error':''}>{message}</p>}
   {!reset&&<div className="auth-links">
    {mode==='forgot'&&<button onClick={()=>{setMode('login');setMessage('');setInvalidLogin(false);}}>Back to sign in</button>}
    {mode==='login'&&<button onClick={()=>{setMode('forgot');setMessage('');setInvalidLogin(false);}}>Forgot password?</button>}
   </div>}
   {reset?<a href={returnLink}>Return to sign in</a>:siteId?<p className="auth-scope-note">Access to another customer’s website does not grant access here.</p>:<p className="auth-scope-note">Accounts are provided by your administrator. Sign in to access your workspace.</p>}
  </div>
 </main>;
}
