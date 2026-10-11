import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {WebsiteView} from '@/app/website-view';
import {setVisitorFrontend} from '@/lib/client-runtime';
import type {Website} from '@/lib/editor-model';
import '@/app/globals.css';
import '@/app/website-fonts.css';
import '@/app/website-design.css';
import '@/app/website-fidelity.css';
import '@/app/finalsite-composition.css';
import '@/app/website-modules.css';
type Payload={site:Website;siteId:string;frontendUrl:string;basePath:string;pageId:string};
function Visitor({data}:{data:Payload}){const [pageId,setPageId]=useState(data.pageId);const page=data.site.pages.find(p=>p.id===pageId)??data.site.pages[0];useEffect(()=>{document.title=page.name+' | '+data.site.name;const canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(canonical)canonical.href=location.origin+data.basePath+(page.id===data.site.pages[0].id?'/':'/'+encodeURIComponent(page.slug));},[page,data.site]);useEffect(()=>{const back=()=>{const slug=decodeURIComponent(location.pathname.slice(data.basePath.length).replace(/^\/|\/$/g,''));setPageId((data.site.pages.find(p=>p.slug===slug)??data.site.pages[0]).id);window.scrollTo(0,0);};window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[data]);return <div className="published-page"><WebsiteView site={data.site} siteId={data.siteId} page={page} base={location.origin+data.basePath} onPage={id=>{const destination=data.site.pages.find(p=>p.id===id);if(!destination)return;history.pushState(null,'',data.basePath+(id===data.site.pages[0].id?'/':'/'+encodeURIComponent(destination.slug)));setPageId(id);window.scrollTo({top:0,behavior:'instant'});}}/></div>;}
const raw=document.getElementById('hws-public-data')?.textContent;
const root=createRoot(document.getElementById('root')!);
if(raw){const data=JSON.parse(raw) as Payload;setVisitorFrontend(data.frontendUrl,data.basePath);root.render(<Visitor data={data}/>);}else root.render(<main className="publication-empty"><h1>Website unavailable</h1><p>Open the website using its connected domain.</p></main>);
