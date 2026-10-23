import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function sourceFiles(root=projectRoot){
 let raw;try{raw=await readFile(resolve(root,'SOURCE-FILES.txt'),'utf8');}catch{throw new Error('SOURCE-FILES.txt is missing. Restore the complete project, not an update-only ZIP.');}
 const files=raw.split(/\r?\n/).filter(s=>s&&!s.startsWith('#'));
 if(files.length<100||new Set(files).size!==files.length)throw new Error('The source manifest is incomplete or contains duplicate entries. Restore SOURCE-FILES.txt from the complete project ZIP.');
 for(const name of files)if(name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>['.','..','.git','node_modules','.env','.local-secrets'].includes(p))||name.split('/').some(p=>p.startsWith('.env')||p.startsWith('.dev.vars'))||!/^[-a-zA-Z0-9_./\[\] ]+$/.test(name))throw new Error('Unsafe source entry: '+name);
 const missing=[];for(const name of files){try{if(!(await stat(resolve(root,name))).isFile())missing.push(name);}catch{missing.push(name);}}
 if(missing.length)throw new Error(`Incomplete source upload: ${missing.length} required files are missing.\n${missing.map(p=>'  - '+p).join('\n')}\nUse the COMPLETE project ZIP and merge its contents into the repository root. Keep .git. Do not replace the project with a partial update or force-push an older checkout.`);
 return files;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const files=await sourceFiles(process.argv[2]?resolve(process.argv[2]):projectRoot);console.log(`Source upload complete: ${files.length} required files found.`);}catch(e){console.error(e.message);process.exitCode=1;}
}
