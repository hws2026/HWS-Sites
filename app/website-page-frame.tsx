import type {ReactNode} from 'react';
import type {Page,Website} from '@/lib/editor-model';
import {pageAncestors} from '@/lib/page-tree';
import {SiteImage} from './site-image';
export function WebsitePageFrame({site,page,children,href,onNavigate}:{site:Website;page:Page;children:ReactNode;href:(value:string)=>string;onNavigate:(event:React.MouseEvent,value:string)=>void}){
 if(page.id===site.pages[0].id)return <>{children}</>;
 const ancestors=pageAncestors(site.pages,page),root=ancestors[0]??page;const siblings=site.pages.filter(p=>p.parentId===(page.parentId??page.id)&&!p.hidden);const items=siblings.length?siblings:site.pages.filter(p=>p.parentId===root.id&&!p.hidden);
 return <div className={'interior-page page-layout-'+(page.layout??'sidebar')}>
 {page.banner&&<div className="interior-banner"><SiteImage src={page.banner} alt=""/></div>}
 {page.breadcrumbs!==false&&<nav className="page-breadcrumbs" aria-label="Breadcrumb"><a href={href('home')} onClick={e=>onNavigate(e,'home')}>Home</a>{ancestors.filter(a=>a.id!==site.pages[0].id).map(a=><span key={a.id}><span aria-hidden="true">/</span><a href={href(a.slug)} onClick={e=>onNavigate(e,a.slug)}>{a.name}</a></span>)}<span aria-current="page"><span aria-hidden="true">/</span>{page.name}</span></nav>}
 <div className="interior-heading"><h1>{page.name}</h1>{page.summary&&<p>{page.summary}</p>}</div>
 <div className="interior-grid">{(page.layout??'sidebar')==='sidebar'&&items.length>0&&<aside className="page-section-nav"><details open><summary>{root.navLabel||root.name}</summary><nav aria-label="In this section"><a href={href(root.slug)} onClick={e=>onNavigate(e,root.slug)} aria-current={page.id===root.id?'page':undefined}>Overview</a>{items.map(item=><div key={item.id}><a href={href(item.slug)} onClick={e=>onNavigate(e,item.slug)} aria-current={item.id===page.id?'page':undefined}>{item.navLabel||item.name}</a>{item.id===page.id&&site.pages.filter(p=>p.parentId===item.id&&!p.hidden).map(child=><a className="section-nav-child" key={child.id} href={href(child.slug)} onClick={e=>onNavigate(e,child.slug)}>{child.navLabel||child.name}</a>)}</div>)}</nav></details></aside>}<div className="interior-content">{children}</div></div></div>;
}
