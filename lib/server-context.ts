import {AsyncLocalStorage} from 'node:async_hooks';
import {env} from 'cloudflare:workers';
import type {MediaStorageEnv} from './media-storage';
export type BackendEnv=Cloudflare.Env & MediaStorageEnv & {FRONTEND_URL?:string;GITHUB_CLIENT_ID?:string;GITHUB_CLIENT_SECRET?:string;ADMIN_GITHUB_IDS?:string};
const context=new AsyncLocalStorage<BackendEnv>();
export const backendEnv=():BackendEnv=>context.getStore()??env;
export const withBackendEnv=<T>(value:BackendEnv,run:()=>T)=>context.run(value,run);
