(()=>{
 const base=new URL('./',location.href),nativeFetch=window.fetch.bind(window),decoder=new TextDecoder();
 const form=document.querySelector('#unlock'),button=document.querySelector('#submit'),message=document.querySelector('#message');
 async function get(url,options){const r=await nativeFetch(new URL(url,base),options);if(!r.ok)throw Error('网络暂时没连上，请稍后重试。');return r;}
 async function decrypt(url,key){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);try{const data=new Uint8Array(await(await get(url,{signal:controller.signal})).arrayBuffer());return await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12)},key,data.slice(12));}finally{clearTimeout(timeout);}}
 form.onsubmit=async event=>{
  event.preventDefault();button.disabled=true;message.textContent='正在解开属于我们的时光…';
  try{
   if(!window.isSecureContext||!crypto.subtle)throw Error('请使用 HTTPS 链接，在新版 Safari 或手机浏览器打开。');
   const config=await(await get('config.json')).json();
   const input=document.querySelector('#answer');const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(input.value.trim()),'PBKDF2',false,['deriveKey']);input.value='';
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:Uint8Array.from(atob(config.salt),c=>c.charCodeAt(0)),iterations:config.iterations,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['decrypt']);
   let bundle;try{bundle=JSON.parse(decoder.decode(await decrypt(config.bundle,key)));}catch(e){if(e.name==='OperationError')throw Error('日期不对，再想想我们故事开始的那一天。');throw e;}
   await mount(bundle,key);
  }catch(e){message.textContent=e.message||'暂时打不开，请刷新后重试。';button.disabled=false;}
 };
 async function mount(bundle,key){
  const entries=new Map(),pending=new Map(),cache=new Map();
  const placeholder='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%223%22 height=%224%22%3E%3Crect width=%223%22 height=%224%22 fill=%22%23e8e1d2%22/%3E%3C/svg%3E';
  let index=0;const aliases={};for(const [src,entry]of Object.entries(bundle.media)){const marker=placeholder+'#sealed-'+index++;aliases[src]=marker;entries.set(marker,entry);}
  window.EMBEDDED_ID='-encrypted-pages-v1';
  const stored={APP_TEMPLATE:'index.html',APP_CSS:'style.css',STUDIO_CSS:'scrapbook.css',MOBILE_CSS:'mobile.css',APP_JS:'app.js',STUDIO_JS:'scrapbook.js',MOBILE_JS:'mobile.js'};
  for(const [global,name]of Object.entries(stored))window[global]=bundle.files[name];
  let active=0;const waiting=[];
  async function acquire(){if(active>=4)await new Promise(r=>waiting.push(r));active++;}
  function release(){active--;waiting.shift()?.();}
  async function load(marker){
   if(cache.has(marker))return cache.get(marker);
   if(pending.has(marker))return pending.get(marker);
   const task=(async()=>{await acquire();try{const entry=entries.get(marker);const bytes=await decrypt(entry.file,key);const blob=new Blob([bytes],{type:entry.type});const value={blob,url:URL.createObjectURL(blob)};cache.set(marker,value);return value;}finally{release();pending.delete(marker);}})();pending.set(marker,task);return task;
  }
  // Validate every still image before entering. Retain compressed Blobs rather
  // than decoded bitmaps to limit mobile memory usage.
  const loader=document.createElement('section');loader.className='sweet-loading';loader.setAttribute('aria-labelledby','sweetTitle');
  loader.innerHTML=`<div class="sweet-card"><span class="sweet-eyebrow">A LITTLE MOMENT OF SWEETNESS</span><div class="sweet-cloud" aria-hidden="true"><i></i><b>ᴗ</b><span>♡</span></div><h1 id="sweetTitle">甜蜜加载中......</h1><p>正在把我们的回忆，装进软软的云朵里</p><div id="sweetProgress" class="sweet-track" role="progressbar" aria-label="照片预加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="sweet-fill"><span>♡</span></div></div><strong id="sweetPercent">0%</strong><p id="sweetCount">正在准备照片…</p><p id="sweetStatus" role="status">全部照片准备好后，就能慢慢翻阅啦。</p><button id="sweetRetry" hidden>再收集一次小甜蜜 ♡</button><small>首次加载需要一点时间，请保持页面打开。<br>视频在点击时加载，不影响照片预览。</small></div>`;
  const loaderStyle=document.createElement('style');loaderStyle.textContent=`
  .sweet-loading{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;overflow:auto;padding:24px 18px;background:radial-gradient(ellipse at 15% 18%,#ffe3e9 0,transparent 45%),radial-gradient(ellipse at 85% 80%,#e6e8f6 0,transparent 45%),#fff9f2;color:#9a7377}
  .sweet-card{width:min(100%,420px);text-align:center;padding:30px 22px;border:1px solid #fff;border-radius:32px;background:#fffdf7c9;box-shadow:0 20px 70px #c4a3ad22}
  .sweet-eyebrow{font:9px/1.7 system-ui;letter-spacing:2px;color:#b19a99}.sweet-card h1{font:600 27px/1.5 serif;letter-spacing:2px;color:#ad7d87;margin:22px 0 7px}.sweet-card p{color:#a58d91;font-size:12px;line-height:1.9;margin:9px 0}.sweet-card small{font-size:10px;letter-spacing:0;line-height:1.8;color:#b3a3a4;display:block;margin-top:20px}.sweet-card strong{display:block;margin-top:16px;font:500 24px Georgia;color:#b78591}.sweet-card button{background:#c995a3;border-radius:22px;margin-top:10px}.sweet-card [hidden]{display:none!important}
  .sweet-cloud{position:relative;width:135px;height:73px;margin:65px auto 30px;background:linear-gradient(#fffafa,#ffe4eb);border-radius:60px;box-shadow:0 14px 22px #dda4b128,inset 0 -5px 9px #f4cbd3;animation:sweetFloat 3s ease-in-out infinite}
  .sweet-cloud:before,.sweet-cloud:after{content:'';position:absolute;background:#fff6f7;border-radius:50%;z-index:-1}.sweet-cloud:before{width:77px;height:77px;left:16px;top:-34px}.sweet-cloud:after{width:60px;height:60px;right:9px;top:-22px}.sweet-cloud i{position:absolute;left:35px;top:29px;width:6px;height:8px;background:#ae8586;border-radius:50%;box-shadow:53px 0 #ae8586}.sweet-cloud b{position:absolute;top:26px;left:62px;font:20px serif;color:#af8185}.sweet-cloud span{position:absolute;right:-23px;top:-28px;color:#d6a4b5;font:28px serif;transform:rotate(15deg)}
  .sweet-track{height:31px;border-radius:30px;padding:4px;background:#f5e9ed;box-shadow:inset 0 2px 5px #c7a2aa20;margin-top:28px;overflow:hidden}.sweet-fill{position:relative;height:100%;width:0;border-radius:30px;background:repeating-linear-gradient(115deg,#f1c0d0 0 17px,#ffe5eb 17px 34px,#ddd8ee 34px 51px,#fce9dc 51px 68px);background-size:150px 100%;transition:width .3s ease;animation:sweetFlow 3s linear infinite;box-shadow:inset 0 3px 4px #fff9,inset 0 -3px 4px #d5a8ba44;overflow:hidden}.sweet-fill span{position:absolute;right:6px;top:-2px;font:19px serif;color:#fff}.sweet-fill:after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,#ffffff70 0 45%,transparent 50%) 0 0/28px 15px;opacity:.5}
  @keyframes sweetFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-8px) rotate(3deg)}}@keyframes sweetFlow{to{background-position:150px 0}}
  @media(prefers-reduced-motion:reduce){.sweet-cloud,.sweet-fill{animation:none}.sweet-fill{transition:none}}
  `;document.head.append(loaderStyle);document.body.append(loader);
  const allImageMarkers=[...entries].filter(([,entry])=>entry.type.startsWith('image/')).map(([marker])=>marker);
  const imageMarkers=allImageMarkers,ready=new Set();
  const progress=()=>{const count=imageMarkers.filter(m=>ready.has(m)).length;const percent=imageMarkers.length?Math.floor(count/imageMarkers.length*100):100;loader.querySelector('.sweet-fill').style.width=percent+'%';loader.querySelector('#sweetPercent').textContent=percent+'%';loader.querySelector('#sweetProgress').setAttribute('aria-valuenow',percent);loader.querySelector('#sweetCount').textContent=`已收好 ${count} / ${imageMarkers.length} 张照片与视频封面`;};
  async function prepare(marker){
   for(let attempt=0;attempt<2;attempt++){
    try{const value=await load(marker);const img=new Image();img.src=value.url;await img.decode();ready.add(marker);progress();return true;}
    catch{const value=cache.get(marker);if(value)URL.revokeObjectURL(value.url);cache.delete(marker);if(attempt===0)await new Promise(r=>setTimeout(r,600));}
   }return false;
  }
  while(ready.size<imageMarkers.length){
   const remaining=imageMarkers.filter(marker=>!ready.has(marker));let cursor=0;
   await Promise.all(Array.from({length:Math.min(4,remaining.length)},async()=>{while(cursor<remaining.length)await prepare(remaining[cursor++]);}));
   if(ready.size<imageMarkers.length){
    loader.querySelector('#sweetStatus').textContent='有几张回忆还在路上，检查网络后点一下重试。已完成的不用重新加载。';
    const retry=loader.querySelector('#sweetRetry');retry.hidden=false;
    await new Promise(resolve=>{retry.onclick=()=>{retry.hidden=true;loader.querySelector('#sweetStatus').textContent='继续收集甜蜜的小片段…';resolve();};});
   }
  }
  progress();loader.querySelector('#sweetStatus').textContent='甜蜜已装满，正在打开我们的故事…';
  // Direct cached URLs avoid IntersectionObserver/network delays on quick flips.
  const sourceURL=src=>cache.get(aliases[src])?.url||aliases[src];
  window.EMBEDDED_PHOTOS=bundle.photos.map(p=>({...p,src:sourceURL(p.src),...(p.poster?{poster:sourceURL(p.poster)}:{})}));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  window.fetch=async(input,options)=>{
   const url=typeof input==='string'?input:input.url;
   if(entries.has(url))return new Response((await load(url)).blob);
   if(url==='/api/logout'){location.reload();return new Response('{}');}
   if(Object.hasOwn(bundle.files,url))return new Response(bundle.files[url]);
   return nativeFetch(input,options);
  };
  const documentTemplate=new DOMParser().parseFromString(bundle.files['index.html'],'text/html');
  documentTemplate.querySelectorAll('script,link[rel="stylesheet"]').forEach(el=>el.remove());
  document.head.innerHTML=documentTemplate.head.innerHTML;
  for(const name of ['style.css','scrapbook.css','mobile.css']){const style=document.createElement('style');style.textContent=bundle.files[name].replace(/@import[^;]+;/g,'');document.head.append(style);}
  const style=document.createElement('style');style.textContent='[hidden]{display:none!important}.sealed-retry{outline:2px dashed #b76c4e;cursor:pointer}';document.head.append(style);
  document.body.innerHTML=documentTemplate.body.innerHTML;
  async function fill(el,attr){
   const marker=el.getAttribute(attr);if(!entries.has(marker))return;
   const token=attr+'Pending';if(el.dataset[token]===marker)return;el.dataset[token]=marker;
   try{const value=await load(marker);if(el.isConnected&&el.getAttribute(attr)===marker){el.setAttribute(attr,value.url);el.classList.remove('sealed-retry');if(el.tagName==='VIDEO'&&attr==='src')el.load();}}
   catch{el.classList.add('sealed-retry');el.title='加载未完成，轻点重试';const retry=e=>{e.stopPropagation();fill(el,attr);};el.addEventListener('click',retry,{once:true});}
   finally{delete el.dataset[token];}
  }
  const visible=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){fill(item.target,'src');fill(item.target,'poster');visible.unobserve(item.target);}},{rootMargin:'350px'});
  function inspect(el){if(el.nodeType!==1)return;if(el.matches('img,video')){if(el.tagName==='VIDEO'){fill(el,'src');fill(el,'poster');}else if(entries.has(el.getAttribute('src')))visible.observe(el);}el.querySelectorAll('img,video').forEach(inspect);}
  const observer=new MutationObserver(mutations=>{for(const m of mutations){if(m.type==='attributes')inspect(m.target);else m.addedNodes.forEach(inspect);}});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','poster']});
  // Classic scripts intentionally share the same lexical scope, as in the source album.
  for(const name of ['app.js','scrapbook.js','mobile.js']){const script=document.createElement('script');script.textContent=bundle.files[name];document.body.append(script);}
  inspect(document.body);
  document.addEventListener('click',e=>{if(e.target.closest('#lockAlbum')){e.preventDefault();e.stopImmediatePropagation();location.reload();}},{capture:true});
  window.addEventListener('pagehide',()=>{observer.disconnect();visible.disconnect();for(const value of cache.values())URL.revokeObjectURL(value.url);});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 }
})();
