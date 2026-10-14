import '@vitejs/plugin-react/preamble';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Suite from '../app/admin/suite';
import Editor from '../app/editor';
import {startFromTemplate} from '../lib/template-start';
import '../app/globals.css';
import '../app/suite-brand.css';
import '../app/commerce.css';
import '../app/website-fonts.css';
import '../app/website-design.css';
import '../app/website-fidelity.css';
import '../app/finalsite-composition.css';
import '../app/website-modules.css';
const mode=new URLSearchParams(location.search).get('mode')||'admin';
const sample=startFromTemplate('crane','full');sample.name='Cedar District';
const sites=[{id:'fixture-site',customer_id:mode==='admin'?'':'district',title:'Cedar District',slug:'cedar-district',template_id:'crane',revision:1,archived:0,is_published:1,role:mode==='admin'?'admin':'editor',updated_at:new Date().toISOString()}];
let archivedTemplateIds=['crane'];
window.fetch=async(input,init={})=>{
 const path=new URL(String(input instanceof Request?input.url:input),location.origin).pathname;
 if(path==='/api/site')return Response.json({site:sample,revision:1,role:'admin',archived:0,templateId:'crane',archivedTemplateIds,url:''});
 if(path==='/api/admin'||path==='/api/portal'){
  if(init.method==='POST'){
   const body=init.body?JSON.parse(init.body):{};
   if(body.action==='archive-template')archivedTemplateIds=[...new Set([...archivedTemplateIds,body.templateId])];
   if(body.action==='restore-template')archivedTemplateIds=archivedTemplateIds.filter(id=>id!==body.templateId);
   return Response.json({ok:true});
  }
  return Response.json({workspace:{id:'fixture',name:'Local review · fictional data'},email:'review@example.com',sites,customers:[],activity:[],access:[],archivedTemplateIds});
 }
 return Response.json({error:'No live services in this local review'},{status:404});
};
createRoot(document.querySelector('#root')).render(React.createElement(mode==='editor'?Editor:Suite,mode==='editor'?{siteId:'fixture-site'}:{portal:mode==='portal'}));
