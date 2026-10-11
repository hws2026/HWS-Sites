import {referenceTemplates,referenceTemplate} from './templates';
import type {Website} from './editor-model';
export type Customer={id:string;name:string;email:string;phone:string;status:string;notes:string};
export type ClientSite={id:string;customer_id:string;title:string;slug:string;template_id:string;revision:number;archived:number;updated_at:string;is_published:number;role?:string;draft?:Website};
export type Access={id:string;site_id:string;email:string;role:string;user_id:string|null};
export type Activity={id:string;description:string;created_at:string;site_id:string|null};
export type SuiteData={workspace:{id:string;name:string};customers:Customer[];sites:ClientSite[];access:Access[];activity:Activity[];email:string;demo?:boolean};
export function demoSuite():SuiteData{const now='2026-10-08T18:00:00Z';return{workspace:{id:'demo',name:'HWS Workspace'},customers:referenceTemplates.map((t,i)=>({id:'demo-customer-'+t.id,name:t.name,email:`contact${i+1}@example.com`,phone:'(555) 010-'+String(1000+i),status:'Active',notes:'Sample customer · fictional contact details.'})),sites:referenceTemplates.map(t=>({id:'demo-'+t.id,customer_id:'demo-customer-'+t.id,title:t.name,slug:referenceTemplate(t.id).slug,template_id:t.id,revision:1,archived:0,updated_at:now,is_published:0})),access:[],activity:[],email:'Demo workspace',demo:true};}
