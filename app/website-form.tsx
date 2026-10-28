'use client';
import {createContext,useContext,useId,useRef,useState} from 'react';
import {ArrowRight} from 'lucide-react';
import type {Block} from '@/lib/editor-model';
import {publicFormUrl} from '@/lib/client-runtime';
import {responseJson,failureReason} from '@/lib/api-error';
import {MAX_FORM_FILES,MAX_FORM_FILE_BYTES} from '@/lib/form-model';
export const WebsiteFormContext=createContext({pageId:'',live:false});
export function WebsiteForm({block,editing}:{block:Block;editing?:boolean}){
 const context=useContext(WebsiteFormContext),id=useId(),requestId=useRef(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 const live=context.live&&!editing&&Boolean(publicFormUrl()),closed=block.formEnabled===false;
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!live||closed||busy)return;
  const form=event.currentTarget,data=new FormData(form),files=Array.from(data.values()).filter((v):v is File=>v instanceof File&&v.size>0);
  if(files.length>MAX_FORM_FILES||files.some(f=>f.size>MAX_FORM_FILE_BYTES)){setError('Use up to three attachments, no larger than 256 KB each.');return;}
  if(!requestId.current)requestId.current=crypto.randomUUID();data.set('requestId',requestId.current);data.set('pageId',context.pageId);data.set('formId',block.id);
  setBusy(true);setError('');
  try{await responseJson(await fetch(publicFormUrl(),{method:'POST',body:data,credentials:'omit'}));form.reset();setSent(true);}catch(e){setError(failureReason(e));}finally{setBusy(false);}
 }
 if(sent)return <div className="form-success" role="status"><strong>Response received</strong><p>{block.formSuccessMessage||'Thank you. Your response has been sent to our team.'}</p><button type="button" className="module-button" onClick={()=>{requestId.current='';setSent(false);}}>Send another response</button></div>;
 return <form className="module-form" onSubmit={e=>void submit(e)}>{block.text&&<p>{block.text}</p>}{!live&&<p className="form-demo-note">Form preview. Responses are collected on the published public website.</p>}{closed&&<p role="status">This form is not currently accepting responses.</p>}
 <div className="form-honeypot" aria-hidden="true"><label>Leave this field blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <fieldset disabled={busy||closed}><legend className="site-sr-only">{block.title||'Website form'}</legend>{block.fields?.map(field=>field.type==='radio'?<fieldset key={field.id}><legend>{field.label}{field.required?' *':''}</legend><div className="form-radio-options">{field.options?.map((option,n)=><label key={n}><input type="radio" name={'field:'+field.id} value={option} required={field.required}/>{option}</label>)}</div></fieldset>:<label key={field.id} htmlFor={id+field.id}>{field.label}{field.required?' *':''}{field.type==='textarea'?<textarea id={id+field.id} name={'field:'+field.id} required={field.required} maxLength={10000} rows={5}/>:field.type==='select'?<select id={id+field.id} name={'field:'+field.id} required={field.required} defaultValue=""><option value="">Choose an option…</option>{field.options?.map((option,index)=><option key={index}>{option}</option>)}</select>:<input id={id+field.id} name={'field:'+field.id} type={field.type} required={field.required} maxLength={2000} step={field.type==='number'?'any':undefined} accept={field.type==='file'?'.pdf,.jpg,.jpeg,.png,.txt':undefined}/ >}{field.type==='file'&&<small>PDF, PNG, JPEG or text · up to 256 KB · three attachments per response</small>}</label>)}</fieldset>
 {block.formPrivacyText&&<p className="form-privacy">{block.formPrivacyText}</p>}{error&&<p className="form-error" role="alert">{error}</p>}<button className="module-button" type="submit" disabled={!live||closed||busy||!block.fields?.length}>{busy?'Sending…':block.label&&block.label!=='Preview submission'&&block.label!=='Explore more'?block.label:'Submit response'}<ArrowRight size={16}/></button></form>;
}
