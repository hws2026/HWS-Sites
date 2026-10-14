'use client';
import {useEffect,useState} from 'react';
import type {Block} from '@/lib/editor-model';

export function WebsiteStoryNav({blocks,motion,root}:{blocks:Block[];motion:boolean;root:React.RefObject<HTMLDivElement|null>}){
 const [active,setActive]=useState(blocks[0]?.id);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const sections=Array.from(element.querySelectorAll<HTMLElement>('.section-hero'));
  const container=element.closest('.canvas-scroll');const target=container??window;let frame=0;
  const update=()=>{
   frame=0;const top=container?.getBoundingClientRect().top??0;
   const header=element.querySelector<HTMLElement>('.website-header');
   const inset=header&&getComputedStyle(header).position==='sticky'?header.getBoundingClientRect().height:0;
   const current=sections.reduce((nearest,section)=>Math.abs(section.getBoundingClientRect().top-top-inset)<Math.abs(nearest.getBoundingClientRect().top-top-inset)?section:nearest,sections[0]);
   if(current?.dataset.sectionId)setActive(current.dataset.sectionId);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();target.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{target.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
 },[blocks,root]);
 return <nav className="story-progress" aria-label="Page stories">{blocks.map((block,i)=><button key={block.id} type="button" aria-label={`Story ${i+1}: ${block.title}`} aria-current={active===block.id?'true':undefined} onClick={()=>{const section=Array.from(root.current?.querySelectorAll<HTMLElement>('[data-section-id]')??[]).find(element=>element.dataset.sectionId===block.id);section?.scrollIntoView({behavior:motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto',block:'start'});}}><span>{block.title}</span></button>)}</nav>;
}
