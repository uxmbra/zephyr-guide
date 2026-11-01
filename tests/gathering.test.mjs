import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json');
const withGathering=gatheringGuides=>({...guide,gatheringGuides});
test('metal detecting guide has its steps and its images exist',()=>{
 assert.equal(validateData(guide,[]),true);
 const metal=guide.gatheringGuides['metal-detecting'];
 for(const key of ['overview','requirements','locations','steps'])assert.ok(metal[key].trim(),key);
 assert.equal(metal.steps.split('\n').length,7);
 for(const image of metal.images)assert.ok(fs.existsSync(new URL('../dist/'+image.src,import.meta.url)),image.src);
});
test('gathering guides only use known methods and plain sections',()=>{
 for(const guides of [[],{'gold-panning':{}},{'scrap-yard':{steps:3}},{'scrap-yard':{extra:''}},{'scrap-yard':{images:[{src:'../a.png'}]}}])assert.throws(()=>validateData(withGathering(guides),[]));
 assert.equal(validateData(withGathering({'scrap-yard':{overview:'Bring a crowbar'}}),[]),true);
});
