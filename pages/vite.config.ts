import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
const base=process.env.PAGES_BASE_PATH??'/';
if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw new Error('PAGES_BASE_PATH must be / or /repository-name/.');
export default defineConfig({root:resolve('pages'),base,publicDir:resolve('public'),plugins:[react()],resolve:{alias:{'@':resolve('.')}},define:{__HWS_PAGES__:'true',__HWS_API_URL__:JSON.stringify((process.env.VITE_API_URL??'').replace(/\/$/,'')),__HWS_BASE_PATH__:JSON.stringify(base)},build:{outDir:resolve('pages-dist'),emptyOutDir:true,rolldownOptions:{input:{main:resolve('pages/index.html'),visitor:resolve('pages/visitor.html')}}},server:{host:'127.0.0.1',port:5175}});
