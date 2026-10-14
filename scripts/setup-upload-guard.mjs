import {spawnSync} from 'node:child_process';
import {chmod,mkdir,copyFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {projectRoot,sourceFiles} from './verify-source.mjs';
const root=process.argv[2]?resolve(process.argv[2]):projectRoot;
await sourceFiles(root);
const invoke=args=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
const directory=invoke(['rev-parse','--git-path','hws-upload-hooks']);
if(directory.status!==0)throw new Error('Open this project as a Git repository before installing the upload check.');
const hooks=resolve(root,directory.stdout.trim());
const get=invoke(['config','--local','--get','core.hooksPath']);
if(get.status!==0&&get.status!==1)throw new Error('Could not read this repository’s Git hook configuration.');
const current=get.stdout.trim();
if(current&&resolve(root,current)!==hooks)throw new Error(`Existing Git hooks are configured at ${current}. Keep them; integrate the HWS pre-push check there instead of replacing them.`);
if(!current){const defaults=invoke(['rev-parse','--git-path','hooks']);const existing=await readdir(resolve(root,defaults.stdout.trim())).catch(()=>[]);if(existing.some(name=>!name.endsWith('.sample')))throw new Error('This checkout already has Git hooks. Integrate the HWS pre-push check without replacing existing hooks.');}
// Keep the installed guard inside .git so a later source-folder replacement
// cannot silently remove it. The packaged .githooks file is the install template.
await mkdir(hooks,{recursive:true});await copyFile(resolve(root,'.githooks/pre-push'),resolve(hooks,'pre-push'));await chmod(resolve(hooks,'pre-push'),0o755);
const result=invoke(['config','--local','core.hooksPath',hooks]);if(result.status!==0)throw new Error(result.stderr||'Could not install the upload guard.');
console.log('HWS upload guard installed inside this checkout’s .git folder. Normal pushes work; incomplete or history-replacing pushes to main stop with a useful explanation.');
