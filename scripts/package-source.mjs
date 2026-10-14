import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {sourceFiles,projectRoot} from './verify-source.mjs';

// Package the whole working source tree listed in the manifest, including dotfiles.
// No git history, dependencies, credentials, generated output or partial-update ZIPs.
const files=await sourceFiles();
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=b=>{let n=0xffffffff;for(const byte of b)n=table[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
const chunks=[],central=[];let offset=0;
for(const file of files){
 const bytes=await readFile(resolve(projectRoot,file)),packed=deflateRawSync(bytes),name=Buffer.from(file),crc=crc32(bytes);
 if(bytes.length>100*1024*1024)throw new Error('Source file is unexpectedly large: '+file);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(name.length,26);
 const header=Buffer.alloc(46);header.writeUInt32LE(0x02014b50,0);header.writeUInt16LE(0x314,4);header.writeUInt16LE(20,6);header.writeUInt16LE(0x800,8);header.writeUInt16LE(8,10);header.writeUInt16LE(33,14);header.writeUInt32LE(crc,16);header.writeUInt32LE(packed.length,20);header.writeUInt32LE(bytes.length,24);header.writeUInt16LE(name.length,28);header.writeUInt32LE(((file.startsWith('.githooks/')?0o100755:0o100644)<<16)>>>0,38);header.writeUInt32LE(offset,42);
 chunks.push(local,name,packed);central.push(header,name);offset+=local.length+name.length+packed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const output=resolve(projectRoot,'exports/HWS-Sites-COMPLETE.zip');await mkdir(dirname(output),{recursive:true});await writeFile(output,Buffer.concat([...chunks,directory,end]));
console.log(`Complete source ZIP: ${output}\n${files.length} files, including all templates, assets and deployment workflows. Keep the repository's .git folder when copying these files.`);
