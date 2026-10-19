import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuideServer} from '../server.mjs';
test('server serves assets and handles errors without exposing project files',async()=>{
  const server=createGuideServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/Zephyr RP/);assert.equal(home.headers.get('cache-control'),'no-store');
    const data=await fetch(base+'/data/guide.json');assert.equal(data.status,200);assert.ok((await data.json()).categories.length);
    const img=await fetch(base+'/images/mainland-938-map.png',{method:'HEAD'});assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/png');assert.ok(Number(img.headers.get('content-length'))>0);assert.equal(await img.text(),'');
    for(const target of ['/README.md','/server.mjs','/missing.png'])assert.equal((await fetch(base+target)).status,404);
    assert.equal((await fetch(base+'/.openai/hosting.json')).status,403);
    assert.equal((await fetch(base+'/%2e%2e%5cREADME.md')).status,403);
    assert.equal((await fetch(base+'/%ZZ')).status,400);
    assert.equal((await fetch(base,{method:'POST'})).status,405);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
