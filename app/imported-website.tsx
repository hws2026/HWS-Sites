'use client';
import {idleSession} from '@/lib/idle-session';
import {isImportedInquiry} from '@/lib/imported-inquiry';
import {connectImportedInquiry} from './imported-inquiry';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {WebsiteViewProps} from './website-view';
import type {Block} from '@/lib/editor-model';
import type {ImportedEdits} from '@/lib/imported-template';
import {applyOriginalEdits,makeImportedDocument,nodePath,originalDocument,originalSection} from '@/lib/imported-document';
import {apiFetch,assetUrl,isPages,isPublicVisitor} from '@/lib/client-runtime';
import {SiteFavicon} from './site-image';

function isolatedHost(host:HTMLElement,tools=false){
 const shadow=host.attachShadow({mode:'open'});
 document.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(style=>{const clone=style.cloneNode(true) as HTMLElement;if(clone.tagName==='LINK')(clone as HTMLLinkElement).href=(style as HTMLLinkElement).href;shadow.append(clone);});
 const style=document.createElement('style');style.textContent=tools?':host{position:absolute;inset:0 0 auto;z-index:1000;pointer-events:none}button,.drop-zone{pointer-events:auto}.section-tools{position:relative;top:0;right:0;float:right}':':host{display:block;font:16px/1.5 Arial,sans-serif}.website-header,.website-footer,.website-announcement{display:none!important}.website{min-height:0!important}';shadow.append(style);
 const mount=document.createElement('div');shadow.append(mount);return mount;
}

export function ImportedWebsite(props:WebsiteViewProps&{renderNative:(block:Block)=>React.ReactNode}){
 const {site,page,selected,onSelect,onEditChrome,onPage,base='',renderTools,renderNative,onImportedSelect,onImportedDrop}=props;
 const frame=useRef<HTMLIFrameElement>(null),current=useRef(props);current.current=props;
 const [doc,setDoc]=useState<Document|null>(null),[height,setHeight]=useState(900),[portals,setPortals]=useState<{id:string;node:HTMLElement}[]>([]),[tools,setTools]=useState<HTMLElement|null>(null);
 const editing=Boolean(onSelect),structure=page.blocks.map(b=>[b.id,b.imported?.page,b.imported?.section,b.hidden,b.hideOnMobile].join(':')).join('|');
 const assetBase=typeof window==='undefined'?'':new URL(assetUrl('/imported-templates/paradis-photo-booths/'),window.location.href).href;
 // Content edits are applied in place; typing never reloads the frame or resets its menus.
 const html=useMemo(()=>typeof DOMParser==='undefined'?'':makeImportedDocument(site,page,assetBase,editing),[page.id,page.importedPage,structure,assetBase,editing]);
 const previous=useRef(new Map<HTMLElement,ImportedEdits>()),media=useRef(new Map<string,string>());
 useEffect(()=>{previous.current.clear();setDoc(null);setPortals([]);setTools(null);},[html]);
 useEffect(()=>()=>{media.current.forEach(url=>URL.revokeObjectURL(url));media.current.clear();},[]);

 useEffect(()=>{
  if(!doc)return;
  const resize=()=>setHeight(editing?Math.max(700,window.innerHeight-240):window.innerHeight);
  window.addEventListener('resize',resize);resize();
  const mounts:Array<{id:string;node:HTMLElement}>=[];
  doc.querySelectorAll<HTMLElement>('[data-hws-native]').forEach(host=>mounts.push({id:host.dataset.hwsSection!,node:isolatedHost(host)}));setPortals(mounts);
  let lastActivity=0;const activity=(event:Event)=>{if(current.current.onSelect&&event.isTrusted&&document.visibilityState!=='hidden'&&Date.now()-lastActivity>1000){lastActivity=Date.now();idleSession.touch();}};
  const events=['pointerdown','pointermove','keydown','wheel','touchstart'];events.forEach(name=>doc.addEventListener(name,activity,{passive:true}));
  const click=(event:MouseEvent)=>{
   const target=event.target as HTMLElement;if(!target?.closest||target.closest('[data-hws-tools],[data-hws-native]'))return;
   const p=current.current;
   if(p.onSelect){
    const chrome=target.closest<HTMLElement>('.site-header,.site-footer'),section=target.closest<HTMLElement>('[data-hws-section]');
    if(chrome){p.onEditChrome?.(chrome.matches('.site-footer')?'footer':'header');p.onImportedSelect?.(nodePath(chrome,target));}
    else if(section){p.onSelect(section.dataset.hwsSection!);p.onImportedSelect?.(nodePath(section,target));}
    // Keep mobile menus and FAQ toggles usable while editing; links select their fields.
    if(target.closest('a,form button[type=submit]'))event.preventDefault();
    return;
   }
   const anchor=target.closest<HTMLAnchorElement>('a');if(!anchor)return;
   const pageId=anchor.dataset.hwsPage;
   if(pageId&&p.onPage&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey){event.preventDefault();p.onPage(pageId);return;}
   const hash=anchor.dataset.hwsAnchor;if(hash){event.preventDefault();const element=doc.getElementById(hash);if(element){element.scrollIntoView({block:'start',behavior:'smooth'});}return;}
  };
  const submit=(event:SubmitEvent)=>{if(current.current.onSelect){event.preventDefault();event.stopImmediatePropagation();}};
  const dragover=(event:DragEvent)=>{if(current.current.onImportedDrop)event.preventDefault();};
  const drop=(event:DragEvent)=>{const p=current.current;if(!p.onImportedDrop)return;event.preventDefault();const section=(event.target as HTMLElement).closest<HTMLElement>('[data-hws-section]'),index=p.page.blocks.findIndex(b=>b.id===section?.dataset.hwsSection);p.onImportedDrop(event,index<0?p.page.blocks.length:index);};
  doc.addEventListener('click',click,true);doc.addEventListener('submit',submit,true);doc.addEventListener('dragover',dragover);doc.addEventListener('drop',drop);
  return()=>{window.removeEventListener('resize',resize);events.forEach(name=>doc.removeEventListener(name,activity));doc.removeEventListener('click',click,true);doc.removeEventListener('submit',submit,true);doc.removeEventListener('dragover',dragover);doc.removeEventListener('drop',drop);};
 },[doc]);

 useEffect(()=>{
  if(!doc)return;let active=true;
  const chromeSource=originalDocument(page.importedPage??'index.html');
  const roots:Array<{root:HTMLElement;original:HTMLElement;edits:ImportedEdits}>=[];
  for(const name of ['header','footer'] as const){const root=doc.querySelector<HTMLElement>('.site-'+name),original=chromeSource.querySelector<HTMLElement>('.site-'+name);if(root&&original)roots.push({root,original,edits:site.imported?.[name]??{}});}
  doc.querySelectorAll<HTMLElement>('[data-hws-section]').forEach(root=>{const block=page.blocks.find(b=>b.id===root.dataset.hwsSection);if(block?.imported)roots.push({root,original:originalSection(block.imported),edits:block.imported.edits});});
  for(const {root,original,edits} of roots){
   applyOriginalEdits(root,original,edits,previous.current.get(root));previous.current.set(root,structuredClone(edits));
   root.querySelectorAll<HTMLAnchorElement>('a').forEach(anchor=>{
    const path=nodePath(root,anchor),sourceNode=path==='root'?original:path.split('.').reduce<Node|undefined>((node,n)=>node?.childNodes[Number(n)],original);
    const href=edits[path]?.href??(sourceNode as Element|undefined)?.getAttribute?.('href')??'';
    delete anchor.dataset.hwsPage;delete anchor.dataset.hwsAnchor;
    if(href.startsWith('#')){anchor.dataset.hwsAnchor=href.slice(1);anchor.setAttribute('href',href);return;}
    const [file,hash]=href.replace(/^\.\//,'').split('#');
    const destination=site.pages.find(p=>p.importedPage===file)||site.pages.find(p=>p.slug===file);
    if(destination){anchor.dataset.hwsPage=destination.id;anchor.href=base?base.replace(/\/$/,'')+(destination.id===site.pages[0].id?'':'/'+destination.slug)+(hash?'#'+hash:''):'#';anchor.target='_top';}
    else if(/^[\w-]+\.html$/.test(file)){anchor.href='#';anchor.removeAttribute('target');}
    else{anchor.setAttribute('href',href.startsWith('/media/')?new URL(assetUrl(href),window.location.href).href:href);anchor.target=anchor.getAttribute('target')==='_blank'?'_blank':'_top';if(anchor.target==='_blank')anchor.rel='noopener noreferrer';}
   });
   root.querySelectorAll<HTMLImageElement>('img').forEach(img=>{
    const path=nodePath(root,img),originalImage=path.split('.').reduce<Node|undefined>((node,n)=>node?.childNodes[Number(n)],original) as HTMLImageElement|undefined;
    const src=edits[path]?.src??originalImage?.getAttribute('src');if(!src)return;
    if(src.startsWith('/media/')&&isPages&&!isPublicVisitor()){
     const cached=media.current.get(src);if(cached)img.src=cached;
     else{img.removeAttribute('src');void apiFetch(src).then(r=>{if(!r.ok)throw new Error('Image unavailable');return r.blob();}).then(blob=>{if(!active)return;let url=media.current.get(src);if(!url){url=URL.createObjectURL(blob);media.current.set(src,url);}img.src=url;}).catch(()=>{if(active)img.alt='Image could not be loaded. Check its upload in the editor.';});}
    }else img.src=src.startsWith('/')?new URL(assetUrl(src),window.location.href).href:src;
   });
  }
 },[doc,site,page,base]);

 useEffect(()=>{
  if(!doc)return;doc.querySelectorAll('[data-hws-tools]').forEach(host=>host.remove());setTools(null);
  doc.querySelectorAll<HTMLElement>('[data-hws-section]').forEach(root=>{const active=root.dataset.hwsSection===selected;root.classList.toggle('hws-selected',active&&editing);if(active&&editing&&!root.dataset.hwsNative){const host=doc.createElement('div');host.dataset.hwsTools='true';root.appendChild(host);setTools(isolatedHost(host,true));root.scrollIntoView({block:'nearest'});}});
 },[doc,selected,editing]);
 const formSettings=page.blocks.filter(isImportedInquiry).map(b=>[b.id,b.formEnabled,b.formSuccessMessage].join(':')).join('|');
 useEffect(()=>{if(!doc)return;const dispose:Array<()=>void>=[];doc.querySelectorAll<HTMLFormElement>('.local-inquiry').forEach(form=>{const id=form.closest<HTMLElement>('[data-hws-section]')?.dataset.hwsSection,block=page.blocks.find(b=>b.id===id);if(block&&isImportedInquiry(block))dispose.push(connectImportedInquiry(form,{pageId:page.id,formId:block.id,live:isPublicVisitor()&&!editing,enabled:block.formEnabled!==false,message:block.formSuccessMessage}));});return()=>dispose.forEach(fn=>fn());},[doc,page.id,formSettings,editing]);
 const block=page.blocks.find(b=>b.id===selected);
 return <div className="imported-website">{site.favicon&&!editing&&<SiteFavicon src={site.favicon}/>}<iframe ref={frame} title={site.name+' | '+page.name} srcDoc={html} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation allow-downloads" style={{display:'block',border:0,width:'100%',height}} onLoad={()=>setDoc(frame.current?.contentDocument??null)}/>{portals.map(({id,node})=>{const b=page.blocks.find(item=>item.id===id);return b?createPortal(renderNative(b),node,id):null;})}{tools&&block&&renderTools&&createPortal(renderTools(block),tools)}</div>;
}
