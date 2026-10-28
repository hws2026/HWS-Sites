import {startFromTemplate,type TemplateStartMode} from './template-start';
import type {Website} from './editor-model';

export type WebsiteSource='blank'|'template'|'existing';
export type CreateWebsiteInput={title:string;assignTo:'self'|'customer';customerId:string;templateId:string;startMode:TemplateStartMode|'outline'|'design';source?:WebsiteSource;sourceSiteId?:string;contextSiteId?:string};
type Requester=(path:string,init?:RequestInit)=>Promise<Response>;
type DraftResponse={site:Website;revision:number;published?:Website|null};

export function isEmptyStartingSite(site:Website){
 return site.pages?.length===1&&site.pages[0].slug==='home'&&site.pages[0].blocks?.length===0
  &&!site.logo&&!site.utilityLabel&&!site.footerText&&!site.utilityLinks&&!site.headerLinks
  &&!site.footerLinks&&!site.heroLinks&&!site.socialLinks&&!site.announcement&&!site.announcementLink
  &&!site.headerMenus?.length&&!site.directoryMenu&&!site.calendarEvents?.length&&!site.library?.length;
}

/** Verify the persisted starting choice before navigation, including older API deployments. */
export async function createWebsite(input:CreateWebsiteInput,request:Requester,options:{id?:string;endpoint?:'/api/admin'|'/api/portal';onCreated?:(id:string)=>void}={}){
 async function json<T>(path:string,init?:RequestInit):Promise<T>{
  const response=await request(path,init);
  const result=await response.json() as T & {error?:string};
  if(!response.ok)throw new Error(result.error||'Could not finish creating the website. Try again.');
  return result;
 }
 let id=options.id;
 if(!id){
  const created=await json<{id:string;creationVersion?:number;assigned?:boolean}>(options.endpoint??'/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'site',...input})});
  if(!created.id)throw new Error('The server did not return the new website. Refresh your website list before trying again.');
  id=created.id;
  // Assignment deliberately does not grant the platform access to the customer draft.
  if(created.assigned)return id;
  options.onCreated?.(id);
  if(input.source&&input.source!=='template'&&created.creationVersion!==2)throw new Error('Update the backend before using blank or existing-site creation. The created draft was preserved for review.');
 }
 if(input.source==='existing'||input.source==='blank'){
  const saved=await json<DraftResponse>('/api/site?id='+encodeURIComponent(id));
  if(input.source==='blank'&&(saved.site.templateId!=='blank'||!isEmptyStartingSite(saved.site)))throw new Error('The backend did not save a blank website. Open the existing draft before trying again.');
  if(input.source==='existing'&&(input.startMode==='outline'||input.startMode==='design')&&saved.site.pages.some(page=>page.blocks.length))throw new Error('The backend did not clear the copied page content. Open the existing draft before trying again.');
  return id;
 }
 if(input.startMode==='full')return id;
 const read=()=>json<DraftResponse>('/api/site?id='+encodeURIComponent(id!));
 const saved=await read();
 if(isEmptyStartingSite(saved.site))return id;
 // Older Workers ignore startMode. Only initialize the untouched record from this creation.
 if(saved.revision!==1||saved.published)throw new Error('This website already has saved changes. Open its editor to choose a starting template; its content was preserved.');
 const blank=startFromTemplate(input.templateId,'scratch');
 blank.name=input.title.trim();blank.slug=saved.site.slug;
 await json('/api/site',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,site:blank,revision:saved.revision,publish:false})});
 const verified=await read();
 if(!isEmptyStartingSite(verified.site))throw new Error('The backend did not save the empty starting page. Update the Cloudflare backend, then retry.');
 return id;
}
