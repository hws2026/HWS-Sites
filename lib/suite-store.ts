import {backendEnv,requestActor} from './server-context';
import type {NextRequest} from 'next/server';
export function database(){const env=backendEnv();if(!env.DB)throw new Error('The workspace database is unavailable.');return env.DB;}
export function identity(req:NextRequest){const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');return id&&email?{id,email:email.toLowerCase()}:null;}
export type SiteRow={id:string;owner:string;customer_id:string;title:string;slug:string;template_id:string;draft:string;published:string|null;revision:number;archived:number;updated_at:string};
/** Platform tenancy is not website ownership. Never inherit customer access from s.owner. */
export async function siteScope(userId:string,alias='s'){
 if(!/^[a-z]+$/.test(alias))throw new Error('Invalid site alias.');
 const actor=requestActor();const id=actor?.id??userId;
 const configured=(backendEnv() as ReturnType<typeof backendEnv>&{ADMIN_SUPABASE_USER_IDS?:string}).ADMIN_SUPABASE_USER_IDS?.split(',').map(v=>v.trim())??[];
 const platform=actor?actor.role!=='customer':configured.includes(id)||Boolean(await database().prepare('SELECT id FROM team_members WHERE user_id=? AND active=1').bind(id).first());
 const primary=`EXISTS (SELECT 1 FROM customer_accounts ca WHERE ca.customer_id=${alias}.customer_id AND ca.owner=${alias}.owner AND ca.user_id=?)`;
 const sql=`((${alias}.customer_id='' AND ${alias}.owner=?) OR (?=0 AND (${primary} OR EXISTS (SELECT 1 FROM site_access sa WHERE sa.site_id=${alias}.id AND sa.user_id=?))))`;
 return {id,platform,sql,args:[id,platform?1:0,id,id]};
}
export async function sitePermission(id:string,userId:string){
 const scope=await siteScope(userId),db=database();
 const row=await db.prepare(`SELECT s.* FROM client_sites s WHERE s.id=? AND ${scope.sql}`).bind(id,...scope.args).first<SiteRow>();
 if(!row)return null;
 if(!row.customer_id&&row.owner===scope.id)return {row,role:'admin'};
 const primary=await db.prepare('SELECT customer_id FROM customer_accounts WHERE customer_id=? AND owner=? AND user_id=?').bind(row.customer_id,row.owner,scope.id).first();
 if(primary)return {row,role:'admin'};
 if(row.archived)return null;
 const access=await db.prepare('SELECT role FROM site_access WHERE site_id=? AND user_id=?').bind(id,scope.id).first<{role:string}>();
 return access?{row,role:access.role}:null;
}
export async function visibleSites(userId:string,includeArchived=false){
 const scope=await siteScope(userId);
 const role=`CASE WHEN (s.customer_id='' AND s.owner=?) OR EXISTS (SELECT 1 FROM customer_accounts ca WHERE ca.customer_id=s.customer_id AND ca.owner=s.owner AND ca.user_id=?) THEN 'admin' ELSE (SELECT role FROM site_access sa WHERE sa.site_id=s.id AND sa.user_id=?) END`;
 return (await database().prepare(`SELECT s.id,s.customer_id,s.title,s.slug,s.template_id,s.revision,s.archived,s.updated_at,${role} role,CASE WHEN s.published IS NOT NULL AND s.archived=0 AND COALESCE(p.enabled,0)=1 THEN 1 ELSE 0 END is_published,COALESCE(p.enabled,0) enabled FROM client_sites s LEFT JOIN site_publications p ON p.site_id=s.id WHERE ${scope.sql}${includeArchived?'':' AND s.archived=0'} ORDER BY s.updated_at DESC`).bind(scope.id,scope.id,scope.id,...scope.args).all<{id:string;customer_id:string;title:string;slug:string;template_id:string;revision:number;archived:number;updated_at:string;role:string;is_published:number;enabled:number}>()).results;
}
export function logStatement(owner:string,description:string,siteId:string|null=null){return database().prepare('INSERT INTO activity (id,owner,site_id,description,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),owner,siteId,description,new Date().toISOString());}
export async function initialize(owner:string){const db=database();const existing=await db.prepare('SELECT id FROM workspaces WHERE owner = ?').bind(owner).first();if(existing)return;await db.batch([db.prepare('INSERT INTO workspaces (id,owner,name) VALUES (?,?,?)').bind(crypto.randomUUID(),owner,'HWS Workspace'),logStatement(owner,'Workspace created')]);}
