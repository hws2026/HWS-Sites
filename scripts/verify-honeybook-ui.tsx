import '@vitejs/plugin-react/preamble';
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {WebsitePaymentsPanel} from '../app/admin/website-payments-panel';
import {PaymentSettings,PaymentEditorContext} from '../app/payment-settings';
import {WebsitePayment} from '../app/website-payment';
import {makeBlock,type Block} from '../lib/editor-model';
import {setSessionToken} from '../lib/client-runtime';
import type {HoneyBookData} from '../lib/honeybook-model';
import '../app/globals.css';
import '../app/suite-brand.css';
import '../app/commerce.css';
import '../app/customer-services.css';
setSessionToken('local-fixture-only');
const site='local-site',at='2026-10-23T06:00:00Z';
const data:HoneyBookData={sites:[{id:site,title:'Paradis Photo Booths · Preview',customer_id:'sample'}],links:[{id:'private',site_id:site,kind:'private_invoice',label:'Smith reception · private deposit',url:'https://app.honeybook.com/pay/example',enabled:1,created_at:at},{id:'public',site_id:site,kind:'public_form',label:'Book a photo booth',url:'https://app.honeybook.com/public/example',enabled:1,created_at:at}],connections:[],payments:[{id:'payment1',site_id:site,source:'automation',paymentId:'example-payment-1',label:'Event deposit',amount:15000,currency:'USD',paidAt:at,clientName:'Alex Example',clientEmail:'alex@example.test',project:'Sample reception',invoiceUrl:'https://app.honeybook.com/pay/example',voided:0,created_at:at},{id:'payment2',site_id:site,source:'manual',paymentId:'example-payment-2',label:'Remaining balance',amount:22500,currency:'USD',paidAt:at,clientName:'Jordan Example',clientEmail:'jordan@example.test',project:'Sample celebration',invoiceUrl:'',voided:0,created_at:at}],next:null};
window.fetch=async(input,init)=>{const u=new URL(String(input instanceof Request?input.url:input),location.origin),b=init?.body?JSON.parse(String(init.body)):{};
 if(u.pathname==='/api/honeybook'){if(init?.method==='POST'){
  if(b.action==='save-link'){data.links.push({id:crypto.randomUUID(),site_id:site,kind:b.kind,label:b.label,url:b.url,enabled:1,created_at:at});}
  if(b.action==='toggle'){const link=data.links.find(l=>l.id===b.id);if(link)link.enabled=Number(b.enabled);}
  if(b.action==='record-payment'){data.payments.unshift({...b,id:crypto.randomUUID(),site_id:site,amount:Math.round(Number(b.amount)*100),source:'manual',voided:0,created_at:at});}
  if(b.action==='void-payment'){const p=data.payments.find(p=>p.id===b.id);if(p)p.voided=1;}
  if(b.action==='connect'||b.action==='rotate'){data.connections=[{id:'sample-connection',site_id:site,enabled:1,last_test_at:null,last_received_at:null,created_at:at}];return Response.json({ok:true,token:'LOCAL-PREVIEW-NOT-A-REAL-KEY',endpoint:'https://example.test/api/honeybook/events/local-preview'});}
  if(b.action==='disconnect')data.connections=[];
  return Response.json({ok:true});
 }return Response.json(data);}
 if(u.pathname==='/api/website-payments')return Response.json(u.searchParams.get('provider')==='honeybook'?{links:data.links.filter(l=>l.kind==='public_form')}:{configured:false,customers:[],sites:data.sites,accounts:[],offers:[],orders:[],payments:[]});
 return Response.json({error:'Local preview only. No external requests are sent.'},{status:400});};
function Fixture(){const [mobile,setMobile]=useState(false),[editor,setEditor]=useState(false),[block,setBlock]=useState<Block>({...makeBlock('payment'),paymentProvider:'honeybook',label:'Book your photo booth'});return <main className="studio" style={{maxWidth:mobile?390:1180,margin:'auto',padding:mobile?10:28,background:'#f7f8fb',minHeight:'100vh'}}><p>LOCAL PREVIEW · Dummy data · No payments or live connections</p><nav style={{display:'flex',gap:8,margin:'16px 0',flexWrap:'wrap'}}><button className="button" onClick={()=>setMobile(v=>!v)}>{mobile?'Desktop width':'Mobile width'}</button><button className="button" onClick={()=>setEditor(v=>!v)}>{editor?'Billing workspace':'Payment section editor'}</button></nav>{editor?<PaymentEditorContext.Provider value={site}><section className="service-card"><h2>Payment section settings</h2><PaymentSettings block={block} onChange={patch=>setBlock(b=>({...b,...patch}))}/></section><section className="service-card"><h2>Website preview</h2><WebsitePayment block={block} editing/></section></PaymentEditorContext.Provider>:<WebsitePaymentsPanel/>}</main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
