import {isMobileBrowser} from './device-access';
declare const __HWS_PAGES__:boolean;
declare const __HWS_API_URL__:string;
declare const __HWS_BASE_PATH__:string;
export const isPages=typeof __HWS_PAGES__!=='undefined'&&__HWS_PAGES__;
export const apiOrigin=isPages?__HWS_API_URL__:'';
export const basePath=isPages?__HWS_BASE_PATH__:'/';
let token='';
let sessionUser='';
let sessionGuard:(()=>boolean)|undefined;
export const setSessionGuard=(guard:()=>boolean)=>{sessionGuard=guard;};
export const setSessionUser=(id:string)=>{sessionUser=id;};
export const getSessionUser=()=>sessionUser;
let visitorFrontend='';
let visitorBase='';
export const isPublicVisitor=()=>Boolean(visitorFrontend);
export const setVisitorFrontend=(value:string,path='')=>{visitorFrontend=value.replace(/\/?$/,'/');visitorBase=path;};
export const setSessionToken=(value:string)=>{token=value;};
export const hasSession=()=>Boolean(token);
export const appHref=(path:string)=>visitorFrontend?visitorFrontend+'#'+path:isPages?basePath+'#'+path:path;
export const publicUrl=(path:string)=>isPages?window.location.origin+appHref(path):window.location.origin+path;
export const signInHref=(path='/')=>isPages?appHref('/signin?return_to='+encodeURIComponent(path)):'/signin-with-chatgpt?return_to='+encodeURIComponent(path);
export const signOutHref=()=>isPages?appHref('/signout'):'/signout-with-chatgpt?return_to=/';
export const siteAdminHref=(id:string)=>isPages?appHref('/site-admin/'+encodeURIComponent(id)):signInHref('/editor/'+id);
export const assetUrl=(path:string)=>visitorFrontend&&path.startsWith('/')&&!path.startsWith('//')?(path.startsWith('/media/')?visitorBase+path:visitorFrontend+path.slice(1)):isPages&&path.startsWith('/')&&!path.startsWith('//')?(path.startsWith('/media/')?apiOrigin+path:basePath+path.slice(1)):path;
export async function apiFetch(path:string,init:RequestInit={}){if(!isPages)return fetch(path,init);if(token&&sessionGuard&&!sessionGuard())throw new Error('Your session ended after inactivity. Sign in again to continue.');if(!apiOrigin)throw new Error('The backend connection is not configured.');const headers=new Headers(init.headers);headers.set('X-HWS-Device',isMobileBrowser()?'mobile':'desktop');if(token)headers.set('Authorization','Bearer '+token);return fetch(apiOrigin+path,{...init,headers,credentials:'omit'});}

export const publishedSiteUrl=(id:string,pageSlug?:string)=>apiOrigin+'/sites/'+encodeURIComponent(id)+'/'+(pageSlug?encodeURIComponent(pageSlug):'');

export const publicFormUrl=()=>visitorFrontend?visitorBase+'/api/forms':'';

export function uploadMedia(file: File, siteId: string, onProgress: (percent: number) => void, signal: AbortSignal): Promise<{url:string}> {
 return new Promise((resolve, reject) => {
  if(token&&sessionGuard&&!sessionGuard()){reject(new Error('Your session ended after inactivity. Sign in again to upload.'));return;}
  const xhr = new XMLHttpRequest();
  xhr.open('PUT', apiOrigin + '/api/upload?' + new URLSearchParams({siteId, filename:file.name, size:String(file.size)}));
  xhr.setRequestHeader('Content-Type', file.type);
  if(isPages)xhr.setRequestHeader('X-HWS-Device',isMobileBrowser()?'mobile':'desktop');
  if (isPages && token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.timeout = 600000;
  const abort = () => xhr.abort();
  const cleanup = () => signal.removeEventListener('abort', abort);
  xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100))); };
  xhr.onload = () => {
   cleanup();
   let result: {error?:string;url?:string} = {};
   try { result = JSON.parse(xhr.responseText); } catch { /* Gateway errors can return HTML. */ }
   if (xhr.status >= 200 && xhr.status < 300 && result.url) resolve({url:result.url});
   else reject(new Error(result.error || (xhr.status === 413 ? 'This file exceeds the storage upload limit. Maximum: 50 MB.' : xhr.status === 401 ? 'Your session expired. Sign in again, then retry the upload.' : `Upload failed (HTTP ${xhr.status}). Please retry.`)));
  };
  xhr.onerror = () => { cleanup(); reject(new Error('The upload connection was interrupted. Check your internet connection and retry.')); };
  xhr.ontimeout = () => { cleanup(); reject(new Error('The upload took longer than 10 minutes. Try a smaller file or a faster connection.')); };
  xhr.onabort = () => { cleanup(); reject(new DOMException('Upload canceled. The file was not added to your page.', 'AbortError')); };
  signal.addEventListener('abort', abort, {once:true});
  if (signal.aborted) { cleanup(); reject(new DOMException('Upload canceled.', 'AbortError')); return; }
  xhr.send(file);
 });
}

export async function downloadPrivateMedia(path: string) {
 const response = await apiFetch(path);
 if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to open this file.' : 'This file could not be opened. Please retry.');
 const blob = await response.blob(), url = URL.createObjectURL(blob);
 const name = response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)/)?.[1];
 const link = document.createElement('a'); link.href = url;
 try { link.download = name ? decodeURIComponent(name) : blob.type === 'application/pdf' ? 'document.pdf' : 'download'; } catch { link.download = 'download'; }
 link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
