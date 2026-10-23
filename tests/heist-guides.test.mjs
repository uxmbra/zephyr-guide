import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json');
const recipes=guide.categories.flatMap(c=>read(c.file));
const heistItem={id:'heist-drill',name:'Drill',categoryId:'heist',benchId:null,outputQuantity:1,craftTimeSeconds:60,ingredients:[{itemId:'steel',quantity:5}],notes:''};
const withGuides=heistGuides=>({...guide,heistGuides});
test('heist guides sit beside heist items and validate with the published recipes',()=>{
 const ids=guide.categories.map(c=>c.id);
 assert.equal(ids.indexOf('heist-guides')+1,ids.indexOf('heist'));
 assert.ok(Array.isArray(guide.heistGuides));
 assert.equal(validateData(guide,recipes),true);
 assert.equal(validateData(guide,[],{links:false}),true);
});
test('heist guides link only to heist item recipes',()=>{
 const linked=withGuides([{id:'bank',name:'Bank job',steps:'Drill the vault',itemIds:['heist-drill']}]);
 assert.equal(validateData(linked,[heistItem]),true);
 assert.throws(()=>validateData(linked,[]),/not a heist item recipe/);
 assert.throws(()=>validateData(linked,[{...heistItem,categoryId:'generic'}]),/not a heist item recipe/);
 assert.equal(validateData(linked,[],{links:false}),true);
});
test('heist guides need unique IDs, names and plain sections',()=>{
 for(const guides of [{},[{}],[{id:'Bank',name:'Bank'}],[{id:'bank',name:' '}],[{id:'bank',name:'A'},{id:'bank',name:'B'}],[{id:'bank',name:'Bank',steps:3}],[{id:'bank',name:'Bank',extra:''}],[{id:'bank',name:'Bank',itemIds:'heist-drill'}],[{id:'bank',name:'Bank',itemIds:['heist-drill','heist-drill']}],[{id:'bank',name:'Bank',images:[{src:'../a.png'}]}]])assert.throws(()=>validateData(withGuides(guides),[heistItem]));
 assert.equal(validateData(withGuides([{id:'bank',name:'Bank',overview:'',images:[{src:'images/a.webp',title:'Vault'}],itemIds:[]}]),[heistItem]),true);
});
