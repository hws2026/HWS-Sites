import {isPages} from './client-runtime';
// Keep navigation in the URL, not a shared browser preference. Reloading and
// copying a URL preserves the view; another account still passes normal gates.
export function readViewState(key:string){if(typeof window==='undefined')return '';const query=isPages?window.location.hash.split('?')[1]??'':window.location.search;return new URLSearchParams(query).get(key)??'';}
export function replaceViewState(values:Record<string,string|null>){
 if(typeof window==='undefined')return;
 const url=new URL(window.location.href),path=isPages?url.hash.slice(1).split('?')[0]:url.pathname;
 const query=new URLSearchParams(isPages?url.hash.split('?')[1]??'':url.search);
 for(const [key,value] of Object.entries(values)){if(value===null||value==='')query.delete(key);else query.set(key,value);}
 if(isPages)url.hash=(path||'/')+(query.size?'?'+query:'');else url.search=query.toString();
 if(url.href!==window.location.href)window.history.replaceState(window.history.state,'',url.href);
}
