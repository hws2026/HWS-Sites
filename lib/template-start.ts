import {template,uid,type Website} from './editor-model';
import {referenceTemplate,referenceTemplates} from './templates';

export type TemplateStartMode='scratch'|'full';

export function startFromTemplate(id:string,mode:TemplateStartMode):Website{
 if(!['scratch','full'].includes(mode))throw new Error('Choose start from scratch or use the whole template.');
 if(!referenceTemplates.some(t=>t.id===id)&&!['school','business','general'].includes(id))throw new Error('Choose a valid starting template.');
 const site=referenceTemplates.some(t=>t.id===id)?referenceTemplate(id):template(id);
 if(mode==='full')return site;
 // Retain the theme, but never leave demo destinations pointing to removed pages.
 return {...site,name:'My website',slug:'my-website',logo:'',utilityLabel:'',footerText:'',utilityLinks:'',headerLinks:'',headerMenus:[],footerLinks:'',heroLinks:'',socialLinks:'',announcement:'',announcementLink:'',directoryMenu:undefined,calendarEvents:[],library:[],pages:[{id:uid(),name:'Home',slug:'home',blocks:[]}]};
}
