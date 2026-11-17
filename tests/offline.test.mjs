import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {thumbFor} from '../dist/core.js';
// sw.js keeps a copy of the guide for use with no connection. It is run here against the real dist/ folder with a pretend
// browser around it: a cache, a network that can be switched off, and a clock that runs 100 times faster.
const dist=new URL('../dist/',import.meta.url);
const SCOPE='https://guide.test/zephyr-guide/';
const guide=JSON.parse(fs.readFileSync(new URL('data/guide.json',dist)));
const html=fs.readFileSync(new URL('index.html',dist),'utf8');
function start(){
 const stores=new Map(),listeners={},network={online:true,hang:false,calls:[],override:new Map()};
 const key=k=>new URL(typeof k==='string'?k:k.url,SCOPE).href;
 const cacheFor=name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
  async match(k){return store.get(key(k))?.clone();},
  async put(k,response){store.set(key(k),response);},
  async keys(){return [...store.keys()].map(url=>({url}));},
  async delete(k){return store.delete(key(k));},
 };};
 const caches={open:async name=>cacheFor(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)};
 const fetch=async request=>{
  const url=key(request);network.calls.push(url);
  if(network.hang)return new Promise(()=>{});
  if(!network.online)throw new TypeError('Failed to fetch');
  if(network.override.has(url))return new Response(network.override.get(url));
  if(!url.startsWith(SCOPE))throw new Error('The worker asked another site for '+url);
  const path=new URL(url).pathname.slice(new URL(SCOPE).pathname.length)||'index.html',file=new URL(path,dist);
  return fs.existsSync(file)&&fs.statSync(file).isFile()?new Response(fs.readFileSync(file)):new Response('missing',{status:404});
 };
 const self={location:{href:SCOPE+'sw.js'},addEventListener:(type,fn)=>{listeners[type]=fn;},skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 vm.runInNewContext(fs.readFileSync(new URL('sw.js',dist),'utf8'),{self,caches,fetch,URL,Response,setTimeout:(fn,ms,...args)=>setTimeout(fn,ms/100,...args)});
 const lifecycle=async type=>{const waits=[];listeners[type]({waitUntil:p=>waits.push(p)});await Promise.all(waits);};
 // Asks the worker for a file the way a page would. Resolves to undefined when the worker leaves the request to the browser.
 const ask=async(path,{mode='no-cors',method='GET'}={})=>{let answer;const waits=[];listeners.fetch({request:{url:new URL(path,SCOPE).href,method,mode},respondWith:p=>{answer=p;},waitUntil:p=>waits.push(p)});const response=answer&&await answer;await Promise.all(waits);return response;};
 const saved=()=>[...(stores.get('zephyr-guide-v1')?.keys()||[])].map(url=>url.slice(SCOPE.length));
 return {lifecycle,ask,saved,network,stores};
}
const referenced=[...guide.locations.map(l=>l.mapImage),...guide.benches.map(b=>b.image),...Object.values(guide.substanceGuides||{}).flatMap(g=>(g.images||[]).map(i=>i.src)),...Object.values(guide.gatheringGuides||{}).flatMap(g=>(g.images||[]).map(i=>i.src)),...(guide.heistGuides||[]).flatMap(g=>(g.images||[]).map(i=>i.src))].filter(src=>src&&src.startsWith('images/'));

test('the first visit saves everything the guide needs to open with no connection',async()=>{
 const sw=start();await sw.lifecycle('install');
 const saved=sw.saved();
 assert.ok(saved.includes(''),'the page itself');
 for(const [,file] of html.matchAll(/(?:href|src)="((?:theme|business)\.css\?v=\d+|(?:app|core|business)\.js\?v=\d+|fonts\/[^"]+|manifest\.webmanifest)"/g))assert.ok(saved.includes(file),file);
 for(const file of ['guide.json','changelog.json',...guide.categories.map(c=>c.file)])assert.ok(saved.includes('data/'+file),'data/'+file);
 for(const src of referenced)assert.ok(saved.includes(thumbFor(src)),thumbFor(src));
 // Full-size photos are only saved once they have been looked at.
 assert.equal(saved.some(file=>/^images\/(?!thumbs\/)/.test(file)),false);
 // Nothing it tried to save was missing, so no address in the page or the data is stale.
 for(const url of sw.network.calls)assert.ok(saved.includes(url.slice(SCOPE.length)),url+' could not be saved');
});
test('with no connection the page, the data and saved files still arrive',async()=>{
 const sw=start();await sw.lifecycle('install');
 sw.network.online=false;
 assert.equal(await (await sw.ask('',{mode:'navigate'})).text(),html);
 assert.equal(await (await sw.ask('index.html?edit',{mode:'navigate'})).text(),html);
 assert.deepEqual(JSON.parse(await (await sw.ask('data/guide.json')).text()),guide);
 assert.ok((await sw.ask('data/changelog.json')).ok);
 const script=html.match(/app\.js\?v=\d+/)[0];
 assert.ok((await sw.ask(script,{mode:'cors'})).ok);
 assert.ok((await sw.ask(thumbFor(referenced[0]))).ok);
 // A photo that was never opened is not there, and the worker says so rather than inventing an answer.
 await assert.rejects(sw.ask(referenced[0]));
});
test('with a connection the page and data always come fresh, and the saved copy is brought up to date',async()=>{
 const sw=start();await sw.lifecycle('install');
 sw.network.override.set(SCOPE+'data/guide.json','{"new":true}');
 assert.equal(await (await sw.ask('data/guide.json')).text(),'{"new":true}');
 sw.network.online=false;
 assert.equal(await (await sw.ask('data/guide.json')).text(),'{"new":true}');
 sw.network.online=true;sw.network.override.set(SCOPE,'<p>new page</p>');
 assert.equal(await (await sw.ask('',{mode:'navigate'})).text(),'<p>new page</p>');
 sw.network.online=false;
 assert.equal(await (await sw.ask('',{mode:'navigate'})).text(),'<p>new page</p>');
});
test('a connection that hangs falls back to the saved copy instead of waiting forever',async()=>{
 const sw=start();await sw.lifecycle('install');
 sw.network.hang=true;
 assert.deepEqual(JSON.parse(await (await sw.ask('data/guide.json')).text()),guide);
 assert.equal(await (await sw.ask('',{mode:'navigate'})).text(),html);
});
test('a file with a version number is served from the saved copy, and a new version replaces the old one',async()=>{
 const sw=start();await sw.lifecycle('install');
 const current=html.match(/app\.js\?v=(\d+)/),next='app.js?v='+(Number(current[1])+1);
 sw.network.calls.length=0;
 assert.ok((await sw.ask(current[0],{mode:'cors'})).ok);
 assert.deepEqual(sw.network.calls,[],'a saved versioned file needs no network');
 assert.ok((await sw.ask(next,{mode:'cors'})).ok);
 assert.ok(sw.saved().includes(next));
 assert.equal(sw.saved().includes(current[0]),false,'the old version is dropped');
 assert.ok(sw.saved().some(file=>file.startsWith('core.js?v=')),'other files are untouched');
});
test('photos are saved as they are viewed and refreshed in the background',async()=>{
 const sw=start();await sw.lifecycle('install');
 const photo=referenced[0];
 assert.ok((await sw.ask(photo)).ok);
 assert.ok(sw.saved().includes(photo));
 sw.network.override.set(SCOPE+photo,'newer picture');
 assert.notEqual(await (await sw.ask(photo)).text(),'newer picture','the saved copy is shown straight away');
 assert.equal(await (await sw.ask(photo)).text(),'newer picture','and the refreshed copy next time');
 sw.network.online=false;
 assert.equal(await (await sw.ask(photo)).text(),'newer picture');
});
test('errors are not saved over a good copy',async()=>{
 const sw=start();await sw.lifecycle('install');
 assert.equal((await sw.ask('images/thumbs/not-there.webp')).status,404);
 assert.equal(sw.saved().includes('images/thumbs/not-there.webp'),false);
});
test('the worker leaves alone what is not part of the guide',async()=>{
 const sw=start();await sw.lifecycle('install');
 assert.equal(await sw.ask('data/guide.json',{method:'POST'}),undefined);
 assert.equal(await sw.ask('https://elsewhere.test/thing.js'),undefined);
 assert.equal(await sw.ask('https://guide.test/another-site/'),undefined);
 // The hidden page and mistyped addresses go straight to the network.
 assert.equal(await sw.ask('easter-egg.html',{mode:'navigate'}),undefined);
 assert.equal(await sw.ask('nothing-here',{mode:'navigate'}),undefined);
});
test('a new worker clears out copies kept under an older name',async()=>{
 const sw=start();sw.stores.set('zephyr-guide-v0',new Map([['x',1]]));sw.stores.set('someone-elses-cache',new Map());
 await sw.lifecycle('install');await sw.lifecycle('activate');
 assert.deepEqual([...sw.stores.keys()].sort(),['someone-elses-cache','zephyr-guide-v1']);
});
test('the page registers the worker, and the worker sits beside the page so it covers the whole guide',()=>{
 assert.ok(fs.existsSync(new URL('sw.js',dist)));
 assert.match(fs.readFileSync(new URL('app.js',dist),'utf8'),/serviceWorker\.register\('sw\.js'\)/);
});
