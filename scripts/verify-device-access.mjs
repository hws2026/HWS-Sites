import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=ts.transpileModule(await readFile('lib/device-access.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {isMobileDevice,isMobileRequest,isPublicSuitePath,isMobileApiAllowed}=await import('data:text/javascript,'+encodeURIComponent(source));
const cases=[
 ['iPhone Safari',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'},true],
 ['Android Chrome',{userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'},true],
 ['Android tablet',{userAgent:'Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'},true],
 ['iPad Safari',{userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15'},true],
 ['iPad desktop mode',{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5},true],
 ['mobile client hint',{userAgent:'Unknown',mobile:true},true],
 ['Android platform hint',{userAgent:'Unknown',platform:'Android',mobile:false},true],
 ['iOS platform hint',{platform:'iOS'},true],
 ['Kindle Fire',{userAgent:'Mozilla/5.0 Silk/3.13 Safari/535.19'},true],
 ['Mac desktop',{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0},false],
 ['Windows touch laptop',{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',platform:'Win32',maxTouchPoints:10},false],
 ['ChromeOS touch laptop',{userAgent:'Mozilla/5.0 (X11; CrOS x86_64 16093.0.0) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',platform:'Linux x86_64',maxTouchPoints:10},false],
 ['Linux desktop',{userAgent:'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'},false],
 ['missing device evidence',{},false],
];
for(const [name,signals,expected] of cases){assert.equal(isMobileDevice(signals),expected,name);console.log('PASS '+name);}
assert.equal(isMobileRequest(new Headers({'X-HWS-Device':'desktop','Sec-CH-UA-Mobile':'?1'})),true);
assert.equal(isMobileRequest(new Headers({'X-HWS-Device':'desktop','User-Agent':'Android'})),true);
assert.equal(isMobileRequest(new Headers({'Sec-CH-UA-Mobile':'?0','Sec-CH-UA-Platform':'"Android"'})),true);
for(const path of ['/','/signin','/signin?return_to=/admin','/site-admin/site-id','/reset-password','/admin','/portal','/editor/demo-sau70','/editor/site-id'])assert.equal(isPublicSuitePath(path),false,path);
for(const path of ['/demo/sau70','/website/site-id/home'])assert.equal(isPublicSuitePath(path),true,path);
console.log('PASS private routes are gated; visitor routes are exempt; desktop declarations never override mobile evidence');

for(const [path,method] of [['/api/me','GET'],['/api/mobile','GET'],['/api/mobile','POST'],['/api/events','PUT'],['/api/forms','GET'],['/api/forms','PUT'],['/api/billing','POST'],['/api/website-payments','GET'],['/api/site-login','POST']])assert.equal(isMobileApiAllowed(path,method),true);
for(const [path,method] of [['/api/admin','GET'],['/api/site','PUT'],['/api/portal','POST'],['/api/domains','POST'],['/api/upload','POST'],['/api/events','POST'],['/api/me','POST']])assert.equal(isMobileApiAllowed(path,method),false);
console.log('PASS mobile allowlist only admits authentication, billing, forms, and event routes');
