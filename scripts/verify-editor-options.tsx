import '@vitejs/plugin-react/preamble';
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Editor from '../app/editor';
import {WebsiteView} from '../app/website-view';
import {IdleWarning} from '../app/idle-warning';
import {createIdleSession} from '../lib/idle-session';
import {setSessionUser} from '../lib/client-runtime';
import {startFromTemplate} from '../lib/template-start';
import {makeBlock} from '../lib/editor-model';
import {validateWebsite} from '../lib/site-store';
import '../app/globals.css';
import '../app/suite-brand.css';
import '../app/commerce.css';
import '../app/website-fonts.css';
import '../app/website-design.css';
import '../app/website-fidelity.css';
import '../app/finalsite-composition.css';
import '../app/website-modules.css';
let site=startFromTemplate('business','scratch'),revision=1,failSave=false;
site.name='Harbor Demo Company';site.accent='#2020b7';site.copyrightName='Harbor Demo Company';
const photo=makeBlock('image');photo.title='Image sizing demo';photo.text='A local preview of adjustable image placement.';photo.image='/demo-campus.webp';photo.imageAlt='Fictional campus';photo.imageSizing={width:60,height:260,fit:'contain',align:'center'};site.pages[0].blocks=[photo];
site.legalLinks={privacy:{enabled:true,url:'https://example.com/privacy'},termsOfUse:{enabled:true,url:'https://example.com/terms-use'},termsOfService:{enabled:true,url:'https://example.com/terms-service'}};
setSessionUser('fixture-user');
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init={})=>{
 const url=new URL(String(input instanceof Request?input.url:input),location.origin);
 if(url.pathname==='/api/site'){
  if(init.method==='PUT'){
   if(failSave)return Response.json({error:'Simulated offline save. Your draft is still in this tab.'},{status:503});
   const body=JSON.parse(String(init.body));site=validateWebsite(body.site);revision++;
  }
  return Response.json({site,revision,role:'admin',archived:0,templateId:site.templateId,archivedTemplateIds:[],url:''});
 }
 if(url.pathname.startsWith('/api/'))return Response.json({error:'Local preview only'},{status:404});
 return originalFetch(input,init);
};
function EditorReview(){const [signedIn,setSignedIn]=useState(true);return <><div style={{display:'flex',gap:12,padding:8,background:'#eeeefe'}}><strong>Local test data only</strong><button onClick={()=>{failSave=true;}}>Simulate failed save</button><button onClick={()=>{window.dispatchEvent(new Event('hws-session-ending'));setSessionUser('');setSignedIn(false);}}>Simulate inactivity logout</button></div>{signedIn?<Editor siteId="fixture-site"/>:<main className="auth-screen"><h1>Test session signed out</h1><button className="button primary" onClick={()=>{failSave=false;setSessionUser('fixture-user');setSignedIn(true);}}>Sign back in to test account</button></main>}</>;}
let elapsed=0;const clock=createIdleSession({storage:()=>undefined,now:()=>elapsed});clock.start('test','test');
function IdleReview(){const [remaining,setRemaining]=useState(clock.remaining());return <main className="auth-screen"><h1>Inactivity review · local clock</h1><p>{remaining?'Session active':'Signed out after inactivity'}</p><button className="button" onClick={()=>{elapsed+=29*60000;setRemaining(clock.remaining());}}>Advance 29 minutes</button><button className="button" onClick={()=>{elapsed+=31*60000;setRemaining(clock.remaining());}}>Simulate sleeping past the deadline</button>{remaining>0&&remaining<=120000&&<IdleWarning seconds={remaining/1000} onStay={()=>{clock.touch();setRemaining(clock.remaining());}} onLogout={()=>{clock.expire();setRemaining(clock.remaining());}}/>}</main>;}
const view=new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('root')!).render(view==='idle'?<IdleReview/>:view==='public'?<WebsiteView site={site} page={site.pages[0]} siteId="demo-options" base="/"/>:<EditorReview/>);
