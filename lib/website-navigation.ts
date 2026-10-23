import {pageAncestors} from './page-tree';
import {collectionTypes,getBlockItems,type Block,type Website} from './editor-model';
export type WebsiteSearchResult={pageId:string;slug:string;title:string;excerpt:string};
const normalize=(text:string)=>text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
/** Search the visitor-visible draft/snapshot, never private or hidden content. */
export function searchWebsite(site:Website,query:string):WebsiteSearchResult[]{
 const terms=normalize(query.trim()).split(/\s+/).filter(Boolean);
 if(query.trim().length<2)return [];
 return site.pages.filter(page=>!page.hidden&&!pageAncestors(site.pages,page).some(parent=>parent.hidden)).map(page=>{
  const collect=(blocks:Block[]):string[]=>blocks.filter(b=>!b.hidden).flatMap(b=>[b.title,b.text,...getBlockItems(b).flatMap(i=>[i.title,i.text,i.meta,...collect(i.children??[])]),...collect(b.children??[])]);const content=collect(page.blocks).join(' ').replace(/\s+/g,' ').trim();
  const title=normalize(page.name),normalized=normalize(content),haystack=title+' '+normalized;
  if(!terms.every(term=>haystack.includes(term)))return null;
  const match=Math.max(0,normalized.indexOf(terms[0]));const start=Math.max(0,match-45);
  return {pageId:page.id,slug:page.slug,title:page.name,excerpt:(start?'…':'')+content.slice(start,start+150)+(content.length>start+150?'…':''),score:terms.reduce((score,term)=>score+(title.includes(term)?10:1),0)};
 }).filter((result):result is WebsiteSearchResult&{score:number}=>result!==null).sort((a,b)=>b.score-a.score).slice(0,12).map(({score,...result})=>result);
}

/** Resolve local links in both the real website and the editor's phone preview. */
export function resolveWebsitePage(site:Website,value:string,base=''){
 const raw=value.trim();if(!raw||/^(mailto:|tel:|#|\/\/|\/media\/)/i.test(raw))return undefined;
 let path=raw;
 if(/^https?:/i.test(raw)){
  try{const target=new URL(raw),root=base?new URL(base,typeof location==='undefined'?'https://preview.invalid':location.href):null;if(!root||target.origin!==root.origin)return undefined;path=target.pathname;if(root.pathname!=='/'&&path.startsWith(root.pathname+'/'))path=path.slice(root.pathname.length);}catch{return undefined;}
 }
 path=path.split(/[?#]/)[0].replace(/^\/+|\/+$/g,'');try{path=decodeURIComponent(path);}catch{return undefined;}
 if(!path&&raw.startsWith('/'))return site.pages[0];
 return site.pages.find(p=>p.id===path||p.slug===path)??site.pages.find(p=>p.name.toLowerCase()===path.toLowerCase())??site.pages.find(p=>path==='calendar'&&/calendar|events/i.test(p.name)||path==='news'&&/news|happening|updates/i.test(p.name)||path==='contact'&&/^contact|^map.*directions/i.test(p.name)||path==='about'&&/about|our school|our district/i.test(p.name));
}
