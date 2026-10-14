import {database,logStatement} from './suite-store';
import {isTemplateId} from './template-catalog';

export async function archivedTemplateIds(){
 const rows=await database().prepare('SELECT template_id FROM template_catalog WHERE archived=1').all<{template_id:string}>();
 return rows.results.map(row=>row.template_id);
}
export async function changeTemplateStatus(id:unknown,archived:boolean,owner:string){
 if(!isTemplateId(id))throw new Error('Choose a valid library template.');
 await database().batch([
  database().prepare('INSERT INTO template_catalog (template_id,archived,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(template_id) DO UPDATE SET archived=excluded.archived,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(id,archived?1:0,owner,new Date().toISOString()),
  logStatement(owner,`${archived?'Archived':'Restored'} library template ${id}`),
 ]);
}
