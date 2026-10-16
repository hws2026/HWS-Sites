import '@vitejs/plugin-react/preamble';
import {createRoot,type Root} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {MobileWorkspace} from '../pages/mobile-workspace';
import {template} from '../lib/editor-model';
import {setSessionToken} from '../lib/client-runtime';
import '../app/globals.css';
import '../app/suite-brand.css';
import '../app/commerce.css';
let revision=1,site=template('general');site.name='Northwood School';site.calendarEvents=[{id:'event-1',title:'Open house',description:'Meet the school team',category:'Community',location:'Main campus',link:'',startsAt:'2027-01-15T15:00:00.000Z'}];
setSessionToken('local-fixture-only');
window.fetch=async(input,init)=>{
 const url=new URL(String(input instanceof Request?input.url:input),location.origin),body=init?.body?JSON.parse(String(init.body)):{};
 if(url.pathname==='/api/mobile')return Response.json(init?.method==='POST'?{ok:true}:{email:'owner@example.test',role:'admin',sites:[{id:'school',title:site.name,role:'admin'}]});
 if(url.pathname==='/api/events'){if(init?.method==='PUT'){site={...site,calendarEvents:body.calendarEvents,calendarTimeZone:body.calendarTimeZone};revision++;}return Response.json({site,revision,role:'admin',published:true});}
 if(url.pathname==='/api/forms')return Response.json(url.searchParams.has('id')?{id:'response-1',form_name:'Contact us',page_name:'Contact',status:'new',created_at:'2026-10-15T12:00:00Z',answers:[{fieldId:'name',type:'text',label:'Full name',value:'Sample Visitor'}]}:{responses:[{id:'response-1',form_name:'Contact us',page_name:'Contact',status:'new',created_at:'2026-10-15T12:00:00Z'}],total:1});
 if(url.pathname==='/api/billing')return Response.json({agreements:[],payments:[],customers:[{id:'customer',name:'Northwood School',email:'owner@example.test'}],configured:false,portalConfigured:false,testMode:true,admin:true});
 return Response.json({error:'This local fixture has no live service access.'},{status:400});
};
function Fixture(){const [route,setRoute]=useState(location.hash.slice(1)||'/mobile');useEffect(()=>{const update=()=>setRoute(location.hash.slice(1));window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);return <MobileWorkspace route={route}/>;}
const mount=document.getElementById('root')! as HTMLElement&{qaRoot?:Root};mount.qaRoot??=createRoot(mount);mount.qaRoot.render(<Fixture/>);
