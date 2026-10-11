'use client';
import {useId} from 'react';
import type {TemplateStartMode} from '@/lib/template-start';

export function TemplateStartOptions({value,onChange}:{value:TemplateStartMode;onChange:(value:TemplateStartMode)=>void}){
 const id=useId();
 return <fieldset className="template-start-options"><legend>How would you like to start?</legend>{[
  {value:'scratch',title:'Start from scratch',description:'One empty Home page with this template’s colors, fonts, and header/footer design. Add your own pages, menus, and content.'},
  {value:'full',title:'Use the whole template',description:'Include every demo page, menu, section, and sample event. Edit or remove whatever you need.'}
 ].map(option=><label key={option.value} className={value===option.value?'selected':''}><input type="radio" name={id} value={option.value} checked={value===option.value} onChange={()=>onChange(option.value as TemplateStartMode)}/><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</fieldset>;
}
