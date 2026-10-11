import {collectionTypes,getBlockItems,type Website} from './editor-model';
export type WebsiteSearchResult={pageId:string;slug:string;title:string;excerpt:string};
const normalize=(text:string)=>text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
/** Search the visitor-visible draft/snapshot, never private or hidden content. */
export function searchWebsite(site:Website,query:string):WebsiteSearchResult[]{
 const terms=normalize(query.trim()).split(/\s+/).filter(Boolean);
 if(query.trim().length<2)return [];
 return site.pages.filter(page=>!page.hidden&&!site.pages.some(parent=>parent.id===page.parentId&&parent.hidden)).map(page=>{
  const content=page.blocks.filter(block=>!block.hidden).flatMap(block=>[block.title,...(collectionTypes.includes(block.type)?getBlockItems(block).flatMap(item=>[item.title,item.text,item.meta]):[block.text])]).join(' ').replace(/\s+/g,' ').trim();
  const title=normalize(page.name),normalized=normalize(content),haystack=title+' '+normalized;
  if(!terms.every(term=>haystack.includes(term)))return null;
  const match=Math.max(0,normalized.indexOf(terms[0]));const start=Math.max(0,match-45);
  return {pageId:page.id,slug:page.slug,title:page.name,excerpt:(start?'…':'')+content.slice(start,start+150)+(content.length>start+150?'…':''),score:terms.reduce((score,term)=>score+(title.includes(term)?10:1),0)};
 }).filter((result):result is WebsiteSearchResult&{score:number}=>result!==null).sort((a,b)=>b.score-a.score).slice(0,12).map(({score,...result})=>result);
}
