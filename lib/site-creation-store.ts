import {database,sitePermission,logStatement,type SiteRow} from './suite-store';
import {blankWebsite,startFromTemplate,startFromWebsite} from './template-start';
import {isTemplateId} from './template-catalog';
import {archivedTemplateIds} from './template-catalog-store';
import {slugify,type Website} from './editor-model';
import {validateWebsite} from './site-store';

export class CreationError extends Error{constructor(message:string,public status=400){super(message);}}
const field=(value:unknown,max=120)=>typeof value==='string'&&value.length<=max?value.trim():'';

/** A customer can create within an assigned organization, never choose another owner. */
export async function createSiteRecord(body:Record<string,unknown>,user:{id:string;email:string},portal=false){
 const db=database(),title=field(body.title);
 if(!title)throw new CreationError('Enter a website name (up to 120 characters).');
 const source=body.source??'template';
 if(!['blank','template','existing'].includes(String(source)))throw new CreationError('Choose a blank site, a template, or an existing website.');
 let owner=user.id,customerId='',sourceRow:SiteRow|undefined;
 if(portal){
  const context=await sitePermission(field(body.contextSiteId),user.id);
  if(!context||context.row.archived||context.role==='viewer'||(!context.row.customer_id&&context.row.owner!==user.id))throw new CreationError('Choose an active organization website you can edit.',403);
  owner=context.row.owner;customerId=context.row.customer_id;
 }else{
  if(body.assignTo!==undefined&&!['self','customer'].includes(String(body.assignTo)))throw new CreationError('Choose who this website belongs to.');
  customerId=body.assignTo==='self'?'':field(body.customerId);
  if(body.assignTo!=='self'&&!customerId)throw new CreationError('Choose a customer in your workspace.',404);
 }
 if(customerId&&!await db.prepare('SELECT id FROM customers WHERE id=? AND owner=? AND archived=0').bind(customerId,owner).first())throw new CreationError('Choose an active customer in your workspace.',404);
 let draft:Website,templateId:string;
 if(source==='existing'){
  const access=await sitePermission(field(body.sourceSiteId),user.id);
  if(!access||access.role==='viewer'||access.row.archived||access.row.owner!==owner||access.row.customer_id!==customerId)throw new CreationError('Choose an editable source website in the same organization.',403);
  if(body.startMode!=='outline'&&body.startMode!=='design'&&body.startMode!=='full')throw new CreationError('Choose the design only, site outline, or whole website.');
  sourceRow=access.row;
  const saved=validateWebsite(JSON.parse(sourceRow.draft));
  templateId=saved.templateId??sourceRow.template_id;
  draft=startFromWebsite(saved,body.startMode);
 }else if(source==='blank'){
  draft=blankWebsite();templateId='blank';
 }else{
  if(!isTemplateId(body.templateId))throw new CreationError('Choose a valid starting template.');
  templateId=body.templateId;
  if((await archivedTemplateIds()).includes(templateId))throw new CreationError('This template is archived from the library. Choose another template or reuse one of your existing websites.',409);
  const mode=body.startMode??'full';
  if(mode!=='scratch'&&mode!=='full')throw new CreationError('Choose start from scratch or use the whole template.');
  draft=startFromTemplate(templateId,mode);
 }
 const id=crypto.randomUUID();draft.name=title;draft.slug=slugify(title)||'my-website';draft.templateId=templateId;
 const statements=[];
 if(sourceRow){
  // Reuse stored bytes only within this customer, with new site-scoped media records.
  // Customer deletion removes the whole organization; deleting one draft cannot revoke its sibling's access.
  const references=new Map<string,string>();
  const collect=(value:unknown):void=>{if(typeof value==='string'){for(const match of value.matchAll(/\/media\/([a-zA-Z0-9-]+)/g))references.set(match[1],'');}else if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')Object.values(value).forEach(collect);};
  collect(draft);
  for(const mediaId of references.keys()){
   const media=await db.prepare('SELECT key,filename,content_type FROM media WHERE id=? AND site_id=? AND owner=?').bind(mediaId,sourceRow.id,owner).first<{key:string;filename:string;content_type:string}>();
   if(!media)throw new CreationError('A source image or file is missing or belongs to another website. Replace that file in the source website before copying.',409);
   const newId=crypto.randomUUID();references.set(mediaId,newId);
   statements.push(db.prepare('INSERT INTO media (id,owner,site_id,filename,key,content_type) VALUES (?,?,?,?,?,?)').bind(newId,owner,id,media.filename,media.key,media.content_type));
  }
  const rewrite=(value:unknown):unknown=>typeof value==='string'?value.replace(/\/media\/([a-zA-Z0-9-]+)/g,(match,oldId)=>references.has(oldId)?'/media/'+references.get(oldId):match):Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rewrite(item)])):value;
  draft=rewrite(draft) as Website;
 }
 validateWebsite(draft);const serialized=JSON.stringify(draft);
 if(new TextEncoder().encode(serialized).byteLength>900000)throw new CreationError('This starting website exceeds the 900 KB draft limit. Choose its outline or reduce its content.',413);
 statements.unshift(db.prepare('INSERT INTO client_sites (id,owner,customer_id,title,slug,template_id,draft,revision,archived,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,owner,customerId,title,draft.slug,templateId,serialized,1,0,new Date().toISOString()));
 if(customerId&&!portal){const contact=await db.prepare('SELECT email FROM customers WHERE id=? AND owner=?').bind(customerId,owner).first<{email:string}>();if(contact)statements.push(db.prepare("INSERT INTO site_access (id,owner,site_id,email,role) VALUES (?,?,?,?,'editor')").bind(crypto.randomUUID(),owner,id,contact.email.toLowerCase()));}
 if(portal&&owner!==user.id)statements.push(db.prepare('INSERT INTO site_access (id,owner,site_id,email,user_id,role) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,id,user.email,user.id,'editor'));
 statements.push(logStatement(owner,`Created website ${title}${sourceRow?' from '+sourceRow.title:''}`,id));
 await db.batch(statements);
 return {ok:true,id,creationVersion:2};
}
