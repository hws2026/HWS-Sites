import {NextRequest,NextResponse} from 'next/server';
import {identity} from '@/lib/suite-store';
import {rejectForeignOrigin} from '@/lib/request-guard';
import {formsInbox} from '@/backend/forms';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const user=identity(req);return user?formsInbox(req,user.id):NextResponse.json({error:'Sign in to open the form inbox.'},{status:401});}
export async function PUT(req:NextRequest){try{rejectForeignOrigin(req);}catch{return NextResponse.json({error:'Requests must come from this website.'},{status:403});}return GET(req);}
