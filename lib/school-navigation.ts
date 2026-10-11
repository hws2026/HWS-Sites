import {makeBlock,slugify,uid,type Website,type Page} from './editor-model';

/** School navigation has its own structure; it is not the generic demo menu. */
export function configureSchoolNavigation(site:Website){
 const middle=site.templateId==='horizon';
 site.navigationStyle='mega';site.megaMenuLayout='columns';
 const content=(name:string)=>[{...makeBlock('text'),title:name,text:`${name} at ${site.name}. Browse information, updates, and contacts for our school community.\n\nThis demonstration uses fictional content. Contact hello@example.com for sample assistance.`}];
 const ensure=(name:string,slug=slugify(name),parentId?:string,hidden=false):Page=>{
  let page=site.pages.find(page=>page.slug===slug);
  if(!page){page={id:uid(),name,slug,blocks:content(name)};site.pages.push(page);}
  page.name=name;page.parentId=parentId;page.hidden=hidden;return page;
 };
 site.pages=site.pages.filter(page=>!page.parentId);
 const groups:{name:string;slug:string;children:string[]}[]=[
  {name:'Our School',slug:'our-school',children:middle?['School profile','Learning support','Team directory','From the principal','School spirit shop','Daily timetable','Weather & closures','District priorities','Language assistance']:['From the principal','School profile','Dates & timetables','Alumni recognition','Student guidance','Campus reports','District priorities','Staff resources']},
  {name:'Academics',slug:'academics',children:middle?['Explore electives','Reading & writing','Math learning','Scientific discovery','History & society','Advisory program','Learning services','Language learning','Advanced learning','Course planning','Teaching approach','Join our school','Assessment & feedback']:['Learning overview','Program pathways','Subject departments','Assessment information']},
  {name:'Students',slug:'students',children:middle?['Student resources','Supply checklist','Library resources','Locker information','Student leadership','Student guide','New student welcome']:['Student resources','Library resources']},
  {name:'Parents',slug:'parents',children:middle?['Family involvement','Important dates','Family conferences','Meal assistance','Contact our team','Community support','School health','Device support']:['Report an absence','School health','Family resources','Community voices','Parent partnership','School advisory council','Language assistance']},
  {name:'Activities & Clubs',slug:'activities',children:['Club directory']},
  {name:'Athletics',slug:'athletics',children:middle?['Sports registration','Track & field','Basketball programs','Wrestling program','Volleyball program','Team schedules']:['Sports programs','Coaching team','Event tickets']},
  {name:'Campus Projects',slug:'campus-projects',children:[]},
 ];
 const main=groups.map(group=>ensure(group.name,group.slug));
 for(const page of site.pages)if(page!==site.pages[0]&&!main.includes(page))page.hidden=true;
 for(const [index,group] of groups.entries())for(const name of group.children)ensure(name,`${group.slug}-${slugify(name)}`,main[index].id);
 const home=site.pages[0];site.pages=[home,...main,...site.pages.filter(page=>page!==home&&!main.includes(page))];
 const directoryGroups=[
  {name:'Elementary',names:['Alderbank Elementary','Birchwater Elementary','Cloverfield Elementary','Fernvale Elementary','Juniper Bay Elementary','Maplebridge Elementary','Orchard Hill Elementary','Silverbrook Elementary','Westhaven Elementary']},
  {name:'Middle',names:['Willow Creek Middle School','Birchwater Middle School','Orchard Hill Middle School']},
  {name:'High',names:['Redstone High School','Silverbrook High School','Westhaven High School']},
  {name:'Other',names:['Alderbank Learning Center','Maplebridge Career Academy','Silverbrook Online Academy']},
  {name:'Preschool',names:['Fernvale Early Learning','Birchwater Early Learning']},
 ];
 site.directoryMenu={enabled:true,label:'Our schools',groups:directoryGroups.map(group=>({id:uid(),name:group.name,items:group.names.map(name=>{
  const page=name===site.name?home:ensure(name,slugify(name),undefined,true);
  if(page!==home)page.blocks=[{...makeBlock('text'),title:name,text:`Welcome to ${name}.\n\nA fictional school in our demonstration district.\n100 Example Avenue · (555) 010-2020\nhello@example.com`},{...makeBlock('cta'),title:'Get to know our community',text:'Find enrollment information and connect with the district team.',label:'Contact the district',link:'contact'}];
  return {id:uid(),name,link:page.slug};
 })}))};
 site.utilityLinks='District home|home\nOur schools|#directory\nFamily resources|parents\nStudent portal|students';
}
