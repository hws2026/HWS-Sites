import {referenceTemplates} from './templates';

export const templateChoices=[...referenceTemplates.map(t=>({id:t.id,name:t.name,description:t.structure})),
 {id:'business',name:'Business & services',description:'Put your work and expertise first.'},
 {id:'general',name:'Personal & general',description:'Make a space for your next idea.'}];
export const isTemplateId=(id:unknown):id is string=>typeof id==='string'&&templateChoices.some(t=>t.id===id);
export const archivedTemplateMessage='This template is archived from the library. Your website stays available to edit and publish, and you can reuse its design for another website in this organization.';
