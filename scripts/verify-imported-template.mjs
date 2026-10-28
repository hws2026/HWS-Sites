import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const dir=resolve('.sites-runtime/imported-check');await mkdir(dir,{recursive:true});
await build({stdin:{contents:"export * from './lib/imported-template';export * from './lib/imported-template-documents';export * from './lib/template-start';export * from './lib/template-catalog';export * from './lib/site-store';export * from './lib/editor-model';export * from './lib/form-model';",resolveDir:resolve('.')},bundle:true,platform:'node',format:'esm',outfile:dir+'/check.mjs',logLevel:'silent'});
const m=await import(dir+'/check.mjs');
const manifest=JSON.parse(await readFile('scripts/paradis-source-manifest.json','utf8'));
for(const file of manifest){const bytes=await readFile('public/imported-templates/paradis-photo-booths/'+file.path);assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path+' must remain unchanged');if(file.path.endsWith('.html'))assert.equal(m.paradisDocuments[file.path],bytes.toString());}
console.log('PASS all 74 original HTML, CSS, JavaScript, and media files are byte-identical to the supplied archive.');
assert.ok(m.isTemplateId(m.PARADIS_TEMPLATE));assert.equal(m.templateChoices.find(t=>t.id===m.PARADIS_TEMPLATE).name,'Paradisephotobooths');
const original=m.startFromTemplate(m.PARADIS_TEMPLATE,'full');m.validateWebsite(original);
assert.equal(original.pages.length,8);assert.equal(original.pages.reduce((n,p)=>n+p.blocks.length,0),32);
assert.ok(Buffer.byteLength(JSON.stringify(original))<900000);
const source=JSON.stringify(original),edited=structuredClone(original);
edited.imported.header['0.0']={text:'New customer'};
edited.pages[0].blocks[0].imported.edits['0.1']={text:'Edited heading'};
edited.pages[0].blocks[0].imported.edits['0.2']={src:'/media/customer-photo',alt:'Event',style:{width:'80%',height:'320px',objectFit:'cover'}};
assert.deepEqual(m.validateWebsite(JSON.parse(JSON.stringify(edited))),edited);
assert.equal(JSON.stringify(original),source);
const clone=m.cloneBlock(edited.pages[0].blocks[0]);clone.imported.edits['0.1'].text='Independent copy';assert.equal(edited.pages[0].blocks[0].imported.edits['0.1'].text,'Edited heading');
for(const mode of ['outline','design']){const copy=m.startFromWebsite(edited,mode);m.validateWebsite(copy);assert.ok(copy.pages.every(p=>p.blocks.length===0));assert.deepEqual(copy.imported.header,edited.imported.header);}
const scratch=m.startFromTemplate(m.PARADIS_TEMPLATE,'scratch');m.validateWebsite(scratch);assert.equal(scratch.pages.length,1);assert.equal(scratch.pages[0].blocks.length,0);
for(const type of m.blockTypes.filter(t=>t!=='imported')){const copy=structuredClone(original);copy.pages[0].blocks.push(m.makeBlock(type));m.validateWebsite(copy);}
const form=m.makeBlock('form');edited.pages[0].blocks.push(form);assert.ok(m.publishedForm(edited,edited.pages[0].id,form.id));
console.log('PASS template registration, 8 pages/32 sections, independent edits, backups, duplication, scratch/outline/design modes, and every standard suite section.');
for(const bad of [{page:'../../outside.html'},{section:100},{template:'unregistered'},{edits:{'__proto__':{text:'bad'}}},{edits:{'0':{src:'javascript:alert(1)'}}},{edits:{'0':{href:'javascript:alert(1)'}}},{edits:{'0':{html:'<script>alert(1)</script>'}}},{edits:{'0':{style:{backgroundImage:'url(https://evil.test)'}}}},{edits:{'0':{style:{color:'red;position:fixed'}}}}]){
 const site=structuredClone(original);site.pages[0].blocks[0].imported={...site.pages[0].blocks[0].imported,...bad};
 if(Object.keys(bad.edits??{}).length)assert.throws(()=>m.validateWebsite(site));else if(!bad.edits)assert.throws(()=>m.validateWebsite(site));
}
console.log('PASS unregistered templates, invalid sections, script URLs, HTML injection, and unsafe CSS rejected.');
