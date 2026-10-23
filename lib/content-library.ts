import {makeBlock,uid,type Block,type BlockType,type Website} from './editor-model';
// Editable content imported from the supplied pricing HTML; prices are display content only.
export const pricingContent={
  "plans": [
    {
      "title": "FREE",
      "text": "Build and explore before upgrading.",
      "price": {
        "amount": "$0",
        "period": "forever",
        "annual": "$0/year",
        "badge": "",
        "features": [
          "1 unpublished draft website",
          "Up to 5 pages",
          "250 MB media storage",
          "1 editor account",
          "Access to templates",
          "Visual editor",
          "Preview your website"
        ]
      }
    },
    {
      "title": "STARTER",
      "text": "An affordable first step for your business.",
      "price": {
        "amount": "$9",
        "period": "/month",
        "annual": "or $90/year",
        "badge": "",
        "features": [
          "1 published website",
          "Up to 5 pages",
          "250 MB media storage",
          "1 editor account",
          "Custom-domain connection",
          "Forms with a private inbox",
          "All standard features",
          "Standard email support"
        ]
      }
    },
    {
      "title": "ESSENTIALS",
      "text": "More room to showcase your business.",
      "price": {
        "amount": "$15",
        "period": "/month",
        "annual": "or $150/year",
        "badge": "",
        "features": [
          "1 published website",
          "Up to 10 pages",
          "500 MB media storage",
          "1 editor account",
          "Custom-domain connection",
          "Forms with a private inbox",
          "All standard features",
          "Standard email support"
        ]
      }
    },
    {
      "title": "GROWTH",
      "text": "Expand your online presence.",
      "price": {
        "amount": "$22",
        "period": "/month",
        "annual": "or $220/year",
        "badge": "",
        "features": [
          "1 published website",
          "Up to 20 pages",
          "1 GB media storage",
          "1 editor account",
          "Custom-domain connection",
          "Forms with a private inbox",
          "All standard features",
          "Standard email support"
        ]
      }
    },
    {
      "title": "PRO I",
      "text": "For businesses and organizations.",
      "price": {
        "amount": "$29",
        "period": "/month",
        "annual": "or $290/year",
        "badge": "",
        "features": [
          "1 published website",
          "Up to 25 pages",
          "2 GB media storage",
          "1 editor account",
          "Custom-domain connection",
          "Forms with a private inbox",
          "All standard features",
          "Standard email support"
        ]
      }
    },
    {
      "title": "PRO II",
      "text": "For growing teams and content-rich sites.",
      "price": {
        "amount": "$59",
        "period": "/month",
        "annual": "or $590/year",
        "badge": "RECOMMENDED",
        "features": [
          "1 published website",
          "Up to 100 pages",
          "10 GB media storage",
          "Up to 5 editor accounts",
          "Custom-domain connection",
          "Forms with a private inbox",
          "All standard features",
          "Standard email support"
        ]
      }
    },
    {
      "title": "PREMIUM I",
      "text": "For schools and multi-site organizations.",
      "price": {
        "amount": "$129",
        "period": "/month",
        "annual": "or $1,290/year",
        "badge": "",
        "features": [
          "Up to 3 published websites",
          "250 pages per website",
          "25 GB shared media storage",
          "Up to 10 editor accounts",
          "Custom domain per website",
          "Forms with a private inbox",
          "All standard features",
          "Priority email support",
          "One 60-minute onboarding session"
        ]
      }
    },
    {
      "title": "PREMIUM II",
      "text": "For larger organizations and school networks.",
      "price": {
        "amount": "$249",
        "period": "/month",
        "annual": "or $2,490/year",
        "badge": "",
        "features": [
          "Up to 10 published websites",
          "600 pages per website¹",
          "50 GB shared media storage",
          "Up to 25 editor accounts",
          "Custom domain per website",
          "Forms with a private inbox",
          "All standard features",
          "Priority email support",
          "Onboarding and quarterly review"
        ]
      }
    },
    {
      "title": "ENTERPRISE",
      "text": "Custom solutions for your organization.",
      "price": {
        "amount": "Contact Sales",
        "period": "Starting at $599/month",
        "annual": "Custom annual agreement",
        "badge": "",
        "features": [
          "Custom website count",
          "Custom page and storage allowances¹",
          "Tailored editor access",
          "Custom-domain connections",
          "Forms with a private inbox",
          "Named account contact",
          "Tailored onboarding plan",
          "Training, migration and integrations scoped separately"
        ]
      }
    }
  ],
  "addons": [
    {
      "title": "Additional Website",
      "text": "Add one website to a Premium plan. Existing page, shared storage and editor allowances apply.",
      "price": {
        "amount": "$19",
        "period": "/month",
        "annual": "or $190/year",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Additional Editor",
      "text": "Add one editor account to a paid plan, with access assigned to specific websites.",
      "price": {
        "amount": "$5",
        "period": "/month",
        "annual": "or $50/year",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Additional Storage",
      "text": "Add 10 GB of shared media storage. Bandwidth and video streaming are not unlimited.",
      "price": {
        "amount": "$10",
        "period": "/month",
        "annual": "or $100/year",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Launch Assistance",
      "text": "Template, branding, navigation and up to 5 pages using your content. One revision round.",
      "price": {
        "amount": "$299",
        "period": "one-time",
        "annual": "",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Website Build",
      "text": "Up to 10 standard pages using your content. Two revision rounds; custom work quoted separately.",
      "price": {
        "amount": "From $999",
        "period": "one-time",
        "annual": "",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Content Migration",
      "text": "Migrate up to 20 standard pages. Complex layouts and large libraries quoted separately.",
      "price": {
        "amount": "From $499",
        "period": "one-time",
        "annual": "",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Managed Content Care",
      "text": "Up to 1 hour of updates each month. No rollover; additional work is $85/hour.",
      "price": {
        "amount": "$99",
        "period": "/month",
        "annual": "or $990/year",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Team Training",
      "text": "One 60-minute remote session covering editing, calendars, forms and publishing.",
      "price": {
        "amount": "$149",
        "period": "per session",
        "annual": "",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Calendar Reminder Setup",
      "text": "Configure and test calendar reminders. Email-provider usage charges are additional.",
      "price": {
        "amount": "$99",
        "period": "one-time",
        "annual": "",
        "badge": "",
        "features": []
      }
    },
    {
      "title": "Custom Development",
      "text": "Custom features and integrations, subject to feasibility and an agreed written scope.",
      "price": {
        "amount": "From $125",
        "period": "/hour",
        "annual": "",
        "badge": "",
        "features": []
      }
    }
  ],
  "benefits": [
    {
      "title": "Beautiful Templates",
      "text": "Modern designs for your website."
    },
    {
      "title": "Easy to Manage",
      "text": "A visual editor with powerful features."
    },
    {
      "title": "Grows With You",
      "text": "From a single website to multi-site organizations."
    }
  ],
  "standard": "Hosting & HTTPS · Visual editor & templates · Custom branding · Device previews · Autosave & draft backups · Form inbox & CSV export · Website calendar",
  "notes": "All prices in USD. Annual plans and recurring add-ons are billed upfront: 12 months for the price of 10. Enterprise: monthly and annual terms are tailored to your agreement.\n\nDomains & services: Domain registration and renewal are separate. Website builds, migration, copywriting, training and managed updates are included only where explicitly stated.\n\nWebsite management: A desktop or laptop is required to manage your website. Public websites work on mobile. Customer editors save drafts; administrators publish changes.\n\nPlan allowances: Storage and editor seats are shared across your organization; page limits apply per website. ¹ Page allowances remain subject to supported platform limits, including the 900 KB website-data limit, separate from media storage.\n\nForms & reminders: Responses go to a private inbox without email notifications. Calendar reminders require a configured email provider and enabled administrator rules; usage charges are additional."
};
export const moduleCatalog:{type:BlockType;name:string;category:string;description:string}[]=[
 ['pricing','Pricing cards','Commerce','Editable plan prices, annual rates, badges and feature lists'],['hero','Hero & slideshow','Media','Photo, video background, slides and calls to action'],['text','Text','Content','Paragraphs, bold emphasis and bulleted lists'],['image','Image','Media','Image with caption and alternative text'],['features','Feature cards','Content','Flexible columns of illustrated content'],['cta','Call to action','Content','Prominent message and button'],['spacer','Spacer','Layout','Adjust the space between sections'],['quicklinks','Quick links','Navigation','Compact shortcuts with icons'],['icons','Icon grid','Navigation','Selectable icons with titles and links'],['news','News cards','Collections','Stories, images, categories and page links'],['events','Event cards','Collections','Upcoming events and optional carousel'],['stats','Statistics','Content','Key numbers and labels'],['split','Image & text','Layout','Editorial content beside a photo'],['testimonial','Testimonial','Content','A quote from your community'],['gallery','Photo gallery','Media','Photo grid with enlarged image viewer'],['accordion','Accordion','Layout','Expandable panels containing text and sections'],['directory','People directory','Collections','Search and filter people by role or department'],['video','Video','Media','Uploaded MP4/WebM or YouTube/Vimeo video'],['alert','Announcement','Content','A prominent notice with optional link'],['documents','Document library','Collections','PDF uploads, searchable resources and downloads'],['tabs','Tabbed content','Layout','Keyboard-accessible tabs with nested sections'],['table','Data table','Content','Editable headings and rows, with mobile scrolling'],['timeline','Timeline & steps','Content','Sequential milestones or an application journey'],['payment','Payment checkout','Commerce','Stripe checkout with a saved price and private payment history'],['form','Form','Forms','Editable fields and a private submission inbox'],['contact','Contact information','Forms','Locations, opening hours, phone and email'],['calendar','Calendar','Collections','Month and list views, filters and event details'],['feed','Updates feed','Collections','Searchable community announcements'],['logos','Partner logos','Media','A flexible row of logos or partner names'],['linklist','Resource links','Navigation','Related pages with descriptions'],['group','Column group','Layout','Combine editable sections in nested columns']
].map(([type,name,category,description])=>({type:type as BlockType,name,category,description}));
export const pageLayouts=[
 ['pricing','Pricing & plans','Complete nine-plan page with ten add-ons, shared features and billing notes; adopts your website theme'],['overview','Overview','Introduction, feature cards and related resources'],['department','Department','Office introduction, resources and team directory'],['program','Academic program','Program overview, learning stages and questions'],['admissions','Admissions','Application steps, dates and inquiry form'],['directory','Staff directory','Searchable people and departments'],['calendar','Calendar','Month grid, event list and announcements'],['news','News & updates','Story cards and community updates'],['article','Article','Editorial story, image and related reading'],['resources','Resource center','Documents, grouped links and questions'],['policies','Policies','Policy accordions and document downloads'],['contact','Contact & directions','Office information and contact form'],['schedule','Schedules','Tabs containing detailed tables'],['fees','Fees & services','Price tables, support information and FAQ'],['board','Board & governance','Leadership, meetings, agendas and minutes'],['gallery','Photo & video','Image gallery and video section'],['portal','Resource portal','Audience tabs and useful links'],['form','Application form','Introductory guidance and editable form'],['timeline','History & milestones','A timeline with supporting imagery'],['sitemap','Site map','Links to every public page']
].map(([id,name,description])=>({id,name,description}));
const entry=(title:string,text='',meta='',link='')=>({id:uid(),title,text,meta,link,image:''});
export function pricingSection(addons=false):Block{return {...makeBlock('pricing'),title:addons?'Add-on solutions':'Website subscription plans',text:addons?'Enhance your plan with additional features and services.':'',columns:addons?5:3,gap:20,radius:16,inheritTheme:true,items:(addons?pricingContent.addons:pricingContent.plans).map(item=>({...entry(item.title,item.text),price:structuredClone(item.price)}))};}
export function sectionPreset(id:string):Block{
 if(id==='pricing'||id==='pricing:addons')return pricingSection(id==='pricing:addons');
 if(id==='text:pricing-notes')return {...makeBlock('text'),title:'Billing & service details',text:pricingContent.notes,inheritTheme:true};
 const base=id.split(':')[0] as BlockType,b=makeBlock(base);
 if(id==='tabs:schedule'){b.title='Daily schedules';b.items=['Regular day','Early release','Activity day'].map((title,i)=>({...entry(title),children:[{...makeBlock('table'),title,tableColumns:['Period','Start','End','Location','Notes'],items:['Arrival','Learning block 1','Break','Learning block 2','Lunch','Learning block 3'].map((name,n)=>({...entry(name),cells:[name,`${8+n}:00`,`${8+n}:45`,n%2?'Learning center':'Main campus',i===1?'Adjusted schedule':'']}))}]}));}
 if(id==='tabs:admissions'){b.title='Plan your next chapter';b.items=[{...entry('Explore'),children:[makeBlock('split')]},{...entry('Apply'),children:[makeBlock('timeline')]},{...entry('Questions'),children:[makeBlock('accordion')]}];}
 if(id==='group:sidebar'){b.title='';b.columns=2;b.columnLayout='wide-left';b.children=[{...makeBlock('text'),title:'Welcome to our department'},{...makeBlock('directory'),title:'Your contact',items:[entry('Jordan Lee','Here to help you find the right resources.','Community coordinator','mailto:hello@example.com')]}];}
 if(id==='group:resources'){b.title='Resources for our community';b.columns=2;b.children=[makeBlock('documents'),makeBlock('accordion')];}
 if(id==='group:news'){b.title='Stay connected';b.columns=2;b.children=[makeBlock('feed'),makeBlock('calendar')];}
 if(id==='table:fees'){b.title='Sample fees';b.tableColumns=['Service','Full year','Per term','Includes'];b.items=[{...entry('Core program'),cells:['Core program','$2,400','$800','Learning materials']},{...entry('Extended care'),cells:['Extended care','$900','$300','Afternoon activities']},{...entry('Meals'),cells:['Meals','$600','$200','Weekday lunch']}];}
 if(id==='accordion:documents'){b.title='Policies & guidance';b.items=['Community guidelines','Health & wellbeing','Registration & records'].map(title=>({...entry(title),children:[{...makeBlock('documents'),title:'Related documents'}]}));}
 if(id==='form:application'){b.title='Start your application';b.fields=[{id:uid(),label:'Applicant name',type:'text',required:true},{id:uid(),label:'Contact email',type:'email',required:true},{id:uid(),label:'Program of interest',type:'select',required:true,options:['Early learning','Elementary','Middle school','High school']},{id:uid(),label:'Preferred start date',type:'date'},{id:uid(),label:'Questions for our team',type:'textarea'},{id:uid(),label:'I agree to be contacted about this application',type:'checkbox',required:true}];}
 if(id==='form:volunteer'){b.title='Volunteer interest';b.fields=[{id:uid(),label:'Your name',type:'text',required:true},{id:uid(),label:'Email',type:'email',required:true},{id:uid(),label:'Area of interest',type:'select',options:['Community events','Mentoring','Creative activities']},{id:uid(),label:'Availability',type:'textarea'}];}
 if(id==='gallery:campus'){b.title='Explore our campus';b.items=['Spaces to discover','Places to connect','Room to create'].map(title=>({...entry(title,'An illustration of our fictional community.'),image:'/demo-campus.webp'}));}
 if(id==='directory:leadership'){b.title='Meet our leadership team';b.items=['Alex Morgan','Jordan Lee','Taylor Reed','Casey Parker'].map((name,i)=>entry(name,'Connect with our team for guidance and support.',['Community director','Learning coordinator','Operations manager','Family liaison'][i],'mailto:hello@example.com'));}
 if(id==='documents:board'){b.title='Agendas & meeting records';b.items=['October agenda','September minutes','Annual priorities','Community participation guide'].map((title,i)=>entry(title,'Fictional meeting material for demonstration. Replace with your approved document or page link.',i<2?'Meeting records':'Governance'));}
 if(id==='hero:admissions'){b.title='Your next chapter starts here.';b.image='/demo-campus.webp';b.label='Explore admissions';b.link='admissions';}
 if(id==='icons:services'){b.title='How can we help?';b.items=['Calendar','Transportation','Meals','Registration','Family support','Contact'].map(title=>entry(title,'Find information and support.', '', 'contact'));b.columns=6;}
 if(id==='linklist:audience'){b.title='Resources for you';b.items=['Students','Families','Staff','Community'].map(title=>entry(title,'Find useful information, upcoming dates and support.','','contact'));}
 return b;
}
export const sectionPresets=[...moduleCatalog.map(m=>({id:m.type,name:m.name,category:m.category,description:m.description})),
 ...[['pricing:addons','Pricing add-ons','Commerce','Ten editable service cards with monthly, annual and one-time prices'],['text:pricing-notes','Pricing billing notes','Commerce','Editable billing terms and service details'],['tabs:schedule','Tabbed schedules','Layout','Three schedules with editable period tables'],['tabs:admissions','Admissions tabs','Layout','Overview, application steps and FAQs'],['group:sidebar','Content & contact','Layout','A content column beside a contact profile'],['group:resources','Documents & FAQs','Layout','A two-column resource dashboard'],['group:news','Updates & calendar','Layout','Announcements beside upcoming dates'],['table:fees','Fees & tuition','Content','Prices, terms and included services'],['accordion:documents','Policy accordion','Collections','Expandable document libraries'],['form:application','Application form','Forms','Program choice, dates and contact information'],['form:volunteer','Volunteer form','Forms','Interests and availability'],['gallery:campus','Campus gallery','Media','Illustrative images with captions'],['directory:leadership','Leadership team','Collections','Four searchable profiles'],['documents:board','Board documents','Collections','Agendas, minutes and governance resources'],['hero:admissions','Admissions hero','Media','Photo-led introduction with a call to action'],['icons:services','Service shortcuts','Navigation','Six community resource links'],['linklist:audience','Audience resources','Navigation','Student, family, staff and community links']].map(([id,name,category,description])=>({id,name,category,description}))];
export function pagePreset(kind:string,title:string,site?:Pick<Website,'name'|'accent'>):Block[]{
 if(kind==='pricing')return [
 {...makeBlock('text'),title,text:`${site?.name??'Our website'} · Professional Websites for Every Stage\n\nSimple. Flexible. Built for Businesses, Schools, and Organizations.`,inheritTheme:true,padding:32},
 {...makeBlock('features'),title:'Built around your needs',text:'',inheritTheme:true,padding:32,items:pricingContent.benefits.map((item,i)=>({...entry(item.title,item.text),icon: (['palette','laptop','globe'] as const)[i]}))},
 pricingSection(),{...makeBlock('text'),title:'Standard features on every paid plan',text:pricingContent.standard,inheritTheme:true,padding:32},pricingSection(true),sectionPreset('text:pricing-notes')];
 const intro={...makeBlock('text'),title,text:`${title} at ${site?.name??'our community'}. Explore the information below, review your options, and contact our team for help.`,padding:32};
 const map:Record<string,string[]>={overview:['features','linklist'],department:['group:sidebar','documents','accordion'],program:['split','tabs','accordion'],admissions:['timeline','table','form:application'],directory:['directory:leadership'],calendar:['calendar'],news:['news','feed'],article:['image','text','linklist'],resources:['documents','group:resources'],policies:['accordion:documents','documents'],contact:['contact','form'],schedule:['tabs:schedule'],fees:['table:fees','accordion'],board:['directory:leadership','calendar','documents:board'],gallery:['gallery:campus','video'],portal:['tabs','linklist:audience'],form:['form:application'],timeline:['timeline','split'],sitemap:['linklist']};
 return [intro,...(map[kind]??map.overview).map(id=>{const b=sectionPreset(id);b.padding=32;return b;})];
}
