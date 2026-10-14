import type {Website} from './editor-model';
export type Customer={id:string;name:string;email:string;phone:string;status:string;notes:string;archived?:number};
export type ClientSite={id:string;customer_id:string;title:string;slug:string;template_id:string;revision:number;archived:number;updated_at:string;is_published:number;role?:string;draft?:Website};
export type Access={id:string;site_id:string;email:string;role:string;user_id:string|null};
export type Activity={id:string;description:string;created_at:string;site_id:string|null};
export type SuiteData={workspace:{id:string;name:string};customers:Customer[];sites:ClientSite[];access:Access[];activity:Activity[];email:string;archivedTemplateIds:string[]};
export function emptySuite():SuiteData{return{workspace:{id:'',name:'HWS Workspace'},customers:[],sites:[],access:[],activity:[],email:'',archivedTemplateIds:[]};}
