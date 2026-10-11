import {getBlockItems,uid,visibleBlocks,type Block,type BlockItem,type CalendarEvent,type Website} from './editor-model';

export const MAX_CALENDAR_EVENTS=500;
export const calendarZone=(site:Website)=>site.calendarTimeZone??'America/New_York';
export const usesSiteCalendar=(site:Website,block:Block)=>['events','calendar'].includes(block.type)&&site.calendarEvents!==undefined&&block.eventSource!=='local';
export function validTimeZone(zone:string){try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format();return true;}catch{return false;}}
export function zonedDateTime(iso:string,zone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
 const p=(name:string)=>parts.find(part=>part.type===name)?.value??'';
 return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
}
// Keep editor input and public calendar dates in the website's timezone, including DST.
export function localEventTime(value:string,zone:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||!validTimeZone(zone))throw new Error('Choose a valid event date and timezone.');
 const target=Date.parse(value+'Z');if(!Number.isFinite(target))throw new Error('Choose a valid event date.');
 let guess=target;
 for(let n=0;n<4;n++){const shown=Date.parse(zonedDateTime(new Date(guess).toISOString(),zone)+'Z');const adjustment=target-shown;if(!adjustment)break;guess+=adjustment;}
 const result=new Date(guess).toISOString();
 if(zonedDateTime(result,zone)!==value)throw new Error('That local time does not exist because of daylight saving time. Choose another time.');
 return result;
}
export function formatEventDate(event:CalendarEvent,zone:string){
 const options:Intl.DateTimeFormatOptions=event.allDay?{dateStyle:'full'}:{dateStyle:'medium',timeStyle:'short'};
 const format=(date:string)=>new Date(date).toLocaleString('en-US',{...options,timeZone:zone});
 return format(event.startsAt)+(event.endsAt?' – '+format(event.endsAt):'')+(event.allDay?' · All day':'')+' · '+zone;
}
export function siteEventItems(site:Website,block:Block,now=Date.now()):BlockItem[]{
 if(!usesSiteCalendar(site,block))return getBlockItems(block);
 const zone=calendarZone(site);
 const events=(site.calendarEvents??[]).filter(event=>(!block.eventCategory||event.category===block.eventCategory)&&(!block.featuredOnly||event.featured)&&
  (block.type!=='events'||block.upcomingOnly===false||(event.allDay?zonedDateTime(event.endsAt??event.startsAt,zone).slice(0,10)>=zonedDateTime(new Date(now).toISOString(),zone).slice(0,10):Date.parse(event.endsAt??event.startsAt)>=now)))
  .sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
 return (block.type==='events'?events.slice(0,block.eventLimit??6):events).map(event=>({id:event.id,title:event.title,image:'',link:event.link,startsAt:event.startsAt,endsAt:event.endsAt,allDay:event.allDay,
  meta:block.type==='events'?new Date(event.startsAt).toLocaleDateString('en-US',{timeZone:zone,month:'short',day:'numeric'})+' | '+new Date(event.startsAt).toLocaleDateString('en-US',{timeZone:zone,weekday:'long'}):event.category,
  text:[block.type==='events'?(event.allDay?'All day':new Date(event.startsAt).toLocaleTimeString('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',timeZoneName:'short'})):'',event.location,event.description].filter(Boolean).join(' · ')}));
}
export function enableSiteCalendar(site:Website):Website{
 if(site.calendarEvents!==undefined)return site;
 const seen=new Set<string>(),events:CalendarEvent[]=[];
 const visit=(blocks:Block[]):Block[]=>blocks.map(block=>{
  const dated=['events','calendar'].includes(block.type)?getBlockItems(block).filter(item=>item.startsAt):[];
  for(const item of dated){const key=item.title.toLowerCase()+'|'+item.startsAt;if(seen.has(key))continue;seen.add(key);events.push({id:uid(),title:item.title,description:item.text,location:'',category:block.type==='calendar'?item.meta:'Community',link:item.link,startsAt:item.startsAt!});}
  return {...block,...(dated.length?{eventSource:'site' as const}:{}),children:block.children?.length?visit(block.children):block.children,items:block.items?.map(item=>({...item,children:item.children?.length?visit(item.children):item.children}))};
 });
 const pages=site.pages.map(page=>({...page,blocks:visit(page.blocks)}));
 if(events.length>MAX_CALENDAR_EVENTS)throw new Error('There are more than 500 dated events. Reduce the number before connecting your website calendar.');
 // Preserve undated legacy cards; they can be connected explicitly after their dates are entered.
 const keepLegacy=(blocks:Block[]):Block[]=>blocks.map(block=>({...block,...(['events','calendar'].includes(block.type)&&block.eventSource!=='site'?{eventSource:'local' as const}:{}),children:block.children?keepLegacy(block.children):undefined,items:block.items?.map(item=>({...item,children:item.children?keepLegacy(item.children):undefined}))}));
 return {...site,calendarTimeZone:calendarZone(site),calendarEvents:events,pages:pages.map(page=>({...page,blocks:keepLegacy(page.blocks)}))};
}
export function reminderEvents(site:Website):CalendarEvent[]{
 const events=new Map<string,CalendarEvent>();
 for(const page of site.pages)for(const block of visibleBlocks(page.blocks)){
  if(!['events','calendar'].includes(block.type))continue;
  // Reminder eligibility follows connected categories, without the visual card count or upcoming limit.
  if(usesSiteCalendar(site,block))for(const event of site.calendarEvents??[]){if((!block.eventCategory||event.category===block.eventCategory)&&(!block.featuredOnly||event.featured))events.set(event.id,event);}
  else for(const item of getBlockItems(block))if(item.startsAt)events.set(item.id,{id:item.id,title:item.title,description:item.text,location:'',category:item.meta,link:item.link,startsAt:item.startsAt});
 }
 return [...events.values()];
}
