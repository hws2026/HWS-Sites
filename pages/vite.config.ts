import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {paradisBehaviors} from '../lib/imported-template-documents';
import {resolve} from 'node:path';
const base=process.env.PAGES_BASE_PATH??'/';
if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw new Error('PAGES_BASE_PATH must be / or /repository-name/.');
export default defineConfig({root:resolve('pages'),base,publicDir:resolve('public'),plugins:[react(),{name:'suite-security-policy',apply:'build',transformIndexHtml(html,ctx){if(!ctx.filename.endsWith('/pages/index.html'))return html;const trusted=createHash('sha256').update(paradisBehaviors).digest('base64');const policy="default-src 'self'; script-src 'self' 'sha256-"+trusted+"'; style-src 'self' https: 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https:; media-src 'self' https: blob:; frame-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self' https:";return html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+policy+'"/>');}}],resolve:{alias:{'@':resolve('.')}},define:{__HWS_PAGES__:'true',__HWS_API_URL__:JSON.stringify((process.env.VITE_API_URL??'').replace(/\/$/,'')),__HWS_BASE_PATH__:JSON.stringify(base)},build:{outDir:resolve('pages-dist'),emptyOutDir:true,rolldownOptions:{input:{main:resolve('pages/index.html'),visitor:resolve('pages/visitor.html')}}},server:{host:'127.0.0.1',port:5175}});
