import {referenceInventory,type ReferencePageSpec} from './reference-inventory';
import {pagePreset,sectionPreset} from './content-library';
import {makeBlock,getBlockItems,slugify,uid,type Block,type BlockType,type Page,type Website} from './editor-model';
const primaryMenus:Record<string,string[]>={
 sau70:['Our Districts','Our Schools','School Boards','Departments','Resources'],crane:['About','A Cedar Grove Education','Admission','Community','Giving'],
 greece:['Our District','Schools & Programs','Academics','Departments','Services & Supports'],athena:['Our School','Students','Athletics','Technology'],
 horizon:['Our School','Academics','Students','Parents','Activities & Clubs','Athletics','Campus Projects'],eaglecrest:['Our School','Academics','Students','Parents','Activities & Clubs','Athletics','Campus Projects'],
 dubois:['Our District','Education Foundation','Community','Departments','School Board','Events','Employee Information'],ics:['About Us','Admissions','Academics','Student Life','Community','Harborlight Giving'],
 greenwich:['District Information','Teaching & Learning','Departments','Board of Education','Community'],police:['Divisions','Policies','Employment','FAQs','Contact']
};
const topicCopy:Record<string,string>={
 overview:'Find an overview of our priorities, the people who support them, and the resources available to our community.\n\nUse the links below to explore this topic in more detail. Our community office can help you find the right next step.',
 department:'Our team coordinates day-to-day services and helps families, staff, and community members find timely answers.\n\nOffice hours: Monday–Friday, 8:00 AM–4:00 PM. For routine questions, contact hello@example.com or (555) 010-2020.',
 program:'Explore a program designed around curiosity, practical experience, and personal growth. Learners work with a supportive team and have opportunities to develop new interests.\n\nThe sample pathways and schedules below can be adapted to your own community.',
 admissions:'Discover our community, arrange a visit, and learn what to expect during registration. Our admissions team is available to guide you through each step.\n\nThis template uses fictional dates and requirements. Replace them with your own admissions information before sharing.',
 article:'A new season brings opportunities to learn, connect, and contribute. This week, our fictional community came together to share projects and celebrate the people behind them.\n\nSmall-group workshops, creative activities, and open conversations gave everyone a chance to participate. The gathering reflects our commitment to welcoming new ideas and learning from one another.\n\nWe look forward to continuing the conversation at the next community event.',
 resources:'Browse our resource collection by category or search for a document. Each sample record can link to a page or a secure file you provide.\n\nThe documents in this demonstration contain fictional material.',
 policies:'These sample policies illustrate how to organize approved guidance, supporting documents, and related questions. Expand a topic to read its summary and access resources.\n\nDemonstration content is not an adopted policy or legal guidance.',
 portal:'This local demonstration gathers the resources that would normally be found in an outside portal. Select a topic to explore the sample materials.\n\nConnect your own portal address in the editor when you are ready to use a live service.',
 contact:'We welcome your questions and ideas. Find our fictional contact details below, or try the demonstration form to see how this page works.',
 fees:'Review sample program options, services, and costs. The figures shown are fictional and are included to demonstrate the layout.\n\nContact the community office to discuss available support and enrollment options.',
 form:'Use this demonstration to explore the application experience. Required fields are marked with an asterisk.\n\nThe form validates entries locally; no personal information is submitted or stored.',
 board:'Our fictional board brings community perspectives together to guide priorities and review progress. Explore sample meetings, team members, and governance documents.',
 schedule:'Find the regular schedule and alternate-day arrangements below. Switch between tabs to compare sample times.\n\nAll times are fictional and can be edited for your own organization.',
 directory:'Search our fictional team by name or department. Each profile can include a photo, role, contact link, and additional information.',
 calendar:'Explore sample events by month or list, filter by calendar, and select an event for details.',
 news:'Read the latest fictional stories and announcements from our community.',
 faq:'Find answers to common questions. Expand a topic to read the guidance and explore related resources.',
 gallery:'A collection of illustrative moments from our fictional community. Select a photo to see a larger view.',
 timeline:'Explore the milestones that shaped our fictional community and the opportunities ahead.',
 feed:'Follow sample updates from our community team.',
 utility:'This editable resource page provides a local destination for information and support.'
};
function walkBlocks(blocks:Block[],visit:(block:Block)=>void){for(const b of blocks){visit(b);walkBlocks(b.children??[],visit);for(const item of b.items??[])walkBlocks(item.children??[],visit);}}
function blocksFor(spec:ReferencePageSpec,site:Website):Block[]{
 const kind=spec.kind==='faq'?'policies':spec.kind==='feed'?'news':spec.kind==='utility'?'resources':spec.kind;
 let blocks=pagePreset(kind,spec.title,site);
 blocks[0].title='';blocks[0].text=topicCopy[spec.kind]??topicCopy.overview;
 if(spec.kind==='faq')blocks=site.layout==='civic'?[blocks[0],...['How can I contact the office?','Where can I find community resources?','How do I request information?','How can I provide feedback?','Where are public policies listed?'].map(title=>({...makeBlock('text'),title,text:'For this fictional demonstration, contact the community office at hello@example.com. Browse the resource pages for sample information and next steps.',padding:24}))]:[blocks[0],makeBlock('accordion')];
 if(spec.kind==='feed')blocks=[blocks[0],makeBlock('feed')];
 if(site.templateId==='eaglecrest'&&spec.kind==='schedule'&&spec.title==='Bell Schedules'){
  const table={...makeBlock('table'),title:'Daily schedule',tableColumns:['Period','Start','End','Period','Start','End'],tableGroups:[{label:'Red day',span:3},{label:'Black day',span:3}],items:Array.from({length:8},(_,i)=>({id:uid(),title:'Period '+(i+1),text:'',image:'',meta:'',link:'',cells:['Period '+(i+1),(8+i)+':00',(8+i)+':45','Period '+(i+1),(8+i)+':00',(8+i)+':45']}))};
  blocks=[blocks[0],{...makeBlock('tabs'),title:'School day',items:[{id:uid(),title:'Daily Schedule',text:'Sample times for a fictional school day.',image:'',meta:'',link:'',children:[table]}]}];
 }
 if(spec.kind==='sitemap')blocks=[blocks[0]];
 if(site.layout==='civic'&&spec.kind==='form'){const form=makeBlock('form');form.fields=/tip/i.test(spec.title)?[{id:uid(),label:'Subject',type:'text'},{id:uid(),label:'Fictional message',type:'textarea',required:true}]:[{id:uid(),label:'Your name',type:'text'},{id:uid(),label:'Email address',type:'email'},{id:uid(),label:'Service area',type:'select',options:['Community programs','Information request','General feedback']},{id:uid(),label:'Your experience',type:'radio',options:['Excellent','Good','Could improve'],required:true},{id:uid(),label:'Comments',type:'textarea'},{id:uid(),label:'I understand this is a fictional demonstration',type:'checkbox',required:true}];form.title=spec.title;form.text='Use fictional details only. This page is a demonstration, not a public reporting service.';blocks=[blocks[0],form];}
 const represented=new Set<string>();walkBlocks(blocks,b=>represented.add(b.type));
 // Observed module evidence adds the actual kinds found on sampled interiors.
 for(const type of spec.modules??[])if(!represented.has(type)&&type!=='video'){blocks.push(makeBlock(type as BlockType));represented.add(type);}
 if((spec.modules??[]).includes('video')&&!represented.has('video'))blocks.push({...makeBlock('video'),title:'A message from our community',text:'Add your own video URL in the editor.',link:''});
 for(const b of blocks){b.padding=32;if(b.type==='features'){b.title='Explore '+spec.title.toLowerCase();b.items=['Learn more','Find resources','Connect with our team'].map((title,i)=>({id:uid(),title,text:['Discover the people, programs, and priorities behind this work.','Review information and guidance for your next step.','Ask questions and find the support you need.'][i],link:'contact',image:'',meta:''}));}if(b.type==='image'||b.type==='split')b.image='/demo-campus.webp';if(b.type==='directory')b.columns=site.templateId==='eaglecrest'?4:3;}
 return blocks;
}
export function configureReferencePages(site:Website){
 const specs=referenceInventory[site.templateId??''];if(!specs?.length)return;
 const oldPages=site.pages,home=oldPages[0],oldBySlug=new Map(oldPages.map(p=>[p.slug,p]));
 const idByKey=new Map(specs.map(spec=>[spec.key,spec.kind==='home'?home.id:`${site.templateId}-${spec.key}`]));
 const homeKeys=new Set(specs.filter(s=>s.kind==='home').map(s=>s.key));
 const generated:Page[]=specs.filter(spec=>spec.kind!=='home').map(spec=>({id:idByKey.get(spec.key)!,name:spec.title,navLabel:spec.navLabel,slug:spec.slug,parentId:spec.parent&&!homeKeys.has(spec.parent)?idByKey.get(spec.parent):undefined,hidden:!spec.nav||spec.legacy,layout:(['article'].includes(spec.kind)?'article':(['calendar','sitemap','gallery'].includes(spec.kind)||spec.kind==='directory'&&site.layout!=='school')?'full':'sidebar') as Page['layout'],breadcrumbs:true,blocks:blocksFor(spec,site)}));
 const byKey=new Map(specs.map(spec=>[spec.key,generated.find(p=>p.id===idByKey.get(spec.key))]));
 const usedSlugs=new Set(['home',...generated.map(p=>p.slug)]);
 const uniqueSlug=(name:string)=>{let base=slugify(name)||'page',slug=base,n=2;while(usedSlugs.has(slug))slug=base+'-'+n++;usedSlugs.add(slug);return slug;};
 const primary:Page[]=[];
 const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
 for(const name of primaryMenus[site.templateId??'']??[]){let page=generated.find(p=>(normalized(p.name)===normalized(name)||normalized(p.navLabel??'')===normalized(name)||name==='Campus Projects'&&/bond projects/i.test(p.name)||name==='Students'&&/^student links$/i.test(p.name))&&!p.parentId)??generated.find(p=>(normalized(p.name)===normalized(name)||normalized(p.navLabel??'')===normalized(name)||name==='Campus Projects'&&/bond projects/i.test(p.name)||name==='Students'&&/^student links$/i.test(p.name)));if(!page){page={id:uid(),name,slug:uniqueSlug(name),blocks:pagePreset('overview',name,site),layout:'sidebar'};generated.push(page);}page.name=name;page.navLabel=name;page.parentId=undefined;page.hidden=false;page.menuStyle=undefined;primary.push(page);}
 const primaryIds=new Set(primary.map(p=>p.id));
 // Promote source folders leading to visible descendants, keeping utility roots out of the header.
 for(const p of generated){if(!p.parentId&&!primaryIds.has(p.id))p.hidden=true;}
 for(const leaf of generated.filter(p=>!p.hidden)){let parentId=leaf.parentId;const seen=new Set<string>();while(parentId&&!seen.has(parentId)){seen.add(parentId);const ancestor=generated.find(p=>p.id===parentId);if(!ancestor)break;if(ancestor.parentId||primaryIds.has(ancestor.id))ancestor.hidden=false;parentId=ancestor.parentId;}}
 // Resolve absent source folder relationships to the nearest primary content branch.
 for(const spec of specs){const p=byKey.get(spec.key);if(!p||primaryIds.has(p.id))continue;const parent=generated.find(q=>q.id===p.parentId);if(parent&&parent.id===p.id)p.parentId=undefined;}
 site.pages=[{...home,name:'Home',slug:'home',parentId:undefined,hidden:false},...primary,...generated.filter(p=>!primaryIds.has(p.id))];
 const find=(value:string)=>{const exact=site.pages.find(p=>p.slug===value);if(exact)return exact;const old=oldBySlug.get(value);const normalized=(old?.name??value).toLowerCase().replace(/[^a-z0-9]/g,'');const named=site.pages.find(p=>p.name.toLowerCase().replace(/[^a-z0-9]/g,'')===normalized);if(named)return named;const patterns:Record<string,RegExp>={about:/^(about|our district|our school|district information)/i,admissions:/^admission|enroll|registration/i,calendar:/calendar|events/i,news:/news|happening|updates/i,families:/^parent|famil|community/i,parents:/^parent|famil/i,students:/^student/i,schools:/^schools|school directory|school finder/i,departments:/^departments|staff directory/i,contact:/^contact|^map.*directions/i,academics:/^academics|education|teaching/i,giving:/giving|support|fund/i};return patterns[value]?site.pages.find(p=>patterns[value].test(p.name)):undefined;};
 const resolveLink=(value:string)=>{if(site.layout==='civic'&&value==='academics')value='divisions';if(!value||/^(https?:|mailto:|tel:|#|\/)/i.test(value))return value;let destination=find(value);if(!destination){const old=oldBySlug.get(value);const name=old?.name??value.replaceAll('-',' ').replace(/^\w/,c=>c.toUpperCase());destination={id:uid(),name,slug:uniqueSlug(name),hidden:true,layout:'sidebar',blocks:pagePreset('resources',name,site)};site.pages.push(destination);}return destination.slug;};
 const rewrite=(blocks:Block[])=>walkBlocks(blocks,b=>{b.link=resolveLink(b.link);if(b.items)b.items=b.items.map(item=>({...item,link:resolveLink(item.link)}));if(b.slides)b.slides=b.slides.map(slide=>({...slide,link:resolveLink(slide.link)}));});
 const existing=[...site.pages];for(const page of existing)rewrite(page.blocks);
 for(const key of ['headerLinks','utilityLinks','footerLinks','heroLinks'] as const)if(site[key])site[key]=site[key]!.split('\n').map(line=>{const [label,link]=line.split('|');return label+'|'+resolveLink(link??'');}).join('\n');
 if(['international','network'].includes(site.layout??'')){
  site.headerLinks=site.headerLinks?.split('\n').filter(line=>!/^quick links?\|/i.test(line)).join('\n');
  const quick=site.layout==='international'?[['Plan a visit','visit'],['Frequently asked questions','faqs'],['Calendar','calendar']]:[['Staff directory','departments'],['Family resources','families'],['Enrollment','admissions']];
  site.headerMenus=[{id:uid(),label:'Quick Links',placement:'resources',items:quick.map(([label,link])=>({id:uid(),label,link:resolveLink(link)}))}];
  if(site.layout==='network'){
   site.utilityLinks=site.utilityLinks?.split('\n').filter(line=>!/^schools\|/i.test(line)).join('\n');
   const schools=find('schools'),list=site.pages.filter(p=>p.parentId===schools?.id);
   site.headerMenus.unshift({id:uid(),label:'Schools',placement:'utility',items:(list.length?list:schools?[schools]:[]).slice(0,60).map(p=>({id:uid(),label:p.name,link:p.slug}))});
  }
 }
 if(site.announcementLink)site.announcementLink=resolveLink(site.announcementLink);
 if(site.directoryMenu)for(const group of site.directoryMenu.groups)for(const item of group.items)item.link=resolveLink(item.link);
 // Every navigation landing page has direct links to its real children.
 for(const page of [...site.pages]){const children=site.pages.filter(p=>p.parentId===page.id&&!p.hidden);if(!children.length)continue;const cards=page.blocks.find(b=>b.type==='features'||b.type==='linklist');const rows=children.slice(0,50).map(child=>({id:uid(),title:child.navLabel||child.name,text:'Explore information and resources.',link:child.slug,image:'',meta:''}));if(cards){cards.type='linklist';cards.title='In this section';cards.items=rows;}else page.blocks.push({...makeBlock('linklist'),title:'In this section',items:rows,padding:24});}
 // Fictional story detail records make all home/news card links useful.
 const stories=['A new season of discovery','Learning beyond the classroom','An invitation to connect'];const storyPages=stories.map((name,index)=>({id:uid(),name:site.layout==='civic'?['Neighbors helping neighbors','Meet your community team','Your guide to local resources'][index]:name,slug:uniqueSlug('community-story-'+(index+1)),hidden:true,layout:'article' as const,blocks:blocksFor({key:'story',slug:'',title:name,kind:'article'},site)}));site.pages.push(...storyPages);
 for(const page of site.pages)walkBlocks(page.blocks,b=>{if(b.type==='news')b.items=getBlockItems(b).map((item,index)=>({...item,link:storyPages[index%storyPages.length].slug}));});
 for(let index=0;index<site.pages.length;index++)rewrite(site.pages[index].blocks);
 let sitemap=site.pages.find(p=>/^site ?map$/i.test(p.name));if(!sitemap){sitemap={id:uid(),name:'Site map',slug:uniqueSlug('site-map'),hidden:true,layout:'full',blocks:[]};site.pages.push(sitemap);}const pages=site.pages.filter(p=>p!==sitemap);sitemap.layout='full';sitemap.blocks=[];for(let i=0;i<pages.length;i+=50)sitemap.blocks.push({...makeBlock('linklist'),title:i?'More pages':'Browse every page',padding:24,items:pages.slice(i,i+50).map(p=>({id:uid(),title:p.name,text:'',meta:'',image:'',link:p.slug}))});
 const contact=find('contact');site.footerLinks=(site.footerLinks?site.footerLinks+'\n':'')+(contact?'Contact|'+contact.slug+'\n':'')+'Site map|'+sitemap.slug;
 // Preserve reference defaults; overrides remain optional and can be set per website.
 site.library=site.library??[];
}
