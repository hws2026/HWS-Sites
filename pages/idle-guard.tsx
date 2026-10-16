import {useEffect,useState} from 'react';
import {IdleWarning} from '@/app/idle-warning';
import {hasSession} from '@/lib/client-runtime';
import {idleSession,IDLE_STORAGE_KEY,IDLE_WARNING_MS} from '@/lib/idle-session';
import {endBrowserSession} from './auth';

export function IdleGuard({path}:{path:string}){
 const [remaining,setRemaining]=useState<number|null>(null);
 const protectedPage=path==='/mobile'||path==='/admin'||path==='/portal'||path==='/'||path.startsWith('/editor/')&&!path.startsWith('/editor/demo-');
 useEffect(()=>{
  if(!protectedPage||!hasSession()){setRemaining(null);return;}
  let lastTouch=0;
  const check=()=>{if(!hasSession()){setRemaining(null);return;}const left=idleSession.remaining();setRemaining(left);if(left<=0)void endBrowserSession('inactive');};
  const activity=(event:Event)=>{if(!event.isTrusted||document.visibilityState==='hidden')return;if(idleSession.remaining()<=0){check();return;}if(Date.now()-lastTouch<1000)return;lastTouch=Date.now();idleSession.touch();check();};
  const storage=(event:StorageEvent)=>{if(event.key===IDLE_STORAGE_KEY)check();};
  const events=['pointerdown','pointermove','keydown','wheel','touchstart'];
  events.forEach(name=>window.addEventListener(name,activity,{passive:true}));
  window.addEventListener('storage',storage);window.addEventListener('focus',check);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);
  const interval=window.setInterval(check,1000);check();
  return()=>{events.forEach(name=>window.removeEventListener(name,activity));window.removeEventListener('storage',storage);window.removeEventListener('focus',check);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);clearInterval(interval);};
 },[protectedPage,path]);
 return remaining!==null&&remaining>0&&remaining<=IDLE_WARNING_MS?<IdleWarning seconds={Math.ceil(remaining/1000)} onStay={()=>{if(idleSession.touch())setRemaining(idleSession.remaining());else void endBrowserSession('inactive');}} onLogout={()=>void endBrowserSession('inactive')}/>:null;
}
