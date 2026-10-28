import {makeBlock,uid,type Website} from './editor-model';

export const PARADIS_TEMPLATE='paradis-photo-booths';
export const paradisPages=[
 {file:'index.html',name:'Home',slug:'home',sections:13},
 {file:'360-photo-booth.html',name:'360 Photo Booth',slug:'360-photo-booth',sections:11},
 {file:'gallery.html',name:'Past Events',slug:'gallery',sections:1},
 {file:'backdrops.html',name:'Backdrops',slug:'backdrops',sections:1},
 {file:'check-availability.html',name:'Check Availability',slug:'check-availability',sections:1},
 {file:'privacy-policy.html',name:'Privacy Policy',slug:'privacy-policy',sections:2},
 {file:'terms-conditions.html',name:'Terms & Conditions',slug:'terms-conditions',sections:2},
 {file:'thank-you.html',name:'Thank You',slug:'thank-you',sections:1},
] as const;
export type ImportedStyle=Partial<Record<'color'|'backgroundColor'|'fontSize'|'textAlign'|'width'|'height'|'maxWidth'|'objectFit'|'borderRadius'|'paddingTop'|'paddingBottom',string>>;
export type ImportedEdit={text?:string;href?:string;src?:string;alt?:string;style?:ImportedStyle};
export type ImportedEdits=Record<string,ImportedEdit>;
export type ImportedSection={template:typeof PARADIS_TEMPLATE;page:string;section:number;edits:ImportedEdits};
export type ImportedSite={template:typeof PARADIS_TEMPLATE;header:ImportedEdits;footer:ImportedEdits};

export function paradisTemplate():Website{
 return {name:'Paradisephotobooths',slug:'paradise-photo-booths',templateId:PARADIS_TEMPLATE,
  accent:'#fd66c1',font:'sans',layout:'simple',imported:{template:PARADIS_TEMPLATE,header:{},footer:{}},
  pages:paradisPages.map(p=>({id:uid(),name:p.name,slug:p.slug,importedPage:p.file,layout:'full',hidden:p.file==='thank-you.html',
   blocks:Array.from({length:p.sections},(_,section)=>({...makeBlock('imported'),title:`${p.name} · Section ${section+1}`,text:'',label:'',padding:0,
    imported:{template:PARADIS_TEMPLATE,page:p.file,section,edits:{}}}))}))};
}

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validateImportedEdits(value:unknown){
 if(!record(value)||Object.keys(value).length>1200)throw new Error('Invalid imported content edits.');
 for(const [path,edit] of Object.entries(value)){
  if(!/^(?:root|\d+(?:\.\d+){0,40})$/.test(path)||!record(edit)||Object.keys(edit).some(k=>!['text','href','src','alt','style'].includes(k)))throw new Error('Invalid imported element.');
  for(const [key,v] of Object.entries(edit)){
   if(key==='style'){
    if(!record(v))throw new Error('Invalid imported style.');
    for(const [prop,css] of Object.entries(v)){
     const valid=['color','backgroundColor','fontSize','textAlign','width','height','maxWidth','objectFit','borderRadius','paddingTop','paddingBottom'].includes(prop)&&typeof css==='string'&&(css===''||(['color','backgroundColor'].includes(prop)?/^#[\da-f]{6}$/i.test(css):prop==='textAlign'?/^(left|center|right|justify)$/.test(css):prop==='objectFit'?/^(contain|cover|fill|none|scale-down)$/.test(css):['width','height','maxWidth','fontSize','borderRadius','paddingTop','paddingBottom'].includes(prop)&&/^(auto|(?:\d{1,4}(?:\.\d{1,2})?)(?:px|%|rem|em|vh|vw))$/.test(css)));
     if(!valid)throw new Error('Choose a valid imported element style.');
    }
   }else{
    if(typeof v!=='string'||v.length>15000)throw new Error('Imported content must be 15,000 characters or fewer.');
    if(key==='src'&&v&&!/^(https:\/\/|\/media\/[\w-]+$|\/imported-templates\/paradis-photo-booths\/assets\/[\w.-]+$|assets\/[\w.-]+$)/i.test(v))throw new Error('Choose an uploaded image or an HTTPS image URL.');
    if(key==='href'&&v&&!/^(https?:\/\/|mailto:|tel:|#[\w-]*$|\/(?!\/)|[\w-]+(?:\.html)?(?:#[\w-]+)?$|assets\/[\w.-]+$)/i.test(v))throw new Error('Choose a page, telephone, email, or valid website URL.');
   }
  }
 }
}
export function validateImportedSection(value:unknown){
 if(!record(value)||value.template!==PARADIS_TEMPLATE||typeof value.page!=='string'||!paradisPages.some(p=>p.file===value.page&&Number.isInteger(value.section)&&(value.section as number)>=0&&(value.section as number)<p.sections))throw new Error('This imported section is not in the original template.');
 validateImportedEdits(value.edits);
}
