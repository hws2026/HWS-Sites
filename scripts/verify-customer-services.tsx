import '@vitejs/plugin-react/preamble';
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {SecurityPanel,SupportPanel,TeamPanel} from '../app/admin/customer-center';
import {HoneyBookPanel} from '../app/admin/honeybook-panel';
import {Onboarding} from '../pages/onboarding';
import policies from '../lib/legal-policies.json';
import {setSessionToken} from '../lib/client-runtime';
import '../app/globals.css';
import '../app/suite-brand.css';
import '../app/commerce.css';
import '../app/customer-services.css';
setSessionToken('isolated-local-fixture');
const nativeFetch=window.fetch.bind(window);
const context={email:'sample@example.test',ip:'192.0.2.15',city:'Example city',region:'Example state',country:'US',latitude:null,longitude:null,userAgent:'Sample browser'};
const thread={id:'thread',customer_id:'customer',subject:'Help updating our event page',status:'open',assignee:'agent',updated_at:'2026-10-21T12:30:00Z'};
let messages=[{id:'m1',created_at:'2026-10-21T12:30:00Z',payload:{email:'sample@example.test',message:'Can you help us update the upcoming events?',staff:false}}];
window.fetch=async(input,init)=>{const url=new URL(String(input instanceof Request?input.url:input),location.origin);if(url.pathname.startsWith('/policies/'))return nativeFetch(input,init);const b=init?.body?JSON.parse(String(init.body)):{};
 if(url.pathname==='/api/security')return Response.json({events:[{id:'event',event:'login',outcome:'failed',target:'',status:401,created_at:'2026-10-21T12:00:00Z',context}],acceptances:[{id:'accept',policy_id:policies[0].id,version:policies[0].version,accepted_at:'2026-10-21T13:00:00Z',context}],policies,next:null,encryptionConfigured:true});
 if(url.pathname==='/api/support'){if(init?.method==='POST'){messages=[...messages,{id:'m'+(messages.length+1),created_at:new Date().toISOString(),payload:{email:'support@example.test',message:b.message,staff:true}}];return Response.json({ok:true,threadId:'thread'});}return Response.json(url.searchParams.has('thread')?{messages}:{customers:[{id:'customer',name:'Example organization'}],threads:[thread],members:[{id:'agent',email:'support@example.test'}],staff:true});}
 if(url.pathname==='/api/team')return Response.json({members:[{id:'agent',email:'support@example.test',role:'support',active:1,user_id:'staff'}]});
 if(url.pathname==='/api/honeybook')return Response.json({sites:[{id:'site',title:'Example website'}],links:[]});
 if(url.pathname==='/api/onboarding')return Response.json({required:true,mustChangePassword:false,temporaryExpired:false,policies,accepted:[]});
 return Response.json({error:'Local test only; external services are unavailable.'},{status:400});};
function Fixture(){const [view,setView]=useState(new URLSearchParams(location.search).get('view')==='policies'?'policies':'security');return <main className="onboarding-page"><p>LOCAL TEST PREVIEW · Sample records only</p><nav className="service-inline-form">{['security','support','team','billing','policies'].map(v=><button className="button" key={v} onClick={()=>setView(v)}>{v}</button>)}</nav>{view==='security'?<SecurityPanel/>:view==='support'?<SupportPanel/>:view==='team'?<TeamPanel/>:view==='billing'?<HoneyBookPanel/>:<Onboarding/>}</main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
