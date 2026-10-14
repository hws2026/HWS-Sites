import {template,uid,cloneBlock,type Website} from './editor-model';
import {referenceTemplate,referenceTemplates} from './templates';

export type TemplateStartMode='scratch'|'full';

export function startFromTemplate(id:string,mode:TemplateStartMode):Website{
 if(!['scratch','full'].includes(mode))throw new Error('Choose start from scratch or use the whole template.');
 if(!referenceTemplates.some(t=>t.id===id)&&!['school','business','general'].includes(id))throw new Error('Choose a valid starting template.');
 const site=referenceTemplates.some(t=>t.id===id)?referenceTemplate(id):{...template(id),templateId:id};
 if(mode==='full')return site;
 // Retain the theme, but never leave demo destinations pointing to removed pages.
 return {...site,name:'My website',slug:'my-website',logo:'',logoSizing:undefined,copyrightName:'',legalLinks:undefined,favicon:'',logoDisplay:'logo-only',utilityLabel:'',footerText:'',utilityLinks:'',headerLinks:'',headerMenus:[],footerLinks:'',heroLinks:'',socialLinks:'',announcement:'',announcementLink:'',directoryMenu:undefined,calendarEvents:[],library:[],pages:[{id:uid(),name:'Home',slug:'home',importedPage:site.imported?'index.html':undefined,blocks:[]}]};
}

export function blankWebsite():Website{
 return {name:'My website',slug:'my-website',templateId:'blank',layout:'simple',accent:'#386652',font:'sans',pages:[{id:uid(),name:'Home',slug:'home',blocks:[]}],calendarEvents:[],library:[],headerMenus:[],searchEnabled:false};
}

/** A new draft owns its page/section IDs; slug links keep pointing to the copied pages. */
export function startFromWebsite(source:Website,mode:'outline'|'design'|'full'):Website{
 const site=structuredClone(source);
 if(mode==='design')return {...site,legalLinks:undefined,calendarEvents:[],library:[],announcement:'',announcementLink:'',utilityLinks:'',headerLinks:'',headerMenus:[],footerLinks:'',heroLinks:'',directoryMenu:undefined,pages:[{id:uid(),name:'Home',slug:'home',blocks:[]}]};
 const pageIds=new Map(site.pages.map(page=>[page.id,uid()]));
 return {...site,calendarEvents:mode==='outline'?[]:site.calendarEvents?.map(event=>({...event,id:uid()})),
  library:mode==='outline'?[]:site.library?.map(entry=>({...entry,id:uid(),block:cloneBlock(entry.block)})),
  announcement:mode==='outline'?'':site.announcement,announcementLink:mode==='outline'?'':site.announcementLink,
  headerMenus:site.headerMenus?.map(menu=>({...menu,id:uid(),items:menu.items.map(item=>({...item,id:uid()}))})),
  directoryMenu:site.directoryMenu?{...site.directoryMenu,groups:site.directoryMenu.groups.map(group=>({...group,id:uid(),items:group.items.map(item=>({...item,id:uid()}))}))}:undefined,
  pages:site.pages.map(page=>({...page,id:pageIds.get(page.id)!,parentId:page.parentId?pageIds.get(page.parentId):undefined,
   summary:mode==='outline'?'':page.summary,banner:mode==='outline'?'':page.banner,blocks:mode==='outline'?[]:page.blocks.map(cloneBlock)}))};
}
