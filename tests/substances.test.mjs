import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json');
const withImages=images=>({...guide,substanceGuides:{...guide.substanceGuides,cocaine:{...guide.substanceGuides.cocaine,images}}});
test('cocaine guide has every section and its images exist',()=>{
 assert.equal(validateData(guide,[]),true);
 const cocaine=guide.substanceGuides.cocaine;
 for(const key of ['overview','requirements','locations','steps','tips'])assert.ok(cocaine[key].trim(),key);
 assert.equal(cocaine.steps.split('\n').length,8);
 for(const image of cocaine.images)assert.ok(fs.existsSync(new URL('../dist/'+image.src,import.meta.url)),image.src);
});
test('substance guide images must be safe paths',()=>{
 for(const images of ['images/a.webp',[{}],[{src:'http://example.com/a.png'}],[{src:'../a.png'}],[{src:'images/a.webp',title:3}]])assert.throws(()=>validateData(withImages(images),[]));
 assert.equal(validateData(withImages([{src:'images/a.webp',title:'A'}]),[]),true);
});
