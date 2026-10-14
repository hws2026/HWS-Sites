'use client';
import {imageSizingStyle, type ImageSizing} from '@/lib/image-sizing';
import {useEffect,useState} from 'react';
import {assetUrl,apiFetch,isPages,isPublicVisitor} from '@/lib/client-runtime';
export function useMediaSource(src = '') {
 const privateMedia=isPages&&!isPublicVisitor()&&src.startsWith('/media/');
 const [loaded,setLoaded]=useState<{source:string;url:string;error:string}>({source:'',url:'',error:''});
 useEffect(()=>{
  if(!privateMedia)return;
  const abort=new AbortController();let object='';
  void apiFetch(src,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Media unavailable. Sign in again or retry.');return r.blob();}).then(blob=>{if(abort.signal.aborted)return;object=URL.createObjectURL(blob);setLoaded({source:src,url:object,error:''});}).catch(error=>{if(!abort.signal.aborted)setLoaded({source:src,url:'',error:error.message});});
  return()=>{abort.abort();if(object)URL.revokeObjectURL(object);};
 },[src,privateMedia]);
 return privateMedia?{src:loaded.source===src?loaded.url:'',error:loaded.source===src?loaded.error:''}:{src:assetUrl(src),error:''};
}
export function SiteImage({src,sizing,style,...props}:React.ImgHTMLAttributes<HTMLImageElement>&{sizing?:ImageSizing}){const media=useMediaSource(String(src??''));return <img {...props} style={{...style,...imageSizingStyle(sizing)}} src={media.src||undefined}/>;}
export function SiteFavicon({src}:{src:string}){
 const media=useMediaSource(src);
 useEffect(()=>{
  if(!media.src)return;
  const existing=document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const icon=existing??document.createElement('link'),previous=existing?.getAttribute('href');
  icon.rel='icon';icon.href=media.src;if(!existing)document.head.appendChild(icon);
  return()=>{if(existing){if(previous!==null&&previous!==undefined)icon.setAttribute('href',previous);else icon.removeAttribute('href');}else icon.remove();};
 },[media.src]);
 return null;
}
export function SiteVideo({src,poster,...props}:React.VideoHTMLAttributes<HTMLVideoElement>){const media=useMediaSource(String(src??'')),image=useMediaSource(poster);return media.error?<p role="alert">{media.error}</p>:<video {...props} src={media.src||undefined} poster={image.src||undefined} playsInline preload="metadata"/>;}
