'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,ChevronDown,Pause,Play} from 'lucide-react';
import type {Block,Website,HeroSlide} from '@/lib/editor-model';
import {SiteImage,useMediaSource} from './site-image';

export function WebsiteHero({block,site,editing,href,onNavigate}:{block:Block;site:Website;editing:boolean;href:(value:string)=>string;onNavigate:(e:React.MouseEvent,value:string)=>void}){
 const media=useMediaSource(block.videoUrl),poster=useMediaSource(block.videoUrl?block.image:'');
 const slides:HeroSlide[]=[{id:block.id,title:block.title,text:block.text,image:block.image,imageAlt:block.imageAlt??'',label:block.label,link:block.link},...(block.slides??[])];
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true),[inView,setInView]=useState(true);
 const root=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null);const active=Math.min(index,slides.length-1),motion=site.animations!==false&&!reduced;
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 useEffect(()=>{if(!root.current)return;const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.1});observer.observe(root.current);return()=>observer.disconnect();},[]);
 const playing=!editing&&motion&&block.autoplay!==false&&!paused&&!hover&&!focused&&inView;
 useEffect(()=>{if(!playing||slides.length<2||block.videoUrl)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')setIndex(value=>(value+1)%slides.length);},(block.slideInterval??6)*1000);return()=>clearInterval(timer);},[playing,slides.length,block.slideInterval,block.videoUrl]);
 useEffect(()=>{const element=video.current;if(!element)return;if(playing&&active===0)void element.play().catch(()=>{});else element.pause();},[playing,media.src,active]);
 const select=(next:number)=>{setIndex((next+slides.length)%slides.length);setPaused(true);};
 const textSlides=site.layout==='school'||site.layout==='editorial';
 const advance=(amount:number)=>select(active+amount);
 return <div ref={root} className={'hero-presentation transition-'+(block.slideTransition??'fade')+(block.imageMotion&&motion?' image-motion':'')+(playing?' is-playing':'')+(editing?' is-editing':'')} style={{'--slide-duration':motion?`${block.slideDuration??800}ms`:'0ms','--slide-interval':`${block.slideInterval??6}s`} as React.CSSProperties} aria-roledescription="carousel" aria-label="Featured stories" onPointerEnter={event=>{if(event.pointerType==='mouse')setHover(true);}} onPointerLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setFocused(false);}} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();advance(event.key==='ArrowRight'?1:-1);}}}>
  <div className="hero-slides">{slides.map((slide,i)=><article className={'hero-slide'+(i===active?' active-slide':'')} key={slide.id} aria-hidden={i!==active} inert={i!==active} aria-roledescription="slide" aria-label={`${i+1} of ${slides.length}`} style={{'--slide-offset':i-active,'--photo-position':`${i%2?70:50}% center`} as React.CSSProperties}>
   {(slide.image||block.videoUrl)&&<div className="hero-media"><SiteImage className="hero-photo" sizing={slide.imageSizing??block.imageSizing} src={slide.image||block.image} alt={slide.imageAlt}/>{i===0&&block.videoUrl&&<video ref={video} className="hero-video" src={media.src||undefined} poster={poster.src||undefined} muted loop playsInline preload="metadata" aria-label={slide.imageAlt||'Background video'}/>}<div className="hero-shade"/></div>}
   <div className="section-content hero-copy" style={{maxWidth:block.maxWidth??1200}}>{slide.title&&<><p className="website-eyebrow">{site.name}</p><div className="website-section-heading"><h1>{slide.title}</h1></div></>}{slide.text&&(site.layout==='school'&&slide.text.includes('\n\n')?<><p className="hero-lead">{slide.text.split('\n\n')[0]}</p><p>{slide.text.split('\n\n').slice(1).join('\n\n')}</p></>:<p>{slide.text}</p>)}{slide.label&&<a className="website-button" href={href(slide.link)} onClick={e=>onNavigate(e,slide.link)}>{slide.label}<ArrowRight size={16} aria-hidden="true"/></a>}</div>
  </article>)}</div>
  {site.heroLinks&&<nav className="hero-shortcuts" aria-label="Featured resources">{site.heroLinks.split('\n').filter(Boolean).map((line,i)=>{const [name,link]=line.split('|');return <a key={i} href={href(link)} onClick={event=>onNavigate(event,link)}>{name}</a>;})}</nav>}
  {(slides.length>1||block.videoUrl||block.imageMotion)&&<div className="hero-controls" onClick={event=>event.stopPropagation()}>
   {textSlides&&<span className="hero-counter" aria-live={paused?'polite':'off'}>{active+1} of {slides.length}</span>}
   {slides.length>1&&<button type="button" className="slide-previous" aria-label="Previous slide" onClick={()=>advance(-1)}><ChevronLeft size={21}/></button>}
   <button type="button" className="slide-play" aria-label={paused||!motion||block.autoplay===false?'Play slideshow':'Pause slideshow'} onClick={()=>{if(paused){setPaused(false);setFocused(false);setHover(false);}else setPaused(true);}} disabled={!motion||block.autoplay===false}><Pause size={16} className={paused?'control-hidden':''}/><Play size={16} className={!paused?'control-hidden':''}/></button>
   {slides.length>1&&<button type="button" className="slide-next" aria-label="Next slide" onClick={()=>advance(1)}><ChevronRight size={21}/></button>}
   {slides.length>1&&<div className="hero-pagination" aria-label="Choose slide">{slides.map((slide,i)=><button key={slide.id} type="button" aria-label={`Go to slide ${i+1}`} aria-current={active===i?'true':undefined} onClick={()=>select(i)}/>)}</div>}
  </div>}
  {textSlides&&<button type="button" className="hero-scroll" aria-label="Scroll to content" onClick={event=>{event.stopPropagation();root.current?.closest('section')?.nextElementSibling?.scrollIntoView({behavior:motion?'smooth':'auto',block:'start'});}}><ChevronDown size={20}/></button>}
 </div>;
}
