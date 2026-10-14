'use client';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function IdleWarning({seconds,onStay,onLogout}:{seconds:number;onStay:()=>void;onLogout:()=>void}){
 return <Dialog open><DialogContent className="idle-warning" showCloseButton={false} onEscapeKeyDown={e=>e.preventDefault()} onPointerDownOutside={e=>e.preventDefault()}><DialogHeader><DialogTitle>Are you still here?</DialogTitle><DialogDescription>You’ll be signed out after 30 minutes of inactivity. Any unsaved website draft will be kept in this tab for recovery after you sign in.</DialogDescription></DialogHeader><p role="timer">Signing out in {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p><div className="idle-warning-actions"><button className="button" onClick={onLogout}>Sign out now</button><button className="button primary" onClick={onStay}>Stay signed in</button></div></DialogContent></Dialog>;
}
