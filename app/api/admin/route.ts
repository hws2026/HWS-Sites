import {backendEnv} from '@/lib/server-context';
import {testMediaStorage,MediaStorageError} from '@/lib/media-storage';
import {rejectForeignOrigin} from '@/lib/request-guard';
import {NextRequest,NextResponse} from 'next/server';
import {database,identity,initialize,logStatement,sitePermission,siteScope,visibleSites} from '@/lib/suite-store';
import {customerLifecycle} from '@/lib/customer-lifecycle';
import {archivedTemplateIds,changeTemplateStatus} from '@/lib/template-catalog-store';
import {createSiteRecord,CreationError} from '@/lib/site-creation-store';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(req:NextRequest){
 const user=identity(req);if(!user)return fail('Sign in to manage your workspace.',401);
 try{const db=database(),scope=await siteScope(user.id);const [workspace,customers,sites,access,activity]=await Promise.all([
 db.prepare('SELECT id,name FROM workspaces WHERE owner=?').bind(user.id).first(),
 db.prepare('SELECT c.id,c.name,c.email,c.phone,c.status,c.notes,c.archived,t.template_id assignedTemplateId FROM customers c LEFT JOIN customer_templates t ON t.customer_id=c.id WHERE c.owner=? ORDER BY c.name').bind(user.id).all(),
 visibleSites(user.id,true),
 db.prepare(`SELECT a.id,a.site_id,a.email,a.role,a.user_id FROM site_access a JOIN client_sites s ON s.id=a.site_id WHERE ${scope.sql}`).bind(...scope.args).all(),
 db.prepare(`SELECT id,description,created_at,site_id FROM activity WHERE owner=? AND (site_id IS NULL OR site_id IN (SELECT s.id FROM client_sites s WHERE ${scope.sql})) ORDER BY created_at DESC LIMIT 40`).bind(user.id,...scope.args).all()
 ]);return NextResponse.json({workspace,customers:customers.results,sites,archivedTemplateIds:await archivedTemplateIds(),access:access.results,activity:activity.results,email:user.email},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return fail('Workspace unavailable. Please try again.',503);}
}
function text(value:unknown,max=200){if(typeof value!=='string'||value.length>max)throw new Error('Check the form fields.');return value.trim();}
export async function POST(req:NextRequest){const user=identity(req);if(!user)return fail('Sign in to manage your workspace.',401);try{rejectForeignOrigin(req);const body=await req.json() as Record<string,unknown>;const action=body.action;if(action==='check-storage'){await testMediaStorage(backendEnv());return NextResponse.json({ok:true,message:'Storage connected. A test image was uploaded, read back, and removed.'});}const db=database();if(action==='initialize'){await initialize(user.id);return NextResponse.json({ok:true});}
 if(['archive-customer','restore-customer','delete-customer'].includes(String(action)))return await customerLifecycle(body,user.id);
 if(action==='customer'){const id=body.id?text(body.id):crypto.randomUUID(),name=text(body.name,120),email=text(body.email).toLowerCase(),phone=text(body.phone??'',80),status=text(body.status??'Active'),notes=text(body.notes??'',5000);if(!name||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['Active','Onboarding','Paused'].includes(status))throw new Error('Enter a customer name and valid email.');if(body.id){const account=await db.prepare('SELECT email FROM customer_accounts WHERE customer_id=? AND owner=?').bind(id,user.id).first<{email:string}>();if(account&&account.email.toLowerCase()!==email)return fail('The customer controls their sign-in identity. This account email cannot be reassigned here.',403);if(status==='Paused'&&await db.prepare('SELECT id FROM client_sites WHERE customer_id=? AND owner=? LIMIT 1').bind(id,user.id).first())return fail('Customer websites cannot be suspended from customer records.',403);const result=await db.prepare('UPDATE customers SET name=?,email=?,phone=?,status=?,notes=? WHERE id=? AND owner=? AND archived=0').bind(name,email,phone,status,notes,id,user.id).run();if(!result.meta.changes)return fail('Customer not found.',404);}else await db.prepare('INSERT INTO customers (id,owner,name,email,phone,status,notes) VALUES (?,?,?,?,?,?,?)').bind(id,user.id,name,email,phone,status,notes).run();await logStatement(user.id,`${body.id?'Updated':'Added'} customer ${name}`).run();return NextResponse.json({ok:true,id});}
 if(action==='archive-template'||action==='restore-template'){await changeTemplateStatus(body.templateId,action==='archive-template',user.id);return NextResponse.json({ok:true});}
 if(action==='site')return NextResponse.json(await createSiteRecord(body,user));
 if(action==='settings'){const name=text(body.name,120);if(!name)throw new Error('Enter a workspace name.');await db.prepare('UPDATE workspaces SET name = ? WHERE owner = ?').bind(name,user.id).run();return NextResponse.json({ok:true});}
 if(['revoke','archive','unpublish','access'].includes(String(action)))return websiteAction(body,user.id);
 return fail('Unknown action.');}catch(e){console.error(e);return fail(e instanceof Error?e.message:'Could not complete the action.',e instanceof MediaStorageError||e instanceof CreationError?e.status:400);}}

export async function websiteAction(body:Record<string,unknown>,userId:string){
 const db=database(),action=body.action;
 const grant=action==='revoke'?await db.prepare('SELECT site_id FROM site_access WHERE id=?').bind(text(body.id)).first<{site_id:string}>():null;
 const siteId=grant?.site_id??text(body.siteId??''),access=await sitePermission(siteId,userId);
 if(!access||access.role!=='admin')return fail('Only this website’s owner can manage it.',403);
 const site=access.row;
 if(action==='revoke'){await db.prepare('DELETE FROM site_access WHERE id=? AND site_id=?').bind(text(body.id),siteId).run();return NextResponse.json({ok:true});}
 if(action==='archive'){await db.batch([db.prepare('UPDATE client_sites SET archived=?,published=NULL,updated_at=? WHERE id=?').bind(site.archived?0:1,new Date().toISOString(),siteId),db.prepare('UPDATE site_publications SET enabled=0 WHERE site_id=?').bind(siteId),logStatement(site.owner,`${site.archived?'Restored':'Archived'} ${site.title}`,siteId)]);return NextResponse.json({ok:true});}
 if(site.archived)return fail('Restore this website first.',409);
 if(action==='unpublish'){await db.batch([db.prepare('UPDATE site_publications SET enabled=0 WHERE site_id=?').bind(siteId),db.prepare('UPDATE client_sites SET published=NULL,updated_at=? WHERE id=?').bind(new Date().toISOString(),siteId),logStatement(site.owner,`Unpublished ${site.title}`,siteId)]);return NextResponse.json({ok:true});}
 if(action==='access'){const email=text(body.email).toLowerCase(),role=text(body.role);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['editor','viewer'].includes(role))return fail('Choose a valid email and role.');await db.prepare('INSERT INTO site_access (id,owner,site_id,email,role) VALUES (?,?,?,?,?) ON CONFLICT(site_id,email) DO UPDATE SET role=excluded.role').bind(crypto.randomUUID(),site.owner,siteId,email,role).run();return NextResponse.json({ok:true});}
 return fail('Unknown website action.');
}
