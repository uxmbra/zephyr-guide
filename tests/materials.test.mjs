import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {materialIndex,searchGuide,resolveRoute,EXTRA_PAGES} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
test('the materials index lists every item once, by name, with what makes it and what uses it',()=>{
 const index=materialIndex(guide,recipes);
 assert.equal(index.length,guide.items.length);
 assert.deepEqual(index.map(m=>m.name),[...index.map(m=>m.name)].sort((a,b)=>a.localeCompare(b,'en',{numeric:true})));
 const brass=index.find(m=>m.id==='brass');
 assert.deepEqual(brass.madeBy.map(r=>r.id),['smelting-brass']);
 assert.ok(brass.usedIn.some(u=>u.recipe.id==='ammo-9mm'&&u.quantity===60));
 for(const m of index){
  for(const u of m.usedIn)assert.equal(u.recipe.ingredients.find(i=>i.itemId===m.id).quantity,u.quantity);
  for(const r of m.madeBy)assert.equal(r.outputItemId,m.id);
 }
 assert.equal(index.reduce((sum,m)=>sum+m.usedIn.length,0),recipes.reduce((sum,r)=>sum+r.ingredients.length,0));
 const tiny=materialIndex({items:[{id:'b',name:'Bolt'},{id:'a',name:'Axle'}]},[{id:'r',ingredients:[{itemId:'b',quantity:2}],outputItemId:'a'}]);
 assert.deepEqual(tiny.map(m=>[m.id,m.madeBy.length,m.usedIn.length]),[['a',1,0],['b',0,1]]);
});
test('the Materials and Plan pages have addresses',()=>{
 assert.deepEqual(Object.keys(EXTRA_PAGES),['home','locations','materials','prices','plan']);
 assert.deepEqual(resolveRoute('#materials',guide,recipes),{category:'materials'});
 assert.deepEqual(resolveRoute('#materials/steel',guide,recipes),{category:'materials',material:'steel'});
 assert.deepEqual(resolveRoute('#materials/unobtainium',guide,recipes),{category:'materials'});
 assert.deepEqual(resolveRoute('#plan',guide,recipes),{category:'plan'});
 assert.deepEqual(resolveRoute('#plan/anything',guide,recipes),{category:'plan'});
 for(const id of Object.keys(EXTRA_PAGES))assert.equal(guide.categories.some(c=>c.id===id),false,id+' must not also be a category');
});
test('search finds materials, after recipes of the same name',()=>{
 const steel=searchGuide('steel',guide,recipes);
 assert.equal(steel[0].hash,'#smelting/smelting-steel');
 const material=steel.find(r=>r.hash==='#materials/steel');
 assert.match(material.detail,/^Material · used in \d+ recipes$/);
 assert.deepEqual(searchGuide('gun powder',guide,recipes).map(r=>r.hash),['#materials/gun-powder']);
});
test('search matches several words across a name and its detail line',()=>{
 assert.deepEqual(searchGuide('cayo 9mm',guide,recipes).map(r=>r.hash),['#ammo/ammo-cayo-9mm']);
 assert.deepEqual(searchGuide('  9MM   Cayo ',guide,recipes).map(r=>r.hash),['#ammo/ammo-cayo-9mm']);
 assert.deepEqual(searchGuide('tier 2 vector',guide,recipes).map(r=>r.hash),['#weapons/weapon-vector']);
 assert.deepEqual(searchGuide('cayo zzzz',guide,recipes),[]);
 // One word still matches names only, so a section name does not return every recipe in it.
 assert.equal(searchGuide('mainland',guide,recipes).some(r=>r.hash.startsWith('#ammo/ammo-')),false);
});
