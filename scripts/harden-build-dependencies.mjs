import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const marker='HWS bounded brace nesting';
for(const [path,record] of Object.entries(lock.packages)){
 if(!path.endsWith('node_modules/braces'))continue;
 if(record.version!=='3.0.3')throw new Error('Review the braces security mitigation before changing its pinned version.');
 for(const file of ['parse','compile','expand','stringify']){
  const name=resolve(root,path,'lib',file+'.js');let source;
  try{source=await readFile(name,'utf8');}catch(error){if(error.code==='ENOENT')continue;throw error;}
  if(source.includes(marker))continue;
  const guard=`if (hwsDepth > 128) throw new RangeError('${marker}');`;
  if(file==='parse'){
   const before='      depth++;';if(!source.includes(before))throw new Error('Unexpected braces parser; mitigation not applied.');
   source=source.replace(before,`${before}\n      if (depth > 128) throw new RangeError('${marker}');`);
  }else{
   const fn=file==='stringify'?'stringify':'walk',before=`const ${fn} = (node, parent = {}) => {`;
   if(!source.includes(before))throw new Error('Unexpected braces walker; mitigation not applied.');
   source=source.replace(before,`const ${fn} = (node, parent = {}, hwsDepth = 0) => {\n    ${guard}`);
   source=source.replaceAll(`${fn}(child, node)`,`${fn}(child, node, hwsDepth + 1)`).replaceAll(`${fn}(child)`,`${fn}(child, node, hwsDepth + 1)`);
  }
  await writeFile(name,source);
 }
}
console.log('Applied local depth limits for GHSA-vfj7-8cjw-p6xm. The upstream npm advisory remains visible until a patched release exists.');
