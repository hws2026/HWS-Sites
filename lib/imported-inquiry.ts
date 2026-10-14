import type {Block,FormField} from './editor-model';

export const inquiryFields:FormField[]=[
 {id:'name',label:'Your name',type:'text',required:true},
 {id:'email',label:'Email',type:'email',required:true},
 {id:'phone',label:'Phone',type:'tel'},
 {id:'date',label:'Event date',type:'date',required:true},
 {id:'event_type',label:'Event type',type:'select',required:true,options:['Wedding','Birthday','Corporate event','Graduation','Other']},
 {id:'booth',label:'Photo booth',type:'select',options:['Photo Booth','360 Photo Booth','Both / undecided']},
 {id:'location',label:'Event location',type:'text',required:true},
 {id:'message',label:'Tell us about your event',type:'textarea'},
];
export function isImportedInquiry(block:Block){
 const source=block.imported;
 return block.type==='imported'&&source?.template==='paradis-photo-booths'&&
  ({'index.html':9,'360-photo-booth.html':8,'check-availability.html':0} as Record<string,number>)[source.page]===source.section;
}
export function inquiryFormBlock(block:Block):Block{return {...block,title:'Check Availability',fields:inquiryFields};}
