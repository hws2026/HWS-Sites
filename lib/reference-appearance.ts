import {uid,makeBlock,slugify,type Website,type HeroSlide} from './editor-model';

export function configureReferenceAppearance(site:Website){
 if(site.layout==='district')site.navigationStyle='dropdown';
 if(['corporation','international','network'].includes(site.layout??'')){site.navigationStyle='mega';site.megaMenuLayout='columns';}
 const hero=site.pages[0].blocks.find(block=>block.type==='hero');if(!hero)return;
 site.animations=true;site.stickyHeader=['school','editorial','portal','civic','network'].includes(site.layout??'');
 hero.autoplay=true;hero.slideInterval=6;hero.slideDuration=site.layout==='school'?800:site.layout==='portal'?500:700;hero.slideTransition=site.layout==='portal'||site.layout==='international'?'slide':'fade';
 hero.imageMotion=['editorial','civic'].includes(site.layout??'');
 const stories=[['Learning in action','Discover the projects, ideas, and everyday experiences bringing our community together.','academics'],['A place to connect','Meet our team, explore our programs, and find the support you need for your next chapter.','about'],['Discover your next chapter','Join an open house, explore campus, and get to know our welcoming community.','admissions']];
 const story=(index:number):HeroSlide=>({id:uid(),title:hero.title?stories[index][0]:'',text:hero.text?stories[index][1]:'',label:hero.label?'Learn more':'',link:site.layout==='civic'?'divisions':stories[index][2],image:hero.image,imageAlt:'Illustrative community campus'});
 hero.slides=[story(0),story(1)];
 const home=site.pages[0];
 const section=(type:Parameters<typeof makeBlock>[0],title:string,text:string)=>({...makeBlock(type),title,text});
 const photo='/demo-campus.webp';
 if(site.layout==='editorial'){
  const stories=[['A place to grow',hero.text,'Explore our program','our-education'],['Curiosity in every classroom','Questions lead to discoveries. Our learners explore, create, and develop the confidence to try something new.','Explore learning','our-education'],['Known, supported, encouraged','Teachers take time to know every learner and make room for each voice, interest, and idea.','Meet our community','community'],['Room to discover','From outdoor exploration to the arts, every day offers a new way to learn and connect.','Discover campus','about'],['The joy of belonging','Friendships, shared traditions, and everyday moments make this a place to call your own.','Community life','community'],['Growing together','Families and educators build a caring community through partnership and a shared sense of purpose.','Get involved','giving'],['Come see what is possible','Meet our teachers, explore our campus, and imagine your next chapter.','Plan your visit','admissions']];
  home.blocks=stories.map(([title,text,label,link],index)=>({...section('hero',title,text),id:index===0?hero.id:uid(),image:photo,imageAlt:'Illustrative school campus',background:'#ffffff',color:'#ffffff',label,link,padding:0,align:'left' as const,autoplay:false,imageMotion:false,anchor:'story-'+(index+1)}));
  site.footerBackground='#ffffff';site.footerColor='#626262';
 }
 for(const page of site.pages)if(['news','calendar'].includes(page.slug))page.hidden=true;
 if(site.layout==='school'){
  const red=site.templateId==='eaglecrest';
  hero.title=red?'Community meeting & family evening':'Athletics at Willow Creek';
  hero.text=red?'Make your voice part of our school community.\n\nJoin our school team for an evening of campus updates, family conversations, and shared plans for the year ahead.':'Find your team. Build your confidence.\n\nExplore our athletic programs, find team information and schedules, and discover opportunities to compete, grow, and represent our school.';
  hero.image='/demo-assets/'+(red?'redstone-community':'willow-athletics')+'.svg';hero.imageAlt=red?'Redstone school community meeting graphic':'Willow Creek school athletics graphic';hero.link=red?'parents':'athletics';
  hero.slides=[story(0),story(1),story(2),{...story(0),title:'Student activities & clubs',text:'Find an activity that sparks your curiosity. Explore clubs, connect with other students, and try something new.',link:'activities',image:'/demo-assets/'+(red?'redstone-community':'willow-athletics')+'.svg'}];
  if(red)hero.slides.push({...story(2),title:'Plan your school year',link:'calendar'});
  hero.slides[0].image='/demo-campus.webp';hero.slides[0].imageAlt='Illustrative school campus';
  const events=home.blocks.find(block=>block.type==='events');if(events){events.carousel=true;events.columns=5;events.gap=20;events.padding=40;events.maxWidth=1600;for(const item of events.items??[])item.meta=item.meta.replace('OCT','October').replace('NOV','November');events.items?.push(...['Student performances','Family resource night','Community gathering','School celebration'].map((title,i)=>({id:uid(),title,text:'6:00 PM · Main campus',meta:`November ${18+i}`,image:'',link:'calendar'})));const weekdays=['Friday','Thursday','Thursday','Thursday','Wednesday','Thursday','Friday','Saturday'];events.items?.forEach((item,i)=>item.meta+=' | '+weekdays[i]);}
  const announcement=site.pages[0].blocks.find(block=>block.type==='text');if(announcement){announcement.type='image';announcement.image='/demo-assets/'+(red?'redstone-community':'willow-athletics')+'.svg';announcement.text='Community giving month\n\nHelp our school community support local families. Our school office is collecting supplies throughout the month.\n\nRegistration for the coming school year\n\nExplore enrollment information, meet our team, and learn about the opportunities available to your family.';}
  site.footerLinks='Contact our team|contact\nFamily resources|parents\nSchool information|our-school';
 }
 if(site.layout==='district'){
  hero.slideTransition='slide';hero.slideInterval=10;hero.slides=[story(0),story(1),story(2)];
  const family=site.pages.find(p=>p.slug==='families');if(family)family.name='Resources';
  site.headerLinks+='\nInquire|contact';
  const welcome=home.blocks.find(b=>b.type==='split');if(welcome)welcome.background='#ffffff';
  const news=home.blocks.find(b=>b.type==='news');if(news?.items)news.items.push(...['Discovering new possibilities','Community connections'].map(title=>({id:uid(),title,text:'Explore the people and projects bringing our fictional community together.',link:'news',image:photo,meta:'Community'})));news?.items?.forEach(item=>{if(!item.image)item.image=photo;});
  const events=home.blocks.find(b=>b.type==='events');if(events){events.title='Upcoming Events';events.background='#ffffff';events.color=site.accent;events.columns=1;events.padding=0;}
  const latest={...makeBlock('feed'),title:'Latest News',text:'',filterable:false,padding:0,items:news?.items?.slice(0,3).map(item=>({...item,id:uid(),image:''}))};
  const updates={...section('group','News & Events',''),anchor:'news-and-events',columns:2,padding:60,children:[latest,...(events?[events]:[])]};
  if(news)news.title='Inspiring Lifelong Learners';
  home.blocks=[hero,...(welcome?[welcome]:[]),updates,...(news?[news]:[])];
 }
 if(site.layout==='corporation'){
  const names=['Our District','Education Foundation','Community','Departments','School Board','Events','Employee Information'];
  site.pages.filter(p=>!p.parentId&&!p.hidden&&p!==site.pages[0]).forEach((page,i)=>{if(names[i])page.name=names[i];});
  const programs=home.blocks.find(block=>block.type==='features');
  if(programs){programs.title='';programs.columns=3;programs.gap=20;programs.maxWidth=1180;programs.items=['Language & discovery','Athletics & activities','Career pathways','Meals & nutrition','Enrollment','Join our team','Staff directory','College & careers','School calendar'].map((title,i)=>({id:uid(),title,text:'Explore opportunities, information, and resources for our school community.',image:photo,link:['academics','students','schools','parents','admissions','about','departments','academics','calendar'][i],meta:''}));}
  home.blocks=home.blocks.filter(b=>b.type!=='quicklinks');
  const events=home.blocks.find(b=>b.type==='events'),news=home.blocks.find(b=>b.type==='news'),stats=home.blocks.find(b=>b.type==='stats');
  if(news){news.background='#f8f8f8';news.items=[...(news.items??[]),...(news.items??[]).map((item,i)=>({...item,id:uid(),title:['Campus connections','Celebrating creativity','Looking ahead'][i]}))];news.items.forEach(item=>item.image=photo);}
  if(stats){stats.columns=5;stats.image=photo;stats.items=['2,400|Students','4|Campuses','96%|Graduation rate','30+|Programs','100%|Community commitment'].map(line=>{const [title,text]=line.split('|');return {id:uid(),title,text,image:'',meta:'',link:'',icon:'graduation-cap' as const};});}
  const intro={...section('text','Welcome to Maple County','A community committed to learning, belonging, and opportunities for every student. Explore our schools and the people who make them special.'),label:'Learn more',link:'about',padding:40};
  home.blocks=[hero,...(programs?[programs]:[]),intro,...(events?[events]:[]),...(news?[news]:[]),...(stats?[stats]:[])];
  hero.overlay=0;site.footerBackground='#242424';
 }
 if(site.layout==='international'){
  site.pages[0].blocks=site.pages[0].blocks.filter(block=>block.type!=='split');
  hero.text='For generations, we have welcomed families from around the world. Our dedicated educators and curious young learners bring many perspectives together in one caring community. Learn more about who we are and where we are going.';
  hero.slides?.forEach(slide=>{slide.title='';slide.text=hero.text;slide.label='Learn more';});
  const programs=site.pages[0].blocks.find(block=>block.type==='features');if(programs){programs.items?.forEach(item=>item.image='/demo-campus.webp');programs.items?.push(...['Arts','Athletics','Technology & innovation'].map(title=>({id:uid(),title,text:'Explore new interests and develop your skills.',image:'/demo-campus.webp',link:'academics',meta:''})));}
  const newsIndex=home.blocks.findIndex(b=>b.type==='news');if(newsIndex>=0)home.blocks.splice(newsIndex,0,{...section('split','Learning connects us','Discover how our students turn curiosity into new ideas, meaningful projects, and community connections.'),image:photo,label:'Read our story',link:'news',background:'#ffffff',padding:60});
  const recommendation=home.blocks.find(b=>b.type==='testimonial');if(recommendation){recommendation.title='Why families choose Harborlight';recommendation.text='';recommendation.carousel=true;recommendation.columns=3;recommendation.items=Array.from({length:9},(_,i)=>({id:uid(),title:['A welcoming community','Room to discover','Support at every step'][i%3],text:['Our family found a place to learn, connect, and feel at home.','Thoughtful teachers make time for each learner’s questions and ideas.','New experiences have helped our child grow in confidence.'][i%3],meta:'Fictional family '+(i+1),image:photo,link:''}));}
  const updatesIndex=home.blocks.findIndex(b=>b.type==='news');if(updatesIndex>=0)home.blocks.splice(updatesIndex,0,{...section('text','News & Events',''),anchor:'news-and-events',padding:30,align:'center'});
  home.blocks.push({...section('features','Our community partners',''),columns:4,background:'#ffffff',items:['Learning Network','Global Schools','Community Partners','Education Alliance'].map(title=>({id:uid(),title,text:'Fictional demonstration partner',image:'',meta:'',link:'about-us',icon:'globe' as const}))});
 }
 if(site.layout==='network'){
  site.heroLinks='Staff directory|departments\nDistrict budget|district-information\nFamily updates|community';
  const schools=site.pages.find(page=>page.slug==='schools');if(schools)schools.hidden=true;
  const stats=home.blocks.find(b=>b.type==='stats');if(stats){stats.title='By the Numbers';stats.columns=4;stats.items=['7,800|Learners','15|Schools','42|Languages','96%|Graduation rate','700|Educators','80+|Activities','25|Community partners','100%|Commitment'].map(line=>{const [title,text]=line.split('|');return {id:uid(),title,text,meta:'',image:'',link:''};});}
  const welcome=home.blocks.find(b=>b.type==='text');if(welcome){welcome.type='split';welcome.image=photo;welcome.reverse=true;welcome.background='#eaeaea';welcome.label='Learn about our district';welcome.link='district-information';}
  const news=home.blocks.find(b=>b.type==='news');if(news){news.background=site.accent;news.color='#ffffff';news.items?.forEach(item=>item.image=photo);}
  const events=home.blocks.find(b=>b.type==='events');if(events){events.carousel=true;events.columns=3;events.background='#ffffff';}
 }
 if(['district','corporation','international','network','editorial'].includes(site.layout??'')){
  const roots=site.pages.filter(p=>p!==site.pages[0]&&!p.hidden&&!p.parentId);
  for(const parent of roots){if(site.pages.some(p=>p.parentId===parent.id))continue;
   const labels=parent.name.toLowerCase().includes('school')?['School directory','Enrollment information','Campus resources']:parent.name.toLowerCase().includes('admission')?['Visit our campus','How to apply','Tuition & assistance']:['Overview & information','Resources & services','Contact our team'];
   for(const name of labels){const slug=parent.slug+'-'+slugify(name);if(!site.pages.some(p=>p.slug===slug))site.pages.push({id:uid(),name,slug,parentId:parent.id,blocks:[{...makeBlock('text'),title:name,text:'Explore sample information and resources for our community. All details in this demonstration are fictional.'}]});}
  }
 }
 if(site.layout==='portal'){
  const more=site.pages.find(page=>page.slug==='services-supports');if(more&&!more.hidden)more.name='More';
  hero.slides?.forEach(slide=>{slide.title=hero.title;slide.text=hero.text;});
  const events=site.pages[0].blocks.find(block=>block.type==='events');if(events)events.carousel=true;
 }
}
