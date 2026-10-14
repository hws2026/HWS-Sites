import ts from 'typescript';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.sites-runtime/calendar-check');await mkdir(root,{recursive:true});
const files=['media-policy','editor-model','site-calendar','site-store','site-colors','page-tree','icon-catalog'];
for(const name of files){let source=await readFile('lib/'+name+'.ts','utf8');for(const file of files)source=source.replaceAll("'./"+file+"'","'./"+file+".mjs'");await writeFile(resolve(root,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {makeBlock,template,cloneBlock}=await import(resolve(root,'editor-model.mjs'));
const {siteEventItems,enableSiteCalendar,reminderEvents,localEventTime,zonedDateTime}=await import(resolve(root,'site-calendar.mjs'));
const {validateWebsite}=await import(resolve(root,'site-store.mjs'));
const site=template(),cards=makeBlock('events'),calendar=makeBlock('calendar'),nested={...makeBlock('group'),children:[cloneBlock(cards),cloneBlock(calendar)]};
site.pages[0].blocks=[cards,nested];site.pages[1].blocks=[calendar];
const event={id:'shared-event',title:'Family evening',description:'Meet the team',location:'Main hall',category:'Community',link:site.pages[1].slug,startsAt:'2030-06-20T22:00:00.000Z',endsAt:'2030-06-21T00:00:00.000Z',featured:true};
site.calendarEvents=[event];validateWebsite(site);
for(const b of [cards,calendar,...nested.children])assert.equal(siteEventItems(site,b)[0].title,'Family evening');
site.calendarEvents[0]={...event,title:'Updated family evening',startsAt:'2030-06-21T22:00:00.000Z',endsAt:'2030-06-22T00:00:00.000Z'};
for(const b of [cards,calendar,...nested.children]){assert.equal(siteEventItems(site,b)[0].title,'Updated family evening');assert.equal(siteEventItems(site,b)[0].startsAt,'2030-06-21T22:00:00.000Z');}
assert.equal(reminderEvents(site).length,1,'Duplicate placements produce one reminder source');
cards.eventCategory='Athletics';assert.equal(siteEventItems(site,cards).length,0);delete cards.eventCategory;
cards.featuredOnly=true;site.calendarEvents[0].featured=false;assert.equal(siteEventItems(site,cards).length,0);delete cards.featuredOnly;
cards.eventLimit=1;site.calendarEvents.push({...event,id:'second',title:'Another event',startsAt:'2030-07-20T22:00:00.000Z',endsAt:undefined});assert.equal(siteEventItems(site,cards).length,1);assert.equal(reminderEvents(site).length,2,'Card display limit does not drop reminders');
const backup=validateWebsite(JSON.parse(JSON.stringify(site)));assert.deepEqual(backup.calendarEvents,JSON.parse(JSON.stringify(site.calendarEvents)));
site.calendarEvents=[];for(const b of [cards,calendar,...nested.children])assert.equal(siteEventItems(site,b).length,0);assert.equal(reminderEvents(site).length,0);
assert.equal(siteEventItems({...site,calendarEvents:[event]},cards,Date.parse('2031-01-01')).length,0,'Past events disappear');
const allDay={...event,allDay:true,startsAt:'2030-06-20T04:00:00.000Z',endsAt:'2030-06-21T03:59:00.000Z'};assert.equal(siteEventItems({...site,calendarEvents:[allDay]},cards,Date.parse('2030-06-21T02:00:00Z')).length,1,'All-day event remains through the website day');
const legacy={...template(),calendarEvents:undefined};const old={...makeBlock('calendar'),items:[{id:'old-event',title:'Legacy event',text:'Existing description',meta:'Community',link:'',image:'',startsAt:event.startsAt}]};const undated=makeBlock('events');legacy.pages[0].blocks=[old,cloneBlock(old),undated];const migrated=enableSiteCalendar(legacy);assert.equal(migrated.calendarEvents.length,1);assert.equal(migrated.pages[0].blocks[2].eventSource,'local');assert.equal(siteEventItems(migrated,migrated.pages[0].blocks[0])[0].title,'Legacy event');assert.equal(legacy.calendarEvents,undefined,'Migration leaves original snapshot unchanged');validateWebsite(migrated);
assert.equal(siteEventItems({...site,calendarEvents:[]},{...old,eventSource:'local'})[0].title,'Legacy event','Explicit local sections stay independent');
assert.equal(siteEventItems(template(),calendar).length,0,'New websites never inherit another website’s events');
for(const [date,zone,expected] of [['2030-07-01T09:00','America/New_York','2030-07-01T13:00:00.000Z'],['2030-01-01T09:00','America/New_York','2030-01-01T14:00:00.000Z'],['2030-01-01T09:00','Asia/Singapore','2030-01-01T01:00:00.000Z']]){assert.equal(localEventTime(date,zone),expected);assert.equal(zonedDateTime(expected,zone),date);}
assert.throws(()=>localEventTime('2026-03-08T02:30','America/New_York'),/daylight/);
for(const patch of [{startsAt:'bad-date'},{endsAt:'2020-01-01T00:00:00.000Z'},{link:'javascript:alert(1)'},{title:''},{featured:'yes'}])assert.throws(()=>validateWebsite({...site,calendarEvents:[{...event,...patch}]}));
assert.throws(()=>validateWebsite({...site,calendarTimeZone:'Invalid/Zone'}));assert.throws(()=>validateWebsite({...site,calendarEvents:[event,event]}));assert.throws(()=>validateWebsite({...site,calendarEvents:Array.from({length:501},(_,i)=>({...event,id:String(i)}))}));
const auth=await readFile('pages/auth.tsx','utf8');assert.ok(!auth.includes('auth.signUp(')&&!auth.includes('Create an account'));assert.ok(auth.includes('resetPasswordForEmail')&&auth.includes('signInWithPassword'));
console.log('PASS shared calendar: edits/deletions sync across pages and nested sections; category/featured/limits; reminder deduplication; backups; isolated sites; legacy migration; DST/timezones; date and link validation; public signup removed.');
