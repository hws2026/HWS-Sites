import {PARADIS_TEMPLATE,paradisTemplate} from './imported-template';
import {enableSiteCalendar} from './site-calendar';
import {configureReferencePages} from './reference-pages';
import {configureReferenceAppearance} from './reference-appearance';
import {configureSchoolNavigation} from './school-navigation';
import {makeBlock,uid,slugify,type Block,type BlockType,type Website} from './editor-model';
export const referenceTemplates=[
{id:'sau70',name:'Meadowbrook Union Schools',source:'Reference design 01',url:'https://www.sau70.org/',category:'District',accent:'#27456e',layout:'district',title:'Two communities.\nOne shared future.',pages:['Home','Our District','Our Schools','School Board','Departments','Families','News','Calendar'],structure:'Audience portals · school directory · news & events · district resources'},
{id:'crane',name:'Cedar Grove Day School',source:'Reference design 02',url:'https://www.craneschool.org/',category:'Independent school',accent:'#4f6930',layout:'editorial',title:'Small moments.\nBig discoveries.',pages:['Home','About','Our Education','Admissions','Community','Giving','Media Hub'],structure:'Story-led hero · program stories · admissions · community & giving'},
{id:'greece',name:'Lakeview Community Schools',source:'Reference design 03',url:'https://www.greececsd.org/',category:'District',accent:'#243c7d',layout:'portal',title:'Every learner.\nEvery possibility.',pages:['Home','Our District','Schools & Programs','Academics','Departments','Services & Supports','News','Calendar'],structure:'Utility header · school directory · application quick links · showcase'},
{id:'athena',name:'Summit Ridge High School',source:'Reference design 04',url:'https://www.greececsd.org/o/aths',category:'High school',accent:'#000000',layout:'portal',title:'Find your place.\nShape your future.',pages:['Home','Our School','Students','Athletics','Technology','News','Calendar'],structure:'District-linked header · student resources · athletics · school announcements'},
{id:'horizon',name:'Willow Creek Middle School',source:'Reference design 05',url:'https://horizon.cherrycreekschools.org/',category:'Middle school',accent:'#003366',layout:'school',title:'Find your spark.\nBelong to something great.',pages:['Home','Our School','Academics','Activities','Families','Calendar','News'],structure:'Task navigation · announcement hero · event calendar · school & district news'},
{id:'eaglecrest',name:'Redstone High School',source:'Reference design 06',url:'https://eaglecrest.cherrycreekschools.org/',category:'High school',accent:'#b70101',layout:'school',title:'This is our community.\nThis is our moment.',pages:['Home','Our School','Academics','Athletics','Activities','Counseling','Families','Calendar','News'],structure:'School announcements · student programs · calendar · district announcements'},
{id:'dubois',name:'Maple County Schools',source:'Reference design 07',url:'https://www.swdubois.k12.in.us/',category:'District',accent:'#c91235',layout:'corporation',title:'Every student.\nA new opportunity.',pages:['Home','About','Schools','School Board','Parents','Students','Community','Calendar','News'],structure:'Program tiles · family tools · news & events · district statistics'},
{id:'ics',name:'Harborlight International Academy',source:'Reference design 08',url:'https://www.ics.edu.sg/',category:'International school',accent:'#1f4388',layout:'international',title:'A world of perspectives.\nA community of your own.',pages:['Home','About Us','Admissions','Academics','Student Life','Community','Giving','News','Calendar'],structure:'Admissions journey · school divisions · program cards · testimonials'},
{id:'greenwich',name:'Brookfield Public Schools',source:'Reference design 09',url:'https://www.greenwichschools.org/',category:'District',accent:'#0c2340',layout:'network',title:'Together, we open\na world of possibilities.',pages:['Home','District Information','Teaching & Learning','Departments','Board of Education','Community','Schools','News','Calendar'],structure:'Audience shortcuts · mission · by the numbers · news & calendar'},
{id:'police',name:'Riverton Public Safety',source:'Reference design 10',url:'https://greecepolice.org/',category:'Public services',accent:'#0d2238',layout:'civic',title:'Serving our neighbors.\nStrengthening our community.',pages:['Home','Divisions','Policies','Employment','FAQs','Contact','News'],structure:'Service shortcuts · mission · leadership message · newsletters & updates'},
{id:'paradis-photo-booths',name:'Paradisephotobooths',source:'Customer supplied website',url:'',category:'Photo booths & events',accent:'#fd66c1',layout:'simple',title:'Paradisephotobooths',pages:['Home','360 Photo Booth','Past Events','Backdrops','Check Availability','Privacy Policy','Terms & Conditions','Thank You'],structure:'Original eight-page website · preserved layout, styles, scripts, and images · editable content'},
] as const;
function block(type:BlockType,title:string,text:string,extra:Partial<Block>={}):Block{return {...makeBlock(type),title,text,...extra};}
export function referenceTemplate(id:string):Website{
 if(id===PARADIS_TEMPLATE)return paradisTemplate();
 const t=referenceTemplates.filter(t=>t.id!==PARADIS_TEMPLATE).find(t=>t.id===id)??referenceTemplates[0];const website:Website={name:t.name,slug:slugify(t.name),accent:t.accent,font:t.layout==='corporation'?'serif':'sans',layout:t.layout,templateId:t.id,utilityLinks:t.layout==='civic'?'Contact|contact\nEmployment|employment\nFAQs|faqs':t.layout==='editorial'?'Inquire|admissions\nCommunity|community\nGive|giving':'Families|families\nStaff directory|departments\nCalendar|calendar',footerText:'100 Example Avenue, Sample City\n(555) 010-2020 · hello@example.com',pages:[]};
 const news=block('news','Around our community','Community open house|Join us for a day of discovery and connection.|news\nCelebrating student achievement|A few moments from an inspiring week.|news\nA new chapter for our campus|Learn about our latest projects and improvements.|news');
 const events=block('events','Coming up','OCT 16|Community open house|10:00 AM · Main campus\nOCT 22|Family information evening|6:00 PM · Learning center\nNOV 05|Community council meeting|7:00 PM · Administration building');
 const quick=block('quicklinks',t.layout==='civic'?'How can we help?':'Everything you need, one click away.',t.layout==='civic'?'Community resources|divisions\nVictim assistance|divisions\nCareers|employment\nPublic policies|policies\nContact us|contact\nFrequently asked questions|faqs':'School directory|schools\nCalendar|calendar\nFamily resources|families\nFood services|departments\nTransportation|departments\nEnrollment|admissions',{background:t.accent,color:'#ffffff',padding:26});
 const hero=block('hero',t.title,'A welcoming place to learn, grow, and make a difference. Explore the people and programs that make our community special.',{image:'/demo-campus.webp',background:t.accent,color:'#ffffff',padding:88,label:t.layout==='civic'?'Explore services':'Discover our community',link:t.layout==='civic'?'divisions':'about'});
 const welcome=block('text',t.layout==='civic'?'Our mission':'Welcome to '+t.name,t.layout==='civic'?'We work alongside our neighbors to build a safer, more connected community. This demonstration contains fictional information and is not a reporting service.':'We bring people together through meaningful opportunities, thoughtful support, and a shared belief in what comes next.',{padding:52});
 const stats=block('stats','Our community at a glance','2,400|Students\n4|Campuses\n96%|Graduation rate\n30+|Programs',{background:'#eef2f6',padding:44});
 const programs=block('features','Explore what’s possible','Learning with purpose|Discover hands-on learning experiences.\nA place to belong|Find your community in clubs and activities.\nNew horizons|Build the confidence to take your next step.');
 const split=block('split','A place for every story.','We know that the best learning happens when people feel seen and supported. Come explore our community and meet the people who make it special.',{image:'/demo-campus.webp',label:'Explore our programs',link:'academics',background:'#f0f4f5'});
 const home:Block[]=t.layout==='editorial'?[hero,welcome,split,programs,block('cta','Come see what’s possible.','Meet our community and imagine your next chapter.',{label:'Plan a visit',link:'admissions',background:t.accent}),news]:t.layout==='portal'?[hero,quick,block('features','Community showcase','Our district|A shared vision for our learners.\nAthletics|Teamwork on and off the field.\nThe arts|Creativity at the heart of our community.'),news,events]:t.layout==='school'?[hero,quick,events,news,block('text','District announcements','Registration is open for the next school year.\nFamily resources are available through the community office.')]:t.layout==='corporation'?[hero,block('quicklinks','Explore our programs','Language immersion|academics\nAthletics|students\nCareer pathways|schools\nMenus|parents\nFamily portal|parents\nEmployment|about'),news,events,stats]:t.layout==='international'?[hero,quick,split,block('features','Explore our school','Elementary|Curiosity and discovery for younger learners.\nMiddle school|Growing independence and confidence.\nHigh school|Personal pathways to a bright future.'),news,events,block('testimonial','A community that feels like home.','“From the very first day, we felt welcomed and supported.”\n— Sample parent')]:t.layout==='network'?[hero,quick,welcome,stats,news,events]:t.layout==='civic'?[hero,quick,welcome,block('split','A message from our director','Community safety begins with trust, service, and working together. Our team is committed to listening and supporting every neighborhood.',{image:'/demo-campus.webp',label:'Meet our team',link:'divisions'}),block('features','Community newsletters','Fall update|Recent community projects and events.\nPublic service bulletin|Resources available to residents.\nFrom our team|Stories of service and collaboration.'),news]:[hero,quick,welcome,news,events,programs];

 const mottos:Record<string,string>={sau70:'Two communities. One shared commitment.',crane:'Curiosity lives here.',greece:'One vision. One community.',athena:'Discover your strengths. Define your future.',horizon:'Learning every day. Belonging every day.',eaglecrest:'Pride. Purpose. Possibility.',dubois:'Every student. Every day.',ics:'Many perspectives. One community.',greenwich:'Learning without limits.',police:'Trust. Service. Community.'};
 website.utilityLabel=mottos[t.id];
 website.navigationStyle=['district','portal','school','international','network'].includes(t.layout)?'mega':'dropdown';
 website.searchEnabled=true;
 website.socialLinks='Facebook|https://www.facebook.com/\nInstagram|https://www.instagram.com/\nYouTube|https://www.youtube.com/';
 website.footerText+='\nFictional demonstration website';
 website.footerBackground=t.layout==='editorial'?'#303f23':t.layout==='civic'?'#0b1d2f':t.accent;
 website.footerColor='#ffffff';
 hero.imageAlt='Illustrative school campus with lawns and historic buildings';
 hero.align='left';hero.overlay=65;hero.padding=72;
 hero.text=t.layout==='civic'?'Working together for a safer, more connected neighborhood. Explore community services, meet our team, and find the support you need.':'Discover a community where curiosity is encouraged, every voice matters, and new possibilities take shape each day.';
 quick.title='';quick.columns=6;quick.gap=0;quick.padding=16;
 stats.columns=4;stats.align='center';
 news.background='#f2f4f6';news.padding=64;
 news.items=[
  {id:uid(),title:t.layout==='civic'?'Neighbors helping neighbors':'A new season of discovery',text:'A look at the people, projects, and small moments bringing our community together.',link:'news',image:'/demo-campus.webp',meta:'Community · October 08'},
  {id:uid(),title:t.layout==='civic'?'Meet your community team':'Learning beyond the classroom',text:'Explore the experiences opening doors and helping our community grow.',link:'news',image:'',meta:'Spotlight · October 03'},
  {id:uid(),title:t.layout==='civic'?'Your guide to local resources':'An invitation to connect',text:'Join a campus gathering, meet our team, and find your next opportunity to get involved.',link:'news',image:'/demo-campus.webp',meta:'Around campus · September 28'}
 ];
 events.padding=64;events.columns=3;events.gap=24;
 events.items=[{id:uid(),title:'Community open house',text:'10:00 AM · Main campus',link:'calendar',image:'',meta:'OCT 16'},{id:uid(),title:'Family information evening',text:'6:00 PM · Learning center',link:'calendar',image:'',meta:'OCT 22'},{id:uid(),title:'Community council meeting',text:'7:00 PM · Administration building',link:'calendar',image:'',meta:'NOV 05'}];
 for(const section of home){if(section.type==='features'){section.padding=64;section.gap=28;section.items=section.text.split('\n').map((line,i)=>{const [title,text]=line.split('|');return {id:uid(),title,text,link:i===1?'about':'academics',meta:'',image:''};});}if(section.type==='cta'){section.color='#ffffff';section.padding=72;}}
 if(t.layout==='district'){hero.padding=62;hero.overlay=72;welcome.type='split';welcome.image='/demo-campus.webp';welcome.imageAlt=hero.imageAlt;welcome.label='Get to know our district';welcome.link='about';welcome.background='#f4f6f8';welcome.padding=72;}
 if(t.layout==='editorial'){website.announcement='A new chapter begins here — explore admissions';website.announcementLink='admissions';hero.padding=92;hero.overlay=58;welcome.align='center';welcome.padding=78;split.background='#f0f1e9';}
 if(t.layout==='portal'){hero.background='#f0f1f3';hero.color=t.accent;hero.overlay=0;hero.padding=28;hero.text=t.id==='athena'?'Find your interests, build lasting friendships, and prepare for the opportunities ahead. Your next chapter starts here.':hero.text;}
 if(t.layout==='school'){hero.background='#ffffff';hero.color=t.accent;hero.overlay=0;hero.padding=32;hero.title=t.id==='horizon'?'Find your spark.\nJoin our community.':'Your future.\nYour next chapter.';hero.label=t.id==='horizon'?'Explore activities':'Explore student resources';hero.link=t.id==='horizon'?'activities':'counseling';quick.columns=6;events.background='#f2f5f7';}
 if(t.layout==='corporation'){hero.overlay=65;hero.padding=70;home[1]=block('features','Find your next opportunity','',{columns:3,items:[{id:uid(),title:'Language & discovery',text:'A world of understanding starts with a new perspective.',link:'schools',image:'',meta:''},{id:uid(),title:'Athletics & activities',text:'A place to grow, compete, and belong.',link:'students',image:'',meta:''},{id:uid(),title:'Career pathways',text:'Real experiences. New skills. A future full of possibility.',link:'schools',image:'',meta:''}],padding:40});home.splice(2,0,quick);}
 if(t.layout==='international'){hero.overlay=67;hero.padding=92;quick.text='Inquire|admissions\nPlan a visit|admissions\nApply|admissions';quick.columns=3;quick.padding=18;split.background=t.accent;split.color='#ffffff';split.radius=12;stats.background=t.accent;stats.color='#ffffff';}
 if(t.layout==='network'){hero.overlay=65;hero.padding=72;welcome.align='center';welcome.padding=72;stats.background=t.accent;stats.color='#ffffff';}
 if(t.layout==='civic'){hero.overlay=82;hero.padding=80;hero.imageAlt='Illustrative community campus';quick.gap=14;quick.padding=28;quick.columns=6;welcome.align='center';welcome.padding=72;news.items.forEach(item=>{item.meta=item.meta.replace('Around campus','Community');});for(const section of home)if(section.type==='features')section.items?.forEach(item=>item.link='news');}

 // Reference-specific composition with fictional identities and editable content.
 website.headerLinks='Families|families\nStudents|students\nStaff|departments\nCareers|about\nEnroll|admissions';
 if(t.layout==='district'){
  website.utilityLinks='District home|home\nSchools|schools';
  hero.title='';hero.text='';hero.label='';hero.overlay=0;
  quick.text='Questions|about\nEnroll|admissions\nFamilies|families\nStudents|students\nStaff|departments';quick.columns=5;
 }
 if(t.layout==='editorial'){
  website.headerLinks='';website.utilityLinks='Inquire|admissions\nOur team|about\nDiscover|our-education';
  website.announcement='NOW ACCEPTING APPLICATIONS — INQUIRE TODAY';
  hero.title='A place to grow';hero.text='We see each learner for who they are and how they learn.\nOur teachers inspire curiosity, confidence, and personal success.';hero.label='Explore our program';hero.overlay=34;hero.padding=80;
 }
 if(t.layout==='portal'){
  website.utilityLinks='Registration|admissions\nJob opportunities|about\nStaff portal|departments';website.headerLinks='Contact us|contact\nDistrict home|home';
  hero.title=t.id==='athena'?'Welcome to Summit Ridge':'Welcome to Lakeview';hero.label='';hero.padding=16;hero.text='A student-centered learning community where every learner is valued. Our teachers build a strong foundation, encourage curiosity, and prepare students for their next chapter.';
  quick.text='Class portal|students\nFamily portal|families\nBreakfast/lunch menus|departments\nTransportation|departments\nSchool support|services-supports\nStaff resources|departments';quick.padding=0;
  home[2].title='Showcase';home[2].columns=4;home[2].items?.push({id:uid(),title:'Our community',text:'A place to connect and thrive.',link:'about',image:'/demo-campus.webp',meta:''});home[2].items?.forEach(item=>item.image='/demo-campus.webp');
 }
 if(t.layout==='school'){
  website.headerLinks=t.id==='eaglecrest'?'Attendance|parents\nSchedules & calendars|calendar\nLibrary|students\nTransportation|parents\nPayments|parents\nSchool support|parents':'Calendars|calendar\nMenus|parents\nTransportation|parents\nStudent links|students\nPayments|parents\nSchool support|parents';
  website.utilityLinks='District home|home\nOur schools|our-school\nFamily resources|parents\nStudent portal|students';
  hero.title='Community open house';hero.text='Make connections. Discover new opportunities.\n\nJoin our school community for an evening of campus tours, student activities, and conversations with our team. All families are welcome.';hero.label='Learn more';hero.link='calendar';hero.padding=0;
  home.splice(home.indexOf(quick),1);events.title=website.name+' calendar of events';events.background=t.accent;events.color='#ffffff';events.columns=4;events.items?.push({id:uid(),title:'Student showcase',text:'6:00 PM · Learning center',link:'calendar',image:'',meta:'NOV 12'});
  news.title='What’s happening at '+(t.id==='eaglecrest'?'Redstone':'Willow Creek');news.background='#ffffff';news.padding=40;
  website.footerBackground='#ffffff';website.footerColor=t.accent;
 }
 if(t.layout==='corporation'){
  website.utilityLinks='District|about\nStudents|students\nParent portal|parents\nSchools|schools';website.headerLinks='Employment opportunities|about\nAthletics|students\nEnroll now|parents';hero.title='';hero.text='';hero.label='';hero.overlay=30;
 }
 if(t.layout==='international'){
  website.utilityLinks='';website.headerLinks='Parent|community\nStaff|about-us\nQuick links|calendar\nContact us|contact';
  hero.title='';hero.text='For generations, we have welcomed families from around the world. Our dedicated educators and curious young learners bring many perspectives together in one caring community. Learn more about who we are and where we are going.';hero.label='Learn more';hero.background='#ffffff';hero.color='#ffffff';hero.overlay=0;hero.padding=40;
  quick.text='Calendar|calendar\nCurriculum|academics\nLocation|contact\nTuition & fees|admissions\nOur team|about-us\nHow to apply|admissions';quick.columns=6;quick.background='#ffffff';quick.color=t.accent;
 }
 if(t.layout==='network'){
  website.utilityLinks='District|district-information\nSchools|schools';website.headerLinks='Staff|departments\nStudent|teaching-learning\nParent|community\nCalendar|calendar';
  hero.title='';hero.text='';hero.label='';hero.overlay=10;
  quick.text='Bus information|departments\nLunch|departments\nContinuing education|teaching-learning\nAcademics|teaching-learning\nContact us|community';quick.columns=5;quick.background='#eeeeee';quick.color=t.accent;
 }
 if(t.layout==='civic'){
  website.utilityLinks='';website.headerLinks='';hero.title='';hero.text='';hero.label='';hero.overlay=35;hero.padding=0;
  website.socialLinks='Facebook|https://www.facebook.com/\nX|https://x.com/\nInstagram|https://www.instagram.com/\nLinkedIn|https://www.linkedin.com/';
 }

 website.pages=t.pages.map((name,i)=>({id:uid(),name,slug:i===0?'home':slugify(name),blocks:i===0?home:name==='News'?[news]:name==='Calendar'?[events]:name==='Schools'||name.includes('Schools')?[block('features','Our schools','Oak Elementary|100 Example Lane · Grades K–5\nRiver Middle School|200 Example Road · Grades 6–8\nMeadow High School|300 Example Avenue · Grades 9–12')]:[block('text',name,`Welcome to ${name.toLowerCase()}. Find sample information and resources for our community here.\n\nAll names, contact details, and examples in this template are fictional.`),block('features','Resources','Get started|Helpful information for your next step.\nFind support|Meet the team and explore available services.\nStay connected|Read updates and upcoming announcements.')]}));
 // Provide the destination pages used by reusable resource links.
 for(const slug of ['families','departments','schools','admissions','about','academics','news','parents','students','contact','services-supports'])if(!website.pages.some(p=>p.slug===slug)&&t.layout!=='civic')website.pages.push({id:uid(),name:slug.charAt(0).toUpperCase()+slug.slice(1),slug,hidden:true,blocks:[block('text',slug.charAt(0).toUpperCase()+slug.slice(1),'Sample resources and information for our community. Replace this with your own content.')]});
 // Menu children are regular editable pages, available to both navigation styles.
 const menuGroups=[{parent:website.pages[1],pages:t.layout==='civic'?[['Community services','Find local resources and learn how our community team can help.'],['Meet our team','Get to know the people serving our community.'],['Public information','Explore sample information, policies, and useful documents.']]:[['Welcome & mission','Learn about our purpose, our people, and the values that bring us together.'],['Leadership & team','Meet the people supporting our learning community.'],['Contact & directions','Plan your visit and find contact details for our community office.']]},{parent:website.pages.find(p=>/Academics|Education|Divisions/.test(p.name)),pages:[['Programs & pathways','Explore opportunities to discover your interests and build new skills.'],['Support & resources','Find the services and guidance to help you take your next step.']]}];
 for(const group of menuGroups){if(!group.parent)continue;for(const [name,description] of group.pages){let slug=slugify(name);if(website.pages.some(p=>p.slug===slug))continue;website.pages.push({id:uid(),name,slug,parentId:group.parent.id,blocks:[block('text',name,description+'\n\nThis is a fictional demonstration page. Replace this information with your own content.',{padding:68,background:'#f2f4f6'}),block('features','Explore further','Get in touch|Connect with our community office.\nStay informed|Read the latest community updates.\nFind your next step|Browse programs and opportunities.')]});}}
 if(t.layout==='school')configureSchoolNavigation(website);
 configureReferenceAppearance(website);
 configureReferencePages(website);
 const connected=enableSiteCalendar(website);
 const connect=(blocks:Block[]):Block[]=>blocks.map(b=>({...b,...(['events','calendar'].includes(b.type)?{eventSource:'site' as const}:{}),children:b.children?connect(b.children):undefined,items:b.items?.map(i=>({...i,children:i.children?connect(i.children):undefined}))}));
 return {...connected,pages:connected.pages.map(p=>({...p,blocks:connect(p.blocks)}))};
}
