export const IDLE_TIMEOUT_MS=30*60*1000;
export const IDLE_WARNING_MS=2*60*1000;
export const IDLE_STORAGE_KEY='hws-suite-idle-v1';
type IdleRecord={session:string;user:string;lastActivity:number;expired:boolean};
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export function createIdleSession({storage,now=Date.now,timeout=IDLE_TIMEOUT_MS}:{storage:()=>StorageLike|undefined;now?:()=>number;timeout?:number}){
 let memory:IdleRecord|null=null;
 const read=()=>{try{const raw=storage()?.getItem(IDLE_STORAGE_KEY);if(raw){const record=JSON.parse(raw);if(typeof record.session==='string'&&typeof record.user==='string'&&Number.isFinite(record.lastActivity)&&typeof record.expired==='boolean')memory=record;}}catch{/* Private browser storage may be unavailable. */}return memory;};
 const write=(record:IdleRecord)=>{memory=record;try{storage()?.setItem(IDLE_STORAGE_KEY,JSON.stringify(record));}catch{/* Keep enforcing the timer in this tab. */}return record;};
 const remaining=()=>{const record=read();return !record||record.expired?0:Math.max(0,timeout-Math.max(0,now()-record.lastActivity));};
 const start=(session:string,user:string)=>write({session,user,lastActivity:now(),expired:false});
 const accept=(session:string,user:string)=>{const record=read();if(!record||record.session!==session)start(session,user);return remaining()>0;};
 const touch=()=>{const record=read();if(!record||remaining()<=0)return false;write({...record,lastActivity:now()});return true;};
 const expire=()=>{const record=read();if(record)write({...record,expired:true});};
 return {read,start,accept,touch,remaining,expire};
}
export const idleSession=createIdleSession({storage:()=>typeof window==='undefined'?undefined:window.localStorage});
export function sessionIdentity(accessToken:string,userId:string){
 try{const payload=JSON.parse(atob(accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(typeof payload.session_id==='string')return payload.session_id;}catch{/* Only a client-side timer identity, never an authorization check. */}
 return userId;
}
