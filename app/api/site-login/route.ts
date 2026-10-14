import {NextRequest,NextResponse} from 'next/server';
import {database,identity,sitePermission} from '@/lib/suite-store';
import {rejectForeignOrigin} from '@/lib/request-guard';

export const dynamic='force-dynamic';
const invalid=()=>NextResponse.json({site:null,error:'Invalid account for this website.'},{status:403});

// Public branding is taken only from the published snapshot, never the draft.
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id')??'';
 const row=await database().prepare('SELECT published FROM client_sites WHERE id = ? AND archived = 0 AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id=client_sites.customer_id AND c.owner=client_sites.owner AND c.archived!=0)').bind(id).first<{published:string|null}>();
 if(!row?.published)return NextResponse.json({site:null},{status:404});
 const site=JSON.parse(row.published) as {name:string;accent:string;slug:string};
 return NextResponse.json({site:{id,name:site.name,accent:site.accent,slug:site.slug}});
}

export async function POST(req:NextRequest){
 const user=identity(req);if(!user)return NextResponse.json({site:null,error:'Sign in to continue.'},{status:401});
 rejectForeignOrigin(req);
 const body=await req.json() as {id?:unknown};
 if(typeof body.id!=='string'||!body.id||body.id.length>100)return invalid();
 // Activate only this site's invitation using the server-verified email and user ID.
 await database().prepare('UPDATE site_access SET user_id = ? WHERE site_id = ? AND email = ? AND (user_id IS NULL OR user_id = ?)').bind(user.id,body.id,user.email,user.id).run();
 const access=await sitePermission(body.id,user.id);
 if(!access||access.row.archived||!['admin','editor'].includes(access.role))return invalid();
 return NextResponse.json({site:{id:access.row.id,name:access.row.title},role:access.role});
}
