import {visitorWebsite} from '../lib/publication';
import {submitPublicForm} from './forms';
import {database} from '../lib/suite-store';
import type {BackendEnv} from '../lib/server-context';
import type {Website} from '../lib/editor-model';
import {getMediaObject,mediaResponse} from '../lib/media-storage';

const unavailable=()=>new Response('Website unavailable',{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function publicSite(request:Request,env:BackendEnv):Promise<Response|null>{
 const url=new URL(request.url),db=database();
 let record=await db.prepare('SELECT d.site_id,d.status,s.published,MAX(s.archived,COALESCE((SELECT c.archived FROM customers c WHERE c.id=s.customer_id AND c.owner=s.owner),0)) archived,COALESCE(p.enabled,0) enabled FROM site_domains d JOIN client_sites s ON s.id=d.site_id LEFT JOIN site_publications p ON p.site_id=s.id WHERE d.hostname=?').bind(url.hostname).first<{site_id:string;status:string;published:string|null;archived:number;enabled:number}>();
 let basePath='',path=url.pathname;
 if(!record){const match=path.match(/^\/sites\/([a-zA-Z0-9-]+)(?:\/(.*))?$/);if(!match)return null;basePath='/sites/'+match[1];path='/'+(match[2]??'');record=await db.prepare("SELECT s.id site_id,'active' status,s.published,MAX(s.archived,COALESCE((SELECT c.archived FROM customers c WHERE c.id=s.customer_id AND c.owner=s.owner),0)) archived,COALESCE(p.enabled,0) enabled FROM client_sites s LEFT JOIN site_publications p ON p.site_id=s.id WHERE s.id=?").bind(match[1]).first();if(!record)return unavailable();}
 if(record.status!=='active'||record.archived||!record.enabled||!record.published)return unavailable();
 const site=visitorWebsite(JSON.parse(record.published) as Website);
 if(url.protocol==='http:'&&!['localhost','127.0.0.1'].includes(url.hostname)){url.protocol='https:';return Response.redirect(url.href,308);}
 if(path==='/api/forms'&&request.method==='POST')return submitPublicForm(request,record.site_id,site);
 if(!['GET','HEAD'].includes(request.method)||path.startsWith('/api/'))return unavailable();
 const primary=await db.prepare("SELECT hostname FROM site_domains WHERE site_id=? AND status='active' AND is_primary=1").bind(record.site_id).first<{hostname:string}>();
 if(primary&&primary.hostname!==url.hostname){url.hostname=primary.hostname;url.pathname=path;url.protocol='https:';url.port='';return new Response(null,{status:302,headers:{Location:url.href,'Cache-Control':'no-store'}});}
 const media=path.match(/^\/media\/([a-zA-Z0-9-]+)$/);
 if(media){
  const publishedMedia=new Set<string>();const collect=(v:unknown)=>{if(typeof v==='string'&&v.startsWith('/media/'))publishedMedia.add(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};
  collect({...site,pages:site.pages.map(page=>({...page,blocks:page.blocks.filter(b=>!b.hidden)}))});
  if(!publishedMedia.has(path))return unavailable();
  const row=await db.prepare('SELECT key,content_type,filename FROM media WHERE id=? AND site_id=?').bind(media[1],record.site_id).first<{key:string;content_type:string;filename:string}>();if(!row)return unavailable();
  const file=await getMediaObject(env,row.key,request.headers.get('Range'));if(!file)return unavailable();
  return mediaResponse(file,row.content_type,row.filename,'no-store',request.method==='HEAD');
 }
 if(path==='/robots.txt')return new Response(request.method==='HEAD'?null:'User-agent: *\nAllow: /\nSitemap: '+url.origin+basePath+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
 if(path==='/sitemap.xml')return new Response(request.method==='HEAD'?null:'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+site.pages.filter(p=>!p.hidden).map(p=>'<url><loc>'+escape(url.origin+basePath+(p.id===site.pages[0].id?'/':'/'+encodeURIComponent(p.slug)))+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
 let slug:string;try{slug=decodeURIComponent(path.replace(/^\/|\/$/g,''));}catch{return unavailable();}
 const page=slug?site.pages.find(p=>p.slug===slug):site.pages[0];if(!page)return unavailable();
 const frontend=new URL(env.FRONTEND_URL!);frontend.hash='';frontend.search='';if(!frontend.pathname.endsWith('/'))frontend.pathname+='/';
 const shell=await fetch(new URL('visitor.html',frontend),{signal:AbortSignal.timeout(10000)});if(!shell.ok)return new Response('Website is being deployed. Please try again shortly.',{status:503,headers:{'Cache-Control':'no-store'}});
 const favicon=site.favicon?site.favicon.startsWith('/media/')?url.origin+basePath+site.favicon:site.favicon.startsWith('/')?new URL(site.favicon.slice(1),frontend).href:site.favicon:'';
 const icon=favicon&&/^https:\/\//.test(favicon)?'<link rel="icon" href="'+escape(favicon)+'">':'';
 const data=JSON.stringify({site:{...site,pages:site.pages.map(p=>({...p,blocks:p.blocks.filter(b=>!b.hidden)}))},siteId:record.site_id,frontendUrl:frontend.href,basePath,pageId:page.id}).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 const response=new HTMLRewriter().on('head',{element(element){element.append(icon+'<script id="hws-public-data" type="application/json">'+data+'</script><link rel="canonical" href="'+escape(url.origin+basePath+(page.id===site.pages[0].id?'/':'/'+encodeURIComponent(page.slug)))+'">',{html:true});}}).on('title',{element(element){element.setInnerContent(site.name+' | '+(page.id===site.pages[0].id?'Homepage':page.name));}}).on('[src],link[href]',{element(element){for(const attr of ['src','href']){const value=element.getAttribute(attr);if(value)element.setAttribute(attr,new URL(value,frontend).href);}}}).transform(shell);
 const headers=new Headers({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
 return new Response(request.method==='HEAD'?null:response.body,{headers});
}
