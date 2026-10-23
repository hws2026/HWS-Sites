import {database} from '../lib/suite-store';
import {json,now,seal,unseal,type Principal} from './security';
import type {Env} from './worker';
type Profile={displayName:string;avatar:string};
const MAX_AVATAR=180000;
function validAvatar(value:unknown):value is string{
 if(value==='')return true;
 if(typeof value!=='string'||value.length>MAX_AVATAR)return false;
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)return false;
 try{const bytes=atob(match[2]);return match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';}catch{return false;}
}
export async function profile(request:Request,env:Env,p:Principal,phone=''){
 const db=database();
 if(request.method==='GET'){
  const stored=await db.prepare('SELECT payload FROM account_profiles WHERE user_id=?').bind(p.id).first<{payload:string}>();
  const details=stored?await unseal<Profile>(env,stored.payload,'profile:'+p.id):{displayName:'',avatar:''};
  const customer=await db.prepare('SELECT phone FROM customers WHERE owner=? AND lower(email)=lower(?) AND archived=0 ORDER BY id LIMIT 1').bind(p.owner,p.email).first<{phone:string}>();
  return json({...details,email:p.email,phone:phone||customer?.phone||'',role:p.role});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const raw=await request.text();if(raw.length>MAX_AVATAR+2000)return json({error:'The profile photo is too large. Choose another image.'},413);
 let b:Record<string,unknown>;try{b=JSON.parse(raw);}catch{return json({error:'Invalid profile.'},400);}
 if(!b||Array.isArray(b)||Object.keys(b).some(k=>!['displayName','avatar'].includes(k)))return json({error:'Only your display name and photo can be edited. Email and phone are managed by your administrator.'},400);
 if(typeof b.displayName!=='string'||b.displayName.trim().length>80||!validAvatar(b.avatar))return json({error:'Use a display name up to 80 characters and a JPG, PNG, or WebP photo.'},400);
 const payload=await seal(env,{displayName:b.displayName.trim(),avatar:b.avatar},'profile:'+p.id);
 await db.prepare('INSERT INTO account_profiles (user_id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(p.id,payload,now()).run();
 return json({ok:true});
}
