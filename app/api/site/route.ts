import {rejectForeignOrigin} from '@/lib/request-guard';
import {NextRequest,NextResponse} from 'next/server';
import {database,identity,sitePermission,logStatement} from '@/lib/suite-store';
import {publicationUrl} from '@/lib/publication';
import {validateWebsite} from '@/lib/site-store';
export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function GET(req:NextRequest){const user=identity(req);if(!user)return fail('Sign in to load your saved website.',401);try{const access=await sitePermission(req.nextUrl.searchParams.get('id')??'',user.id);if(!access)return fail('Website not found or access has not been assigned.',404);const publication=await database().prepare('SELECT enabled FROM site_publications WHERE site_id=?').bind(access.row.id).first<{enabled:number}>();const url=access.row.published&&publication?.enabled&&!access.row.archived?await publicationUrl(access.row.id,new URL(req.url).origin):null;return NextResponse.json({site:JSON.parse(access.row.draft),revision:access.row.revision,published:access.row.published?JSON.parse(access.row.published):null,role:access.role,archived:access.row.archived,url},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return fail('Your saved website could not be loaded. Try again.',503);}}
export async function PUT(req:NextRequest){
 const user=identity(req);if(!user)return fail('Your sign-in session expired. Sign in again to save this draft.',401);
 try{rejectForeignOrigin(req);}catch{return fail('This save request came from an unapproved website origin. Check the backend frontend-domain setting.',403);}
 let body:{id:string;site:unknown;revision:number;publish:boolean};
 try{body=await req.json();}catch{return fail('The save request was not valid JSON. Download a backup and retry.',400);}
 if(!body||typeof body.id!=='string'||!body.id)return fail('The save request is missing the website ID.',400);
 let site;try{site=validateWebsite(body.site);}catch(error){return fail(error instanceof Error?error.message:'Invalid website content.',400);}
 const revision=Number(body.revision);if(!Number.isInteger(revision)||revision<1)return fail('The saved version number is missing. Back up this draft and reload the website.',400);
 const draft=JSON.stringify(site),size=new TextEncoder().encode(draft).byteLength;
 if(size>900000)return fail(`This draft is ${Math.ceil(size/1000)} KB; the limit is 900 KB. Remove unused pages or saved library sections before saving.`,413);
 try{
  const access=await sitePermission(body.id,user.id);if(!access||access.role==='viewer')return fail('Your account does not have permission to edit this website.',403);
  if(access.row.archived)return fail('This website is archived. Restore it from the admin panel before saving.',400);
  const publish=body.publish===true;if(publish&&access.role!=='admin')return fail('Only this website’s administrator can publish. You can still save a draft.',403);
  const update=database().prepare('UPDATE client_sites SET title = ?,slug = ?,draft = ?,published = CASE WHEN ? = 1 THEN ? ELSE published END, revision = revision + 1,updated_at = ? WHERE id = ? AND revision = ? AND archived = 0 AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id=client_sites.customer_id AND c.owner=client_sites.owner AND c.archived!=0)').bind(site.name,site.slug,draft,publish?1:0,draft,new Date().toISOString(),body.id,revision);
  const statements=[update];
  if(publish)statements.push(database().prepare('INSERT INTO site_publications (site_id,owner,enabled) SELECT id,owner,1 FROM client_sites WHERE id=? AND changes()=1 ON CONFLICT(site_id) DO UPDATE SET enabled=1').bind(body.id));
  const [result]=await database().batch(statements);
  if(result.meta.changes!==1)return fail('This website changed in another tab. Back up your edits and load the latest draft before saving.',409);
  if(publish){try{await logStatement(access.row.owner,`Published ${site.name}`,body.id).run();}catch(error){console.error('Publication activity log failed',error);}}
  return NextResponse.json({revision:revision+1,url:publish?await publicationUrl(body.id,new URL(req.url).origin):null});
 }catch(error){
  const reason=error instanceof Error?error.message:'';console.error('Website save failed',reason);
  return fail(/no such (table|column)/i.test(reason)?'The backend database schema is out of date. Apply the included database migrations and retry.':/limit|quota|too (big|large)/i.test(reason)?'The backend database reached a storage or request limit. Check its Cloudflare usage, then retry.':'The backend database could not complete this save. Check the backend deployment and database connection, then retry. Your draft is still in this tab.',503);
 }
}
