import {publicFormUrl} from '@/lib/client-runtime';
import {responseJson,failureReason} from '@/lib/api-error';
import {inquiryFields} from '@/lib/imported-inquiry';

/** Bind the original controls to the same private inbox as standard suite forms. */
export function connectImportedInquiry(form:HTMLFormElement,{pageId,formId,live,enabled=true,message}:{pageId:string;formId:string;live:boolean;enabled?:boolean;message?:string}){
 const button=form.querySelector<HTMLButtonElement>('.inquiry-submit')!,status=form.querySelector<HTMLElement>('.form-status')!;
 const note=form.querySelector<HTMLElement>('.local-form-note')!,intro=form.querySelector('p')!;
 intro.textContent='Send your event details to check availability. Our team will confirm your date with you.';
 button.textContent='Submit availability request';button.disabled=!live||!enabled;
 note.textContent=!enabled?'This form is not currently accepting requests.':live?'Submitting a request does not confirm a booking. Our team will follow up with you.':'Form preview. Requests are saved in the website’s Forms inbox after publishing.';
 form.querySelector<HTMLElement>('.clear-draft')!.hidden=true;
 form.querySelector<HTMLElement>('.draft-output')!.hidden=true;
 const honeypot=form.ownerDocument.createElement('input');honeypot.name='website';honeypot.tabIndex=-1;honeypot.autocomplete='off';honeypot.setAttribute('aria-hidden','true');honeypot.style.cssText='position:absolute;left:-10000px;width:1px;height:1px';form.appendChild(honeypot);
 for(const field of inquiryFields){const input=form.elements.namedItem(field.id) as HTMLInputElement|HTMLTextAreaElement|null;if(input&&'maxLength' in input)input.maxLength=field.type==='textarea'?10000:2000;}
 let pending=false,requestId='',fingerprint='',sent=false;
 const submit=async(event:Event)=>{
  event.preventDefault();event.stopImmediatePropagation();if(!live||!enabled||pending||sent||!publicFormUrl())return;
  const source=new FormData(form),data=new FormData();
  const values=inquiryFields.map(field=>[field.id,String(source.get(field.id)??'')]);const next=JSON.stringify(values);
  if(next!==fingerprint){requestId=crypto.randomUUID();fingerprint=next;}
  data.set('pageId',pageId);data.set('formId',formId);data.set('requestId',requestId);data.set('website',honeypot.value);
  values.forEach(([id,value])=>data.set('field:'+id,value));pending=true;button.disabled=true;button.textContent='Sending…';status.textContent='Sending your availability request…';
  try{
   await responseJson(await fetch(publicFormUrl(),{method:'POST',body:data,credentials:'omit'}));sent=true;
   status.textContent=message||'Your availability request was received. Our team will contact you to confirm your event details.';
   button.textContent='Request received';form.querySelectorAll('input,select,textarea').forEach(input=>(input as HTMLInputElement).disabled=true);
  }catch(error){status.textContent=failureReason(error)+' Your details are still here. Please try again.';button.textContent='Submit availability request';button.disabled=false;}
  finally{pending=false;}
 };
 form.addEventListener('submit',submit,true);
 return()=>{form.removeEventListener('submit',submit,true);honeypot.remove();};
}
