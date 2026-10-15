'use client';
import {Globe} from 'lucide-react';

export const socialPlatforms=[
 {id:'facebook',label:'Facebook',placeholder:'https://www.facebook.com/your-page'},
 {id:'instagram',label:'Instagram',placeholder:'https://www.instagram.com/your-account'},
 {id:'youtube',label:'YouTube',placeholder:'https://www.youtube.com/@your-channel'},
 {id:'x',label:'X',placeholder:'https://x.com/your-account'},
 {id:'linkedin',label:'LinkedIn',placeholder:'https://www.linkedin.com/company/your-company'},
 {id:'tiktok',label:'TikTok',placeholder:'https://www.tiktok.com/@your-account'},
 {id:'pinterest',label:'Pinterest',placeholder:'https://www.pinterest.com/your-account'},
] as const;
export type SocialLink={label:string;url:string};
export function socialPlatform(label:string){
 const normalized=label.trim().toLowerCase();
 return socialPlatforms.find(p=>p.id==='x'?normalized==='x'||normalized==='twitter':normalized.includes(p.id));
}
export function parseSocialLinks(value=''):SocialLink[]{
 return value.split('\n').filter(line=>line.trim()).map(line=>{const [label,...url]=line.split('|');return {label:label.trim(),url:url.join('|').trim()};});
}
export function validSocialUrl(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[|\r\n]/.test(value);}catch{return false;}
}
export function normalizeSocialUrl(value:string){
 const trimmed=value.trim(),candidate=/^[a-z][a-z\d+.-]*:/i.test(trimmed)||trimmed.startsWith('//')?trimmed:'https://'+trimmed;
 return validSocialUrl(candidate)?new URL(candidate).href:trimmed;
}
// Keep the existing storage format so older websites and the deployed API continue to work.
export function serializeSocialLinks(links:SocialLink[]){
 return links.filter(link=>link.url.trim()).map(({label,url})=>`${label.trim()}|${url.trim()}`).join('\n');
}
export function SocialLogo({label,size=18}:{label:string;size?:number}){
 const id=socialPlatform(label)?.id;
 const props={width:size,height:size,viewBox:'0 0 24 24','aria-hidden':true as const,focusable:false as const,'data-social-logo':id??'website'};
 if(id==='instagram')return <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor"/></svg>;
 if(id==='youtube')return <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"/></svg>;
 if(id==='facebook')return <svg {...props} fill="currentColor"><path d="M14 22v-9h3l.5-4H14V6.5c0-1.1.3-1.5 1.7-1.5H18V1.4C17.5 1.2 16.1 1 14.5 1 11.3 1 9 3 9 6.5V9H6v4h3v9z"/></svg>;
 if(id==='linkedin')return <svg {...props} fill="currentColor"><path d="M5.4 3.8a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0ZM1.5 7.5h3.6V22H1.5zM8 7.5h3.5v2h.1c.5-1 1.7-2.3 3.8-2.3 4.1 0 4.9 2.7 4.9 6.2V22h-3.7v-7.6c0-1.8 0-4.1-2.5-4.1s-2.8 2-2.8 4V22H8z"/></svg>;
 if(id==='x')return <svg {...props} fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l8.1-9.3L.8 2h6.5l5.6 8.1L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg>;
 if(id==='tiktok')return <svg {...props} fill="currentColor"><path d="M16.7 1h-4v14.6a3.3 3.3 0 1 1-2.9-3.3V8.2a7.4 7.4 0 1 0 7 7.4V8.2a9.4 9.4 0 0 0 5.6 1.8V6a5.7 5.7 0 0 1-5.7-5Z"/></svg>;
 if(id==='pinterest')return <svg {...props} fill="currentColor"><path d="M12 1a11 11 0 0 0-4 21.2c0-.9 0-2 .2-3l1.4-6s-.4-.7-.4-1.8c0-1.7 1-3 2.3-3 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.7-1.1 4.2-.3 1.3.7 2.4 2 2.4 2.4 0 4.2-2.5 4.2-6.2 0-3.2-2.3-5.4-5.5-5.4-3.8 0-6 2.8-6 5.7 0 1.1.4 2.4 1 3 .1.1.1.2.1.4l-.4 1.5c0 .2-.2.3-.4.2-1.6-.7-2.6-3-2.6-4.9 0-4 2.9-7.6 8.5-7.6 4.5 0 8 3.2 8 7.5 0 4.5-2.8 8.2-6.7 8.2-1.3 0-2.6-.7-3.1-1.5l-.8 3.1c-.3 1.1-1.1 2.5-1.6 3.4A11 11 0 1 0 12 1Z"/></svg>;
 return <Globe size={size} aria-hidden="true" data-social-logo="website"/>;
}
export function SocialLinks({value}:{value?:string}){
 const links=parseSocialLinks(value).filter(link=>link.label&&validSocialUrl(link.url));
 if(!links.length)return null;
 return <div className="website-social" aria-label="Social media">{links.map(({label,url},i)=><a key={i} href={new URL(url).href} aria-label={`${label} (opens in new tab)`} title={label} target="_blank" rel="noopener noreferrer"><SocialLogo label={label}/><span className="social-label">{label}</span></a>)}</div>;
}
