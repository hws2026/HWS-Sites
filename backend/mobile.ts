import {database,sitePermission,logStatement} from '../lib/suite-store';
import {validateWebsite} from '../lib/site-store';
import {enableSiteCalendar} from '../lib/site-calendar';
import type {Website} from '../lib/editor-model';

const json=(data:unknown,status=200)=>Response.json(data,{status});
type User={id:string;email:string;isAdmin:boolean};

export async function mobileWorkspace(request:Request,user:User){
 if(request.method==='POST'){
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(body?.action!=='activate')return json({error:'Unknown mobile workspace action.'},400);
  await database().prepare('UPDATE site_access SET user_id=? WHERE email=? AND (user_id IS NULL OR user_id=?)').bind(user.id,user.email,user.id).run();
  return json({ok:true});
 }
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 const sites=await database().prepare("SELECT s.id,s.title,CASE WHEN s.owner=? THEN 'admin' ELSE a.role END AS role FROM client_sites s LEFT JOIN site_access a ON a.site_id=s.id AND a.user_id=? WHERE (s.owner=? OR a.user_id=?) AND s.archived=0 AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id=s.customer_id AND c.owner=s.owner AND c.archived!=0) GROUP BY s.id ORDER BY s.title").bind(user.id,user.id,user.id,user.id).all();
 return json({email:user.email,role:user.isAdmin?'admin':'customer',sites:sites.results});
}

export async function mobileEvents(request:Request,user:User){
 const url=new URL(request.url),id=url.searchParams.get('siteId')??'';
 const access=await sitePermission(id,user.id);
 if(!access||access.row.archived||access.role==='viewer')return json({error:'You do not have access to this website’s events.'},403);
 const db=database(),row=access.row;
 const publication=await db.prepare('SELECT enabled FROM site_publications WHERE site_id=?').bind(id).first<{enabled:number}>();
 if(request.method==='GET')return json({site:enableSiteCalendar(JSON.parse(row.draft)),revision:row.revision,role:access.role,published:Boolean(row.published&&publication?.enabled)});
 if(request.method!=='PUT')return json({error:'Method not allowed.'},405);
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body||Object.keys(body).some(key=>!['revision','calendarEvents','calendarTimeZone','publish'].includes(key))||!Number.isInteger(body.revision)||!Array.isArray(body.calendarEvents)||typeof body.calendarTimeZone!=='string'||typeof body.publish!=='boolean')return json({error:'Send only the calendar events, timezone, saved revision, and publication choice.'},400);
 if(body.revision!==row.revision)return json({error:'This website changed in another tab. Reload events before saving.'},409);
 if(body.publish&&access.role!=='admin')return json({error:'Only this website’s administrator can publish events. You can save a draft.'},403);
 if(body.publish&&(!row.published||!publication?.enabled))return json({error:'Publish this website from a computer first. Your events can still be saved as a draft.'},409);
 const patch={calendarEvents:body.calendarEvents,calendarTimeZone:body.calendarTimeZone};
 let draft:Website,published:Website|null=null;
 try{
  draft=validateWebsite({...enableSiteCalendar(JSON.parse(row.draft)),...patch});
  if(body.publish)published=validateWebsite({...enableSiteCalendar(JSON.parse(row.published!)),...patch});
 }catch(error){return json({error:error instanceof Error?error.message:'Check the event details.'},400);}
 const draftJson=JSON.stringify(draft),publishedJson=published?JSON.stringify(published):null;
 if(new TextEncoder().encode(draftJson).byteLength>900000||publishedJson&&new TextEncoder().encode(publishedJson).byteLength>900000)return json({error:'This website exceeds its 900 KB content limit. Remove unused content on a computer before saving.'},413);
 // Calendar publishing changes only calendar data and legacy calendar wiring.
 // It never publishes unrelated draft pages, design edits, or unpublished sites.
 const result=await db.prepare('UPDATE client_sites SET draft=?,published=CASE WHEN ?=1 THEN ? ELSE published END,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND archived=0 AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id=client_sites.customer_id AND c.owner=client_sites.owner AND c.archived!=0) AND (?=0 OR EXISTS (SELECT 1 FROM site_publications p WHERE p.site_id=client_sites.id AND p.enabled=1))').bind(draftJson,body.publish?1:0,publishedJson,new Date().toISOString(),id,body.revision,body.publish?1:0).run();
 if(result.meta.changes!==1)return json({error:'The website changed or became unavailable. Reload events before saving.'},409);
 try{await logStatement(row.owner,(body.publish?'Published calendar for ':'Saved calendar for ')+row.title,id).run();}catch{/* Saving remains successful if activity logging fails. */}
 return json({revision:row.revision+1,site:draft,published:Boolean(row.published&&publication?.enabled)});
}
