import type {Website} from './editor-model';
export type DraftRecovery={site:Website;revision:number;savedAt:string};
const memory=new Map<string,DraftRecovery>();
const key=(user:string,siteId:string)=>'hws-draft-recovery:'+user+':'+siteId;
export function keepDraft(user:string,siteId:string,draft:DraftRecovery){
 if(!user)return;const id=key(user,siteId);memory.set(id,draft);
 try{sessionStorage.setItem(id,JSON.stringify(draft));}catch{/* The current tab retains the draft in memory if storage is full. */}
}
export function recoverDraft(user:string,siteId:string):DraftRecovery|null{
 if(!user)return null;const id=key(user,siteId);if(memory.has(id))return memory.get(id)!;
 try{const text=sessionStorage.getItem(id);if(text){const data=JSON.parse(text);if(data.site&&typeof data.savedAt==='string'&&Number.isInteger(data.revision))return data;}}catch{/* A damaged backup must not block opening the saved draft. */}return null;
}
export function clearDraftRecovery(user:string,siteId:string){const id=key(user,siteId);memory.delete(id);try{sessionStorage.removeItem(id);}catch{/* Storage may be unavailable. */}}
