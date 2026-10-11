import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {sitePermission} from '@/lib/suite-store';
import {WebsiteView} from '@/app/website-view';
import type {Website} from '@/lib/editor-model';
export const dynamic='force-dynamic';
export default async function Published({params}:{params:Promise<{slug:string;path?:string[]}>}){const {slug:id,path}=await params;const h=await headers();const userId=h.get('oai-authenticated-user-id');if(!userId)return <main className="publication-empty"><h1>Sign in to view this website</h1><a className="button primary" href={`/signin-with-chatgpt?return_to=${encodeURIComponent(`/website/${id}`)}`} target="_top">Sign in</a></main>;let access;try{access=await sitePermission(id,userId);}catch{return <main className="publication-empty"><h1>Website temporarily unavailable</h1><p>Please try again shortly.</p></main>;}if(!access?.row.published||access.row.archived)notFound();const site=JSON.parse(access.row.published) as Website;if(path?.[0]&&path[0]!==site.slug)notFound();const page=path?.[1]?site.pages.find(p=>p.slug===path[1]&&path.length===2):site.pages[0];if(!page)notFound();return <main className="published-page"><WebsiteView site={site} siteId={id} page={page} base={`/website/${id}/${site.slug}`}/></main>;}
