import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),braces=require('braces');
const deep='{'.repeat(1000)+'x'+'}'.repeat(1000);
for(const fn of [braces.parse,braces.compile,braces.expand,braces.stringify])assert.throws(()=>fn(deep),/HWS bounded brace nesting/);
let ast={type:'root',nodes:[]},node=ast;for(let i=0;i<1000;i++){const child={type:'brace',nodes:[]};node.nodes.push(child);node=child;}
assert.throws(()=>braces.compile(ast),/HWS bounded brace nesting/);assert.throws(()=>braces.stringify(ast),/HWS bounded brace nesting/);
assert.deepEqual(braces.expand('src/{app,lib}/**/*.tsx'),['src/app/**/*.tsx','src/lib/**/*.tsx']);
console.log('PASS development-tool mitigation blocks deeply nested patterns and preserves ordinary expansion.');
const html=await readFile('pages-dist/index.html','utf8');assert.match(html,/http-equiv="Content-Security-Policy"/);assert.match(html,/script-src 'self' 'sha256-[^']+'/);assert.match(html,/object-src 'none'/);assert.ok(!html.includes("'unsafe-eval'"));assert.ok(!/script-src[^;]*unsafe-inline/.test(html));
console.log('PASS production suite script policy permits its trusted template behavior without arbitrary inline scripts.');
