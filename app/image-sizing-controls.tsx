'use client';
import type {ImageSizing} from '@/lib/image-sizing';
export function ImageSizingControls({value,onChange,label='Image sizing',background=false}:{value?:ImageSizing;onChange:(value:ImageSizing|undefined)=>void;label?:string;background?:boolean}){
 const size=value??{},update=(patch:Partial<ImageSizing>)=>onChange({...size,...patch});
 return <details className="image-sizing-controls"><summary>{label}</summary><div>
 {!background&&<><label>Image width<input type="number" min={1} max={size.unit==='px'?2400:100} placeholder="Template default" value={size.width??''} onChange={e=>update({width:e.target.value?Math.min(size.unit==='px'?2400:100,Math.max(1,Math.round(Number(e.target.value)))):undefined})}/></label><label>Width unit<select value={size.unit??'%'} onChange={e=>update({unit:e.target.value as ImageSizing['unit'],width:undefined})}><option value="%">Percent of available space</option><option value="px">Pixels (shrinks to fit mobile)</option></select></label><label>Image height (px)<input type="number" min={1} max={1600} placeholder="Automatic proportions" value={size.height??''} onChange={e=>update({height:e.target.value?Math.min(1600,Math.max(1,Math.round(Number(e.target.value)))):undefined})}/></label></>}
 <label>Image fit<select value={size.fit??''} onChange={e=>update({fit:(e.target.value||undefined) as ImageSizing['fit']})}><option value="">Template default</option><option value="cover">Cover · crop to fill</option><option value="contain">Contain · show full image</option></select></label>
 <label>Image position<select value={size.position??'center'} onChange={e=>update({position:e.target.value as ImageSizing['position']})}>{['center','top','bottom','left','right'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></label>
 {!background&&<label>Image alignment<select value={size.align??''} onChange={e=>update({align:(e.target.value||undefined) as ImageSizing['align']})}><option value="">Template default</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>}
 <p className="field-help">{background?'Hero images fill the hero area. Choose how they crop within it.':'Sizing changes this placement only. The uploaded file stays unchanged. Leave height blank to preserve proportions.'}</p>
 <button type="button" className="button" onClick={()=>onChange(undefined)}>Reset image sizing</button>
 </div></details>;
}
