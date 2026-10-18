(()=>{
 const base=new URL('./',location.href),nativeFetch=window.fetch.bind(window),decoder=new TextDecoder();
 const form=document.querySelector('#unlock'),button=document.querySelector('#submit'),message=document.querySelector('#message');
 async function get(url){const r=await nativeFetch(new URL(url,base));if(!r.ok)throw Error('网络暂时没连上，请稍后重试。');return r;}
 async function decrypt(url,key){const data=new Uint8Array(await(await get(url)).arrayBuffer());return crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12)},key,data.slice(12));}
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
  window.EMBEDDED_PHOTOS=bundle.photos.map(p=>({...p,src:aliases[p.src],...(p.poster?{poster:aliases[p.poster]}:{})}));
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
