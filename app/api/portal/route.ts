import {websiteAction} from '../admin/route';
import {rejectForeignOrigin} from '@/lib/request-guard';
import {NextRequest,NextResponse} from 'next/server';
import {database,identity,visibleSites,siteScope} from '@/lib/suite-store';
import {archivedTemplateIds} from '@/lib/template-catalog-store';
import {createSiteRecord,CreationError} from '@/lib/site-creation-store';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){const user=identity(req);if(!user)return NextResponse.json({error:'Sign in to open your customer portal.'},{status:401});try{rejectForeignOrigin(req);const raw=await req.text();const body=raw?JSON.parse(raw):{};if(body.action==='site')return NextResponse.json(await createSiteRecord(body,user,true));if(['revoke','archive','unpublish','access'].includes(body.action))return websiteAction(body,user.id);if(body.action&&body.action!=='activate')return NextResponse.json({error:'Unknown portal action.'},{status:400});await database().prepare('UPDATE site_access SET user_id = ? WHERE email = ? AND (user_id IS NULL OR user_id = ?)').bind(user.id,user.email,user.id).run();return NextResponse.json({ok:true});}catch(error){return NextResponse.json({error:error instanceof CreationError?error.message:'Could not complete the portal action.'},{status:error instanceof CreationError?error.status:503});}}
export async function GET(req:NextRequest){const user=identity(req);if(!user)return NextResponse.json({error:'Sign in to open your customer portal.'},{status:401});try{
 const scope=await siteScope(user.id);const sites=await visibleSites(user.id,req.nextUrl.searchParams.get('archived')==='1');
 const organizations=scope.platform?[]:(await database().prepare('SELECT c.id,c.name,t.template_id assignedTemplateId FROM customers c JOIN customer_accounts a ON a.customer_id=c.id AND a.owner=c.owner LEFT JOIN customer_templates t ON t.customer_id=c.id WHERE a.user_id=?').bind(scope.id).all()).results;
 const adminSiteIds=new Set(sites.filter(s=>s.role==='admin').map(s=>s.id));
 const access=(await database().prepare(`SELECT a.id,a.site_id,a.email,a.role,a.user_id FROM site_access a JOIN client_sites s ON s.id=a.site_id WHERE ${scope.sql}`).bind(...scope.args).all<{site_id:string}>()).results.filter(a=>adminSiteIds.has(a.site_id));
 return NextResponse.json({sites,access,organizations,archivedTemplateIds:await archivedTemplateIds(),email:user.email},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not load your assigned websites.'},{status:503});}}
