import type {Block,Website} from './editor-model';
export const MAX_FORM_FILE_BYTES=256*1024;
export const MAX_FORM_FILES=3;
export type FormAnswer={fieldId:string;label:string;type:string;value:string|boolean;attachmentId?:string;filename?:string};
export type FormSubmission={id:string;site_id:string;page_name:string;form_name:string;status:'new'|'read'|'archived';created_at:string;answers:FormAnswer[]};
export function publishedForm(site:Website,pageId:string,formId:string){
 const page=site.pages.find(p=>p.id===pageId);if(!page)return null;
 const matches:Block[]=[];
 const walk=(blocks:Block[])=>{for(const block of blocks){if(block.hidden)continue;if(block.type==='form'&&block.id===formId)matches.push(block);walk(block.children??[]);for(const item of block.items??[])walk(item.children??[]);}};
 walk(page.blocks);return matches.length===1&&matches[0].formEnabled!==false?{page,block:matches[0]}:null;
}
export function csvCell(value:unknown){let text=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function submissionsCsv(rows:FormSubmission[]){return [['Received','Form','Page','Status','Field','Response'].map(csvCell).join(','),...rows.flatMap(row=>row.answers.map(answer=>[row.created_at,row.form_name,row.page_name,row.status,answer.label,answer.filename??(typeof answer.value==='boolean'?(answer.value?'Yes':'No'):answer.value)].map(csvCell).join(',')))].join('\r\n');}
