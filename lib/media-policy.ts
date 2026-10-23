export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, 'application/pdf'];
export const isUploadedMedia = (value: string) => /^\/media\/[a-zA-Z0-9-]+$/.test(value);
export const isDirectVideo = (value: string) => isUploadedMedia(value) || /^https:\/\/[^\s]+\.(mp4|webm)(\?[^\s]*)?$/i.test(value);
export function validateMedia(size: number, type: string) {
  if (!Number.isSafeInteger(size) || size < 1) return 'Choose a file that is not empty.';
  if (size > MAX_MEDIA_BYTES) return 'This file exceeds the 50 MB limit. Choose a smaller file or compress it first.';
  if (!MEDIA_TYPES.includes(type)) return 'Choose a JPG, PNG, WebP, GIF, MP4, WebM, or PDF file.';
  return '';
}

// A caller-supplied Content-Type is not evidence of the file's format.
export function mediaSignatureMatches(bytes:Uint8Array,type:string){
 const text=(a:number,b:number)=>new TextDecoder().decode(bytes.slice(a,b));
 if(type==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(type==='image/gif')return ['GIF87a','GIF89a'].includes(text(0,6));
 if(type==='image/webp')return text(0,4)==='RIFF'&&text(8,12)==='WEBP';
 if(type==='video/mp4')return text(4,8)==='ftyp'&&bytes.length>=12;
 if(type==='video/webm')return [0x1a,0x45,0xdf,0xa3].every((v,i)=>bytes[i]===v);
 return type==='application/pdf'&&text(0,5)==='%PDF-';
}
