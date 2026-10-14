import '@vitejs/plugin-react/preamble';

const profiles={
 iphone:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',platform:'iPhone',maxTouchPoints:5,mobile:true},
 android:{userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36',platform:'Linux armv8l',maxTouchPoints:5,mobile:true},
 ipad:{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5},
 desktop:{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0},
 touch:{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',platform:'Win32',maxTouchPoints:10},
};
const name=new URLSearchParams(location.search).get('profile')||'iphone',profile=profiles[name];document.querySelector('#profile').textContent=name;
for(const key of ['userAgent','platform','maxTouchPoints'])Object.defineProperty(navigator,key,{configurable:true,get:()=>profile[key]});
Object.defineProperty(navigator,'userAgentData',{configurable:true,get:()=>profile.mobile===undefined?undefined:{mobile:profile.mobile}});
let authRequests=0,apiRequests=0;window.fetch=async(input)=>{const url=String(input instanceof Request?input.url:input);if(url.includes('/auth/'))authRequests++;else apiRequests++;return Response.json({error:'No live account access in this local test'},{status:401});};
await import('../pages/main.tsx');
const update=()=>{const root=document.querySelector('#root');const denied=root.textContent.includes('Open the suite on a computer');document.querySelector('#test-result').textContent=`${denied?'Access denied before sign-in':root.querySelector('input[type=email]')?'Sign-in available':'Visitor content available'} · Auth requests: ${authRequests} · Suite API requests: ${apiRequests} · Login fields: ${root.querySelectorAll('input[type=email],input[type=password]').length}`;};
new MutationObserver(update).observe(document.querySelector('#root'),{childList:true,subtree:true});update();
