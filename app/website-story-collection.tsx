'use client';
import {Children,useRef} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

export function WebsiteStoryCollection({enabled,editing,motion,children}:{enabled:boolean;editing:boolean;motion:boolean;children:React.ReactNode}){
 const rail=useRef<HTMLDivElement>(null),stories=Children.toArray(children);
 if(!enabled||stories.length<3)return <>{children}</>;
 const advance=(direction:number)=>{const el=rail.current;if(!el)return;const index=Math.round(el.scrollLeft/el.clientWidth),next=(index+direction+stories.length-2)%(stories.length-2);el.scrollTo({left:next*el.clientWidth,behavior:motion?'smooth':'instant'});};
 return <>{stories.slice(0,2)}<div className={'editorial-story-collection'+(editing?' is-editing':'')}><div ref={rail} className="editorial-story-rail" aria-label="Community stories">{stories.slice(2)}</div><div className="editorial-story-controls"><button type="button" aria-label="Previous community story" onClick={()=>advance(-1)}><ChevronLeft/></button><button type="button" aria-label="Next community story" onClick={()=>advance(1)}><ChevronRight/></button></div></div></>;
}
