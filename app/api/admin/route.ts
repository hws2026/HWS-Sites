import {rejectForeignOrigin} from '@/lib/request-guard';
import {NextRequest,NextResponse} from 'next/server';
import {database,identity,initialize,logStatement} from '@/lib/suite-store';
import {referenceTemplates} from '@/lib/templates';
import {startFromTemplate,type TemplateStartMode} from '@/lib/template-start';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(req:NextRequest){const user=identity(req);if(!user)return fail('Sign in to manage your workspace.',401);try{const db=database();const [workspace,customers,sites,access,activity]=await Promise.all([db.prepare('SELECT id,name FROM workspaces WHERE owner = ?').bind(user.id).first(),db.prepare('SELECT id,name,email,phone,status,notes FROM customers WHERE owner = ? ORDER BY name').bind(user.id).all(),db.prepare('SELECT id,customer_id,title,slug,template_id,revision,archived,updated_at,CASE WHEN published IS NULL THEN 0 ELSE 1 END AS is_published FROM client_sites WHERE owner = ? ORDER BY updated_at DESC').bind(user.id).all(),db.prepare('SELECT id,site_id,email,role,user_id FROM site_access WHERE owner = ?').bind(user.id).all(),db.prepare('SELECT id,description,created_at,site_id FROM activity WHERE owner = ? ORDER BY created_at DESC LIMIT 40').bind(user.id).all()]);return NextResponse.json({workspace,customers:customers.results,sites:sites.results,access:access.results,activity:activity.results,email:user.email},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return fail('Workspace unavailable. Please try again.',503);}}
function text(value:unknown,max=200){if(typeof value!=='string'||value.length>max)throw new Error('Check the form fields.');return value.trim();}
export async function POST(req:NextRequest){const user=identity(req);if(!user)return fail('Sign in to manage your workspace.',401);try{rejectForeignOrigin(req);const body=await req.json() as Record<string,unknown>;const action=body.action;const db=database();if(action==='initialize'){await initialize(user.id);return NextResponse.json({ok:true});}
 if(action==='customer'){const id=body.id?text(body.id):crypto.randomUUID(),name=text(body.name,120),email=text(body.email).toLowerCase(),phone=text(body.phone??'',80),status=text(body.status??'Active'),notes=text(body.notes??'',5000);if(!name||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['Active','Onboarding','Paused'].includes(status))throw new Error('Enter a customer name and valid email.');if(body.id){const result=await db.prepare('UPDATE customers SET name=?,email=?,phone=?,status=?,notes=? WHERE id=? AND owner=?').bind(name,email,phone,status,notes,id,user.id).run();if(!result.meta.changes)return fail('Customer not found.',404);}else await db.prepare('INSERT INTO customers (id,owner,name,email,phone,status,notes) VALUES (?,?,?,?,?,?,?)').bind(id,user.id,name,email,phone,status,notes).run();await logStatement(user.id,`${body.id?'Updated':'Added'} customer ${name}`).run();return NextResponse.json({ok:true,id});}
 if(action==='site'){
  if(body.assignTo!==undefined&&!['self','customer'].includes(String(body.assignTo)))throw new Error('Choose who this website belongs to.');
  const ownAccount=body.assignTo==='self';
  const customerId=ownAccount?'':text(body.customerId);
  if(!ownAccount){const customer=await db.prepare('SELECT id FROM customers WHERE id = ? AND owner = ?').bind(customerId,user.id).first();if(!customer)return fail('Choose a customer in your workspace.',404);}
  const templateId=text(body.templateId);
  if(!referenceTemplates.some(t=>t.id===templateId)&&!['business','general'].includes(templateId))throw new Error('Choose a valid starting template.');
  const startMode=body.startMode??'full';
  if(startMode!=='scratch'&&startMode!=='full')throw new Error('Choose start from scratch or use the whole template.');
  const draft=startFromTemplate(templateId,startMode as TemplateStartMode);
  const title=text(body.title,120);if(!title)throw new Error('Enter a website name.');draft.name=title;
  const id=crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO client_sites (id,owner,customer_id,title,slug,template_id,draft,revision,archived,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,user.id,customerId,title,draft.slug,templateId,JSON.stringify(draft),1,0,new Date().toISOString()),logStatement(user.id,`Created ${ownAccount?'account ':''}website ${title}`,id)]);
  return NextResponse.json({ok:true,id});
 }
 if(action==='settings'){const name=text(body.name,120);if(!name)throw new Error('Enter a workspace name.');await db.prepare('UPDATE workspaces SET name = ? WHERE owner = ?').bind(name,user.id).run();return NextResponse.json({ok:true});}
 if(action==='revoke'){const result=await db.prepare('DELETE FROM site_access WHERE id = ? AND owner = ?').bind(text(body.id),user.id).run();if(!result.meta.changes)return fail('Access record not found.',404);await logStatement(user.id,'Revoked site access').run();return NextResponse.json({ok:true});}
 const siteId=text(body.siteId);const site=await db.prepare('SELECT id,title,archived FROM client_sites WHERE id = ? AND owner = ?').bind(siteId,user.id).first<{id:string;title:string;archived:number}>();if(!site)return fail('Website not found.',404);
 if(action==='archive'){await db.batch([db.prepare('UPDATE client_sites SET archived = ?, published = NULL, updated_at = ? WHERE id = ? AND owner = ?').bind(site.archived?0:1,new Date().toISOString(),siteId,user.id),logStatement(user.id,`${site.archived?'Restored':'Archived'} ${site.title}`,siteId)]);return NextResponse.json({ok:true});}
 if(action==='unpublish'){await db.batch([db.prepare('UPDATE client_sites SET published = NULL, updated_at = ? WHERE id = ? AND owner = ?').bind(new Date().toISOString(),siteId,user.id),logStatement(user.id,`Unpublished ${site.title}`,siteId)]);return NextResponse.json({ok:true});}
 if(action==='access'){const email=text(body.email).toLowerCase(),role=text(body.role);if(! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['editor','viewer'].includes(role))throw new Error('Enter a valid email and role.');await db.batch([db.prepare('INSERT INTO site_access (id,owner,site_id,email,role) VALUES (?,?,?,?,?) ON CONFLICT(site_id,email) DO UPDATE SET role = excluded.role').bind(crypto.randomUUID(),user.id,siteId,email,role),logStatement(user.id,`Granted ${role} access to ${email}`,siteId)]);return NextResponse.json({ok:true});}
 return fail('Unknown action.');}catch(e){console.error(e);return fail(e instanceof Error?e.message:'Could not complete the action.');}}
