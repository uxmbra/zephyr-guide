import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dist=new URL('../dist/',import.meta.url);
const guide=JSON.parse(fs.readFileSync(new URL('data/guide.json',dist)));
const LIMIT=1.5*1024*1024;
// Every local image the guide points at, wherever it is referenced.
const referenced=[
 ...guide.locations.map(l=>l.mapImage),
 ...guide.benches.map(b=>b.image),
 ...Object.values(guide.substanceGuides||{}).flatMap(g=>(g.images||[]).map(i=>i.src)),
 ...Object.values(guide.gatheringGuides||{}).flatMap(g=>(g.images||[]).map(i=>i.src)),
 ...(guide.heistGuides||[]).flatMap(g=>(g.images||[]).map(i=>i.src)),
].filter(src=>src&&src.startsWith('images/'));
test('every referenced local image exists',()=>{
 assert.ok(referenced.length>10);
 for(const src of referenced)assert.ok(fs.existsSync(new URL(src,dist)),src+' is missing from dist/');
});
test('images are web-sized so the guide stays quick on a phone',()=>{
 for(const name of fs.readdirSync(new URL('images/',dist))){
  if(name.startsWith('.'))continue;
  const size=fs.statSync(new URL('images/'+name,dist)).size;
  assert.ok(size<=LIMIT,`${name} is ${(size/1024/1024).toFixed(1)} MB; convert it to WebP or shrink it to about 1600 px wide`);
 }
});
test('nothing in the images folder is left unused',()=>{
 const unused=fs.readdirSync(new URL('images/',dist)).filter(name=>!name.startsWith('.')&&!referenced.includes('images/'+name));
 assert.deepEqual(unused,[]);
});
