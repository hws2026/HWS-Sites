import {mkdtemp,mkdir,writeFile,readFile,rm,chmod,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {sourceFiles,projectRoot} from './verify-source.mjs';
const staging=await mkdtemp(join(tmpdir(),'hws-upload-check-'));
let checks=0;const pass=s=>{checks++;console.log('PASS '+s);};
function run(cmd,args,cwd,ok=true){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});if(ok)assert.equal(r.status,0,r.stderr||r.stdout);return r;}
const git=(args,cwd,ok=true)=>run('git',args,cwd,ok);
try{
 const files=await sourceFiles();pass('complete working source has every required file');
 const repo=join(staging,'repo'),remote=join(staging,'remote.git');await mkdir(repo);
 for(const file of files){await mkdir(dirname(join(repo,file)),{recursive:true});await writeFile(join(repo,file),'fixture\n');}
 await cp(join(projectRoot,'SOURCE-FILES.txt'),join(repo,'SOURCE-FILES.txt'));await cp(join(projectRoot,'.githooks/pre-push'),join(repo,'.githooks/pre-push'));await chmod(join(repo,'.githooks/pre-push'),0o755);
 await sourceFiles(repo);await rm(join(repo,'app/editor.tsx'));await assert.rejects(sourceFiles(repo),/Incomplete source upload: 1 required files are missing[\s\S]*app\/editor.tsx/);pass('partial folder upload reports the exact missing file');await writeFile(join(repo,'app/editor.tsx'),'fixture\n');
 git(['init','--initial-branch=main'],repo);git(['config','user.name','HWS upload test'],repo);git(['config','user.email','test@example.com'],repo);run(process.execPath,[resolve(projectRoot,'scripts/setup-upload-guard.mjs'),repo],projectRoot);git(['add','.'],repo);git(['commit','-m','Complete source'],repo);git(['init','--bare','--initial-branch=main',remote],staging);git(['remote','add','origin',remote],repo);git(['push','-u','origin','main'],repo);pass('complete first push succeeds with upload guard');
 await rm(join(repo,'.githooks/pre-push'));assert.ok(git(['config','core.hooksPath'],repo).stdout.includes('.git/'));pass('installed guard survives removal of the source hook template');
 const initial=git(['rev-parse','main'],remote).stdout.trim();
 git(['rm','app/editor.tsx'],repo);git(['commit','-m','Simulate partial ZIP replacing folder'],repo);let push=git(['push','origin','main'],repo,false);assert.notEqual(push.status,0);assert.match(push.stderr,/required source files:[\s\S]*app\/editor.tsx/);assert.equal(git(['rev-parse','main'],remote).stdout.trim(),initial);pass('missing-source commit is stopped before remote changes');
 await writeFile(join(repo,'app/editor.tsx'),'restored but not committed\n');push=git(['push','origin','main'],repo,false);assert.notEqual(push.status,0);assert.match(push.stderr,/app\/editor.tsx/);pass('guard checks the committed tree rather than unstaged local files');
 git(['add','app/editor.tsx'],repo);git(['commit','-m','Restore complete source'],repo);git(['push','origin','main'],repo);pass('normal repaired fast-forward push succeeds');
 const other=join(staging,'newer');git(['clone',remote,other],staging);git(['config','user.name','HWS upload test'],other);git(['config','user.email','test@example.com'],other);await writeFile(join(other,'remote-change.txt'),'newer commit\n');git(['add','.'],other);git(['commit','-m','Newer GitHub changes'],other);git(['push','origin','main'],other);
 const latest=git(['rev-parse','main'],remote).stdout.trim();push=git(['push','--force','origin','main'],repo,false);assert.notEqual(push.status,0);assert.match(push.stderr,/history that is missing/);assert.equal(git(['rev-parse','main'],remote).stdout.trim(),latest);pass('force push from stale checkout is blocked without losing newer remote history');
 await cp(join(projectRoot,'.githooks/pre-push'),join(repo,'.githooks/pre-push'));git(['fetch','origin'],repo);git(['merge','--ff-only','origin/main'],repo);await writeFile(join(repo,'next-update.txt'),'safe update\n');git(['add','.'],repo);git(['commit','-m','Next complete update'],repo);git(['push','origin','main'],repo);pass('fetch/pull followed by normal push works');
 run(process.execPath,['scripts/package-source.mjs'],projectRoot);run('python3',['-c',`import zipfile,pathlib,hashlib\nr=pathlib.Path(${JSON.stringify(projectRoot)})\nfiles=[p for p in (r/'SOURCE-FILES.txt').read_text().splitlines() if p and not p.startswith('#')]\nwith zipfile.ZipFile(r/'exports/HWS-Sites-COMPLETE.zip') as z:\n assert z.testzip() is None\n assert sorted(z.namelist())==sorted(files)\n for p in files: assert z.read(p)==(r/p).read_bytes(),p\n assert '.github/workflows/github-pages.yml' in z.namelist()\n assert '.githooks/pre-push' in z.namelist()\n assert not any(p.startswith(('.git/','node_modules/','exports/','.env')) for p in z.namelist())`],projectRoot);pass('complete ZIP independently unzips with every original byte, hidden workflows and no local secrets/history');
 console.log(`Verified ${checks} source packaging and push protection checks. No GitHub or production changes made by these tests.`);
}finally{await rm(staging,{recursive:true,force:true});}
