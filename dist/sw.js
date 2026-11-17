// Keeps a copy of the guide on the device so it opens with no connection.
//
// What is saved: the page, its styles and scripts, the font and icons, every data file and the small copy of every photo
// are saved when the guide is first opened. Full-size photos are saved as they are viewed.
//
// What a visitor gets, by kind of file:
//   the page and data/*.json   the newest copy from the network; the saved copy only when the network fails or is very slow
//   files named with ?v=N      the saved copy, because a changed file always gets a new number
//   everything else            the saved copy straight away, refreshed in the background for next time
//
// Nothing here needs editing when the guide changes: the list of files is read from index.html and guide.json.
// Change CACHE only to throw away every saved copy.
const CACHE='zephyr-guide-v1';
const SLOW=4000;
const scope=new URL('./',self.location.href).href;
const pageKey=scope;

// The local stylesheets, scripts, preloads, icons and manifest that a page names.
function pageFiles(html){
  const files=new Set();
  for(const [,url] of html.matchAll(/<(?:link|script)\b[^>]*?\b(?:href|src)="([^"]+)"/g))if(!/^(?:[a-z]+:|\/\/|#)/i.test(url))files.add(url);
  return [...files];
}
// The small copy of every local photo named in the data. Mirrors thumbFor() in core.js.
function thumbnails(text){
  const files=new Set();
  for(const [,name] of text.matchAll(/"images\/(?!thumbs\/)([^"]+)\.(?:png|jpe?g|webp|gif)"/gi))files.add('images/thumbs/'+name+'.webp');
  return [...files];
}
async function save(){
  const cache=await caches.open(CACHE);
  const page=await fetch(pageKey,{cache:'no-cache'});
  if(!page.ok)throw new Error('The guide could not be saved for offline use.');
  const html=await page.clone().text();
  await cache.put(pageKey,page);
  const files=new Set([...pageFiles(html),'data/changelog.json']);
  try{
    const response=await fetch('data/guide.json',{cache:'no-cache'});
    if(response.ok){
      const text=await response.clone().text();
      await cache.put(new URL('data/guide.json',scope).href,response);
      for(const category of JSON.parse(text).categories||[])if(/^[a-z0-9-]+\.json$/.test(category.file))files.add('data/'+category.file);
      for(const thumb of thumbnails(text))files.add(thumb);
    }
  }catch{}
  // One missing file must not stop the rest being saved; anything missed is saved the next time it is used.
  await Promise.all([...files].map(async file=>{try{const url=new URL(file,scope).href,response=await fetch(url,{cache:'no-cache'});if(response.ok)await cache.put(url,response);}catch{}}));
}
self.addEventListener('install',event=>event.waitUntil(save().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('zephyr-guide-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));

// Saving a copy must not hold up the answer, so it carries on in the background (waitUntil keeps the worker alive for it).
function keep(event,cache,key,response,then){
  if(response.status===200){const copy=response.clone();event.waitUntil(cache.put(key,copy).then(then).catch(()=>{}));}
  return response;
}
// Newest first: wait for the network, but fall back to the saved copy when it fails, errors or takes too long.
async function newest(event,request,key){
  const cache=await caches.open(CACHE),saved=await cache.match(key);
  const network=fetch(request).then(response=>keep(event,cache,key,response));
  if(!saved)return network;
  const fresh=await Promise.race([network.catch(()=>null),new Promise(resolve=>setTimeout(resolve,SLOW,null))]);
  return fresh&&fresh.ok?fresh:saved;
}
// Saved first: a file named with a version never changes. When a new version is saved, older ones of the same file are dropped.
async function versioned(event,request,url){
  const cache=await caches.open(CACHE),saved=await cache.match(url.href);
  if(saved)return saved;
  return keep(event,cache,url.href,await fetch(request),async()=>{for(const old of await cache.keys()){const other=new URL(old.url);if(other.pathname===url.pathname&&other.href!==url.href)await cache.delete(old);}});
}
// Saved copy now, refreshed quietly for next time.
async function refreshed(event,request,url){
  const cache=await caches.open(CACHE),saved=await cache.match(url.href);
  const network=fetch(request).then(response=>keep(event,cache,url.href,response));
  if(!saved)return network;
  event.waitUntil(network.catch(()=>{}));
  return saved;
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||!url.href.startsWith(scope))return;
  // A request the browser may only answer from its own cache cannot be passed on to the network.
  if(request.cache==='only-if-cached'&&request.mode!=='same-origin')return;
  const path=url.pathname.slice(new URL(scope).pathname.length);
  if(request.mode==='navigate'){
    // The guide is one page; anything else (the hidden page, a mistyped address) is left to the network.
    if(path===''||path==='index.html')event.respondWith(newest(event,request,pageKey));
    return;
  }
  if(/^data\/[^/]+\.json$/.test(path))event.respondWith(newest(event,request,url.origin+url.pathname));
  else if(url.searchParams.has('v'))event.respondWith(versioned(event,request,url));
  else event.respondWith(refreshed(event,request,url));
});
