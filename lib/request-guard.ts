import {backendEnv} from './server-context';
import type {NextRequest} from 'next/server';
export function rejectForeignOrigin(req:NextRequest){const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin&&origin!==new URL(backendEnv().FRONTEND_URL??req.nextUrl.origin).origin)throw new Error('Requests must come from this website.');}
