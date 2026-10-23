'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,LogOut,UserRound} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {apiFetch,signOutHref} from '@/lib/client-runtime';
import './account-profile.css';
type Account={displayName:string;avatar:string;email:string;phone:string;role:string};
async function request<T>(path:string,body?:unknown){const response=await apiFetch(path,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await response.json() as T&{error?:string};if(!response.ok)throw new Error(value.error??'Could not save. Please try again.');return value;}
async function photo(file:File){
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Choose a JPG, PNG, WebP, or GIF photo.');
 if(file.size>50*1024*1024)throw new Error('Choose a photo smaller than 50 MB.');
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();const size=Math.min(img.naturalWidth,img.naturalHeight);if(!size)throw new Error();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(size,512);const context=canvas.getContext('2d');if(!context)throw new Error();context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,canvas.width,canvas.height);
  for(const quality of [.88,.7,.5,.3]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<180000)return data;}
  throw new Error('This image cannot be resized enough. Try a different photo.');
 }catch(e){throw new Error(e instanceof Error&&e.message.includes('resized')?e.message:'This image could not be opened. Try a JPG or PNG photo.');}finally{URL.revokeObjectURL(url);}
}
export function AccountProfile({email='',label='Your account',compact=false}:{email?:string;label?:string;compact?:boolean}){
 const [open,setOpen]=useState(false),[account,setAccount]=useState<Account|null>(null),[name,setName]=useState(''),[avatar,setAvatar]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const input=useRef<HTMLInputElement>(null);
 async function load(){const a=await request<Account>('/api/profile');setAccount(a);setName(a.displayName);setAvatar(a.avatar);return a;}
 useEffect(()=>{let live=true;void request<Account>('/api/profile').then(a=>{if(live){setAccount(a);setName(a.displayName);setAvatar(a.avatar);}}).catch(()=>{});return()=>{live=false;};},[]);
 function toggle(value:boolean){if(busy)return;setOpen(value);setError('');setNotice('');setCurrent('');setPassword('');setConfirm('');if(value)void load().catch(e=>setError(e.message));}
 async function save(){setBusy(true);setError('');setNotice('');try{await request('/api/profile',{displayName:name,avatar});await load();setNotice('Your profile was saved.');}catch(e){setError(e instanceof Error?e.message:'Could not save your profile.');}finally{setBusy(false);}}
 async function changePassword(){setError('');setNotice('');if(password!==confirm){setError('New passwords do not match.');return;}setBusy(true);try{await request('/api/account-password',{currentPassword:current,password});setCurrent('');setPassword('');setConfirm('');setNotice('Your password was changed. Use the new password the next time you sign in.');}catch(e){setError(e instanceof Error?e.message:'Could not change your password.');}finally{setBusy(false);}}
 const initial=(account?.displayName||account?.email||email||'A').slice(0,1).toUpperCase();
 return <><button className={'profile-trigger'+(compact?' compact':'')} aria-label="Open profile and account settings" onClick={()=>toggle(true)}><span className="profile-avatar">{account?.avatar?<img src={account.avatar} alt="Your profile"/>:initial}</span>{!compact&&<><span className="profile-identity"><strong>{account?.displayName||label}</strong><small>{account?.email||email}</small></span><ChevronDown size={14}/></>}</button>
 <Dialog open={open} onOpenChange={toggle}><DialogContent className="account-profile-dialog"><DialogHeader><DialogTitle>Your profile</DialogTitle><DialogDescription>Manage your photo, display name, and password.</DialogDescription></DialogHeader>
 {error&&<p className="profile-error" role="alert">{error}</p>}{notice&&<p className="profile-notice" role="status">{notice}</p>}
 {!account?<p>Loading your account… <button className="button" onClick={()=>void load().catch(e=>setError(e.message))}>Retry</button></p>:<>
 <form className="profile-form" onSubmit={e=>{e.preventDefault();void save();}}><div className="profile-photo-editor"><span className="profile-avatar large">{avatar?<img src={avatar} alt="Profile photo preview"/>:<UserRound size={36}/>}</span><div><button type="button" className="button" disabled={busy} onClick={()=>input.current?.click()}>Change photo</button>{avatar&&<button type="button" className="button" disabled={busy} onClick={()=>setAvatar('')}>Remove photo</button>}<small>Photos are cropped to a square and resized automatically.</small></div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden aria-label="Upload profile photo" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');setNotice('');void photo(file).then(setAvatar).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}/></div>
 <label>Display name<input value={name} maxLength={80} disabled={busy} autoComplete="nickname" onChange={e=>setName(e.target.value)}/></label>
 <label>Email<input type="email" readOnly aria-readonly="true" value={account.email}/></label><label>Phone number<input readOnly aria-readonly="true" value={account.phone||''} placeholder="Not provided"/></label><p className="profile-hint">Email and phone number are managed by your administrator.</p><button className="button primary" disabled={busy}>Save profile</button></form>
 <form className="profile-form profile-password" onSubmit={e=>{e.preventDefault();void changePassword();}}><h3>Change password</h3><label>Current password<input type="password" required autoComplete="current-password" value={current} disabled={busy} onChange={e=>setCurrent(e.target.value)}/></label><label>New password<input type="password" required minLength={12} maxLength={256} autoComplete="new-password" value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm new password<input type="password" required autoComplete="new-password" value={confirm} disabled={busy} onChange={e=>setConfirm(e.target.value)}/></label><small>Use at least 12 characters.</small><button className="button" disabled={busy}>Change password</button></form>
 </>}<a className="profile-signout" href={signOutHref()}><LogOut size={16}/>Sign out</a>
 </DialogContent></Dialog></>;
}
