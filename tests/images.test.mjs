import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {thumbFor} from '../dist/core.js';
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
// The photos themselves; the thumbs folder beside them holds their small copies.
const photos=()=>fs.readdirSync(new URL('images/',dist),{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.name.startsWith('.')).map(entry=>entry.name);
test('images are web-sized so the guide stays quick on a phone',()=>{
 for(const name of photos()){
  const size=fs.statSync(new URL('images/'+name,dist)).size;
  assert.ok(size<=LIMIT,`${name} is ${(size/1024/1024).toFixed(1)} MB; convert it to WebP or shrink it to about 1600 px wide`);
 }
});
test('nothing in the images folder is left unused',()=>{
 const unused=photos().filter(name=>!referenced.includes('images/'+name));
 assert.deepEqual(unused,[]);
});
test('a thumbnail address is worked out from the photo address',()=>{
 assert.equal(thumbFor('images/smelter-174-map.webp'),'images/thumbs/smelter-174-map.webp');
 assert.equal(thumbFor('images/Bench.PNG'),'images/thumbs/Bench.webp');
 assert.equal(thumbFor('images/thumbs/smelter-174-map.webp'),'images/thumbs/smelter-174-map.webp');
 // Pictures hosted elsewhere, and empty slots, are left alone.
 assert.equal(thumbFor('https://example.com/a.png'),'https://example.com/a.png');
 assert.equal(thumbFor(''),'');
 assert.equal(thumbFor(undefined),undefined);
});
test('every photo has a small copy for the page, and no small copy is left behind',()=>{
 const hint=' Run: python3 scripts/make-thumbs.py';
 for(const src of referenced){
  const thumb=new URL(thumbFor(src),dist);
  assert.ok(fs.existsSync(thumb),thumbFor(src)+' is missing.'+hint);
  assert.ok(fs.statSync(thumb).size<=fs.statSync(new URL(src,dist)).size,thumbFor(src)+' is bigger than the photo it stands in for.'+hint);
  assert.ok(fs.statSync(thumb).size<=200*1024,thumbFor(src)+' is over 200 KB.'+hint);
 }
 const wanted=referenced.map(thumbFor),extra=fs.readdirSync(new URL('images/thumbs/',dist)).filter(name=>!wanted.includes('images/thumbs/'+name));
 assert.deepEqual(extra,[],'thumbnails without a photo.'+hint);
});
