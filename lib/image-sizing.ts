import type {CSSProperties} from 'react';

export type ImageSizing = {
 width?:number; unit?:'%'|'px'; height?:number;
 fit?:'cover'|'contain'; position?:'center'|'top'|'bottom'|'left'|'right'; align?:'left'|'center'|'right';
};
export function validateImageSizing(value:unknown){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid image sizing.');
 const s=value as ImageSizing;
 if(Object.keys(s).some(k=>!['width','unit','height','fit','position','align'].includes(k)))throw new Error('Invalid image sizing option.');
 if(s.unit!==undefined&&!['%','px'].includes(s.unit))throw new Error('Image width must use percent or pixels.');
 if(s.width!==undefined&&(!Number.isInteger(s.width)||s.width<1||s.width>(s.unit==='px'?2400:100)))throw new Error('Image width must be 1–100% or 1–2400 pixels.');
 if(s.height!==undefined&&(!Number.isInteger(s.height)||s.height<1||s.height>1600))throw new Error('Image height must be 1–1600 pixels, or automatic.');
 if(s.fit!==undefined&&!['cover','contain'].includes(s.fit)||s.position!==undefined&&!['center','top','bottom','left','right'].includes(s.position)||s.align!==undefined&&!['left','center','right'].includes(s.align))throw new Error('Invalid image fit, position, or alignment.');
}
export function imageSizingStyle(s?:ImageSizing):CSSProperties{
 if(!s||!Object.keys(s).length)return {};
 const style:CSSProperties={};
 if(s.width!==undefined){style.width=String(s.width)+(s.unit??'%');style.maxWidth='100%';style.minWidth=0;}
 if(s.height!==undefined){style.height=s.height;style.maxHeight='none';style.aspectRatio='auto';}
 else if(s.width!==undefined){style.height='auto';style.maxHeight='none';style.aspectRatio='auto';}
 if(s.fit)style.objectFit=s.fit;
 if(s.position)style.objectPosition=s.position;
 if(s.align){style.display='block';style.marginLeft=s.align==='left'?0:'auto';style.marginRight=s.align==='right'?0:'auto';}
 return style;
}
