import '@vitejs/plugin-react/preamble';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import Editor from '../app/editor';
import {WebsiteView} from '../app/website-view';
import {paradisTemplate} from '../lib/imported-template';
import {originalDocument,originalFields,originalSection,applyOriginalEdits,makeImportedDocument} from '../lib/imported-document';
import {validateWebsite} from '../lib/site-store';
import {setSessionUser,setVisitorFrontend} from '../lib/client-runtime';
import '../app/globals.css';
import '../app/suite-brand.css';
import '../app/commerce.css';
import '../app/website-fonts.css';
import '../app/website-design.css';
import '../app/website-fidelity.css';
import '../app/finalsite-composition.css';
import '../app/website-modules.css';
const fresh=paradisTemplate();let site=JSON.parse(localStorage.getItem('hws-paradis-test')||'null')??fresh,revision=1;
const publicTest=new URLSearchParams(location.search).get('view')==='public';let inquiryAttempts=0;
if(publicTest)setVisitorFrontend(location.origin,'/test-public');
setSessionUser('local-paradis-test');const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init={})=>{
 const url=new URL(String(input instanceof Request?input.url:input),location.origin);
 if(publicTest&&url.pathname==='/test-public/api/forms'){
  inquiryAttempts++;const data=init.body as FormData;
  const correct=['name','email','date','event_type','location'].every(id=>data.get('field:'+id))&&data.get('pageId')&&data.get('formId')&&data.get('requestId');
  return inquiryAttempts===1?Response.json({error:'Test connection interrupted'},{status:503}):correct?Response.json({ok:true},{status:201}):Response.json({error:'Missing inquiry data'},{status:400});
 }
 if(url.pathname==='/api/site'){
  if(init.method==='PUT'){try{site=validateWebsite(JSON.parse(String(init.body)).site);localStorage.setItem('hws-paradis-test',JSON.stringify(site));revision++;}catch(error){return Response.json({error:(error as Error).message},{status:400});}}
  return Response.json({site,revision,role:'admin',archived:0,templateId:site.templateId,archivedTemplateIds:[],url:''});
 }
 return nativeFetch(input,init);
};
function checkDocuments(){
 let sections=0,fields=0;
 for(const page of fresh.pages){
  const original=originalDocument(page.importedPage),rendered=new DOMParser().parseFromString(makeImportedDocument(fresh,page,new URL('/imported-templates/paradis-photo-booths/',location.href).href,false),'text/html');
  const content=rendered.querySelector('#tve_editor')!,baseline=original.querySelector('#tve_editor')!;
  if(content.textContent!==baseline.textContent?.replace(/^\s+|\s+$/g,'')){
   // Whitespace between section roots is immaterial; every section's markup is checked below.
   if(content.textContent?.replace(/\s/g,'')!==baseline.textContent?.replace(/\s/g,''))throw Error(page.name+': text changed');
  }
  if(content.children.length!==page.blocks.length)throw Error(page.name+': missing sections');
  page.blocks.forEach((block,index)=>{
   const source=originalSection(block.imported!),result=content.children[index].cloneNode(true) as HTMLElement;result.removeAttribute('data-hws-section');
   source.querySelectorAll('*').forEach(el=>{for(const a of Array.from(el.attributes))if(/^on/i.test(a.name))el.removeAttribute(a.name);});
   if(source.outerHTML!==result.outerHTML)throw Error(page.name+': markup changed in section '+index);
   for(const field of originalFields(source)){
    const root=source.cloneNode(true) as HTMLElement,key=field.kind==='text'?'text':field.kind==='image'?'src':'href',edits={[field.path]:{[key]:field.kind==='text'?'QA test':'https://example.com/qa'}};
    applyOriginalEdits(root,source,edits);applyOriginalEdits(root,source,{},edits);
    if(root.outerHTML!==source.outerHTML)throw Error(page.name+': field did not restore: '+field.path);fields++;
   }sections++;
  });
 }
 return `PASS: 8 pages, ${sections} original sections, ${fields} editable fields. Every section preserves its markup; every content edit restores correctly.`;
}
function Review(){
 const [page,setPage]=useState(publicTest?fresh.pages.find(p=>p.importedPage==='check-availability.html')!:fresh.pages[0]),[width,setWidth]=useState(1280),[original,setOriginal]=useState(false),[result,setResult]=useState('');
 return <><div style={{padding:12,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><strong>Local template verification</strong><label>Page <select value={page.id} onChange={e=>setPage(fresh.pages.find(p=>p.id===e.target.value)!)}>{fresh.pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Width <select value={width} onChange={e=>setWidth(Number(e.target.value))}><option value={1280}>Desktop · 1280</option><option value={768}>Tablet · 768</option><option value={390}>Mobile · 390</option></select></label><label><input type="checkbox" checked={original} onChange={e=>setOriginal(e.target.checked)}/>Show untouched source</label><button onClick={()=>{try{setResult(checkDocuments());}catch(e){setResult('FAIL: '+(e as Error).message);}}}>Verify all original content</button><a href="?view=editor">Test draft saving</a><output>{result}</output></div><div style={{width,maxWidth:'100%',margin:'auto'}}>{original?<iframe title="Untouched source" src={'/imported-templates/paradis-photo-booths/'+page.importedPage} style={{width:'100%',height:'100vh',border:0}}/>:<WebsiteView site={fresh} page={page} onPage={id=>setPage(fresh.pages.find(p=>p.id===id)!)} base="/test-public"/>}</div></>;
}
const mount=document.getElementById('root')! as HTMLElement & {qaRoot?:ReturnType<typeof createRoot>};
(mount.qaRoot??=createRoot(mount)).render(new URLSearchParams(location.search).get('view')==='editor'?<><div style={{padding:8,background:'#eeeefe'}}>Local test website · saves only in this browser · no production customer data.</div><Editor siteId="local-paradis-test"/></>:<Review/>);
