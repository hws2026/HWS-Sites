import {paradisDocuments,paradisBehaviors} from './imported-template-documents';
import type {ImportedEdits,ImportedSection} from './imported-template';
import type {Page,Website} from './editor-model';

export function originalDocument(file='index.html'){
 const source=paradisDocuments[file];
 if(!source)throw new Error('The original template page was not found.');
 return new DOMParser().parseFromString(source,'text/html');
}
export function originalSection(source:ImportedSection){return originalDocument(source.page).querySelector('#tve_editor')!.children[source.section] as HTMLElement;}
export function nodeAt(root:Node,path:string):Node|null{return path==='root'?root:path.split('.').reduce<Node|null>((node,index)=>node?.childNodes[Number(index)]??null,root);}
export function nodePath(root:Node,node:Node):string{
 const path:number[]=[];let cursor:Node|null=node;
 while(cursor&&cursor!==root){const parent:ParentNode|null=cursor.parentNode;if(!parent)return 'root';path.unshift(Array.prototype.indexOf.call(parent.childNodes,cursor));cursor=parent;}
 return path.length?path.join('.'):'root';
}
export type OriginalField={path:string;kind:'text'|'image'|'link';label:string;value:string;alt?:string;stylePath:string};
export function originalFields(root:HTMLElement):OriginalField[]{
 const fields:OriginalField[]=[];
 const walk=(node:Node)=>{
  if(node.nodeType===3&&node.textContent?.trim()&&!['SCRIPT','STYLE','TEXTAREA'].includes(node.parentElement?.tagName??'')){
   const text=node.textContent;fields.push({path:nodePath(root,node),kind:'text',value:text,label:text.trim().slice(0,90),stylePath:nodePath(root,node.parentElement!)});
  }
  if(node.nodeType===1){const el=node as HTMLElement;if(el.matches('script,style,svg,.draft-output,.clear-draft,.inquiry-submit,.local-form-note,.local-inquiry > p'))return;
   if(el.matches('img'))fields.push({path:nodePath(root,el),stylePath:nodePath(root,el),kind:'image',label:el.getAttribute('alt')||'Image',value:el.getAttribute('src')||'',alt:el.getAttribute('alt')||''});
   if(el.matches('a[href]'))fields.push({path:nodePath(root,el),stylePath:nodePath(root,el),kind:'link',label:el.textContent?.trim().slice(0,90)||'Image link',value:el.getAttribute('href')||''});
  }
  node.childNodes.forEach(walk);
 };walk(root);return fields;
}
// Paths address existing nodes only. Never accept HTML, CSS selectors, script, or arbitrary attributes.
export function applyOriginalEdits(root:HTMLElement,original:HTMLElement,edits:ImportedEdits,previous:ImportedEdits={}){
 for(const path of new Set([...Object.keys(previous),...Object.keys(edits)])){
  const target=nodeAt(root,path),source=nodeAt(original,path);if(!target||!source)continue;
  const next=edits[path]??{},old=previous[path]??{};
  if(target.nodeType===3&&('text' in next||'text' in old))target.textContent=next.text??source.textContent;
  if(target.nodeType!==1||source.nodeType!==1)continue;
  const el=target as HTMLElement,baseline=source as HTMLElement;
  for(const attr of ['src','alt','href'] as const){if(!(attr in next)&&!(attr in old))continue;if(attr==='href'&&!el.matches('a')||attr!=='href'&&!el.matches('img'))continue;const value=next[attr]??baseline.getAttribute(attr);if(value===null)el.removeAttribute(attr);else el.setAttribute(attr,value);if(attr==='src')el.removeAttribute('srcset');}
  for(const key of new Set([...Object.keys(old.style??{}),...Object.keys(next.style??{})])){
   const prop=key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),value=next.style?.[key as keyof NonNullable<typeof next.style>];
   if(value)el.style.setProperty(prop,value,'important');else{const sourceValue=baseline.style.getPropertyValue(prop);if(sourceValue)el.style.setProperty(prop,sourceValue,baseline.style.getPropertyPriority(prop));else el.style.removeProperty(prop);}
  }
 }
}

export function makeImportedDocument(site:Website,page:Page,assetBase:string,editing:boolean){
 const doc=originalDocument(page.importedPage??'index.html'),container=doc.querySelector('#tve_editor')!;
 const originals=Array.from(container.children);container.replaceChildren();
 for(const block of page.blocks){
  if(block.hidden&&!editing)continue;
  const element=block.imported?(block.imported.page===(page.importedPage??'index.html')?originals[block.imported.section]:originalSection(block.imported))?.cloneNode(true) as HTMLElement:doc.createElement('div');
  if(!element)continue;
  element.dataset.hwsSection=block.id;
  if(block.hideOnMobile&&!editing)element.classList.add('hws-hide-mobile');
  if(block.hidden)element.classList.add('hws-hidden');
  if(!block.imported)element.dataset.hwsNative='true';
  container.appendChild(element);
  if(block.imported&&block.imported.page!==(page.importedPage??'index.html')){
   const css=doc.createElement('link');css.rel='stylesheet';css.href='styles/'+block.imported.page.replace('.html','.css');doc.head.appendChild(css);
  }
 }
 const base=doc.createElement('base');base.href=assetBase;doc.head.insertBefore(base,doc.head.firstChild);
 // Original exports contain obsolete WordPress editor handlers. They are never executed in the suite.
 doc.querySelectorAll('*').forEach(el=>{for(const attr of Array.from(el.attributes))if(/^on/i.test(attr.name))el.removeAttribute(attr.name);});
 const style=doc.createElement('style');style.textContent='html,body{min-height:0!important}body{overflow-x:hidden}'+(editing?'[data-hws-section]{cursor:pointer}[data-hws-section].hws-selected{outline:3px solid #2020b7;outline-offset:-3px}.hws-hidden{opacity:.45}':'')+'@media(max-width:600px){.hws-hide-mobile{display:none!important}}';doc.head.appendChild(style);
 // Keep original menu/FAQ behavior, with inquiry handling provided by the suite.
 doc.querySelectorAll('script').forEach(script=>script.remove());
 const behavior=doc.createElement('script');behavior.textContent=paradisBehaviors;doc.body.appendChild(behavior);
 return '<!doctype html>'+doc.documentElement.outerHTML;
}
