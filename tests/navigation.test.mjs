import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveRoute,searchGuide,GUIDE_SECTIONS,GUIDE_TEXT_FIELDS,esc,fmt} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
test('addresses resolve to a section, with an optional recipe, tier, method, guide or location',()=>{
 assert.deepEqual(resolveRoute('',guide,recipes),{category:'ammo'});
 assert.deepEqual(resolveRoute('#nonsense',guide,recipes),{category:'ammo'});
 assert.deepEqual(resolveRoute('#locations',guide,recipes),{category:'locations'});
 assert.deepEqual(resolveRoute('#ammo/ammo-cayo-9mm',guide,recipes),{category:'ammo',recipeId:'ammo-cayo-9mm',method:'cayo'});
 assert.deepEqual(resolveRoute('#weapons/weapon-vector',guide,recipes),{category:'weapons',recipeId:'weapon-vector',tier:2});
 assert.deepEqual(resolveRoute('#weapons/tier-3',guide,recipes),{category:'weapons',tier:3});
 assert.deepEqual(resolveRoute('#ammo/cayo',guide,recipes),{category:'ammo',method:'cayo'});
 assert.deepEqual(resolveRoute('#substances/cocaine',guide,recipes),{category:'substances',substance:'cocaine'});
 assert.deepEqual(resolveRoute('#gathering/scrap-yard',guide,recipes),{category:'gathering',gathering:'scrap-yard'});
 assert.deepEqual(resolveRoute('#locations/smelter-174',guide,recipes),{category:'locations',location:'smelter-174'});
 const withGuides={...guide,heistGuides:[{id:'fleeca',name:'Fleeca'}]};
 assert.deepEqual(resolveRoute('#heist-guides/fleeca',withGuides,recipes),{category:'heist-guides',heistGuide:'fleeca'});
});
test('unknown or mismatched selections fall back to the section alone',()=>{
 for(const hash of ['#weapons/tier-9','#weapons/ammo-9mm','#ammo/weapon-vector','#substances/tea','#gathering/fishing','#heist-guides/missing','#locations/nowhere','#business/anything'])assert.deepEqual(resolveRoute(hash,guide,recipes),{category:hash.slice(1).split('/')[0]},hash);
});
test('search ranks exact names first, then prefixes, then any match, and links each result',()=>{
 const brass=searchGuide('brass',guide,recipes);
 assert.equal(brass[0].label,'Brass');assert.equal(brass[0].hash,'#smelting/smelting-brass');assert.equal(brass[0].detail,'Smelting');
 assert.ok(brass.some(r=>r.label==='Brass Knuckles'));
 const nine=searchGuide('9MM',guide,recipes);
 assert.deepEqual(nine.map(r=>r.detail),['Ammo Crafting · Mainland','Ammo Crafting · Cayo']);
 assert.deepEqual(nine.map(r=>r.hash),['#ammo/ammo-9mm','#ammo/ammo-cayo-9mm']);
 assert.equal(searchGuide('gun',guide,recipes).some(r=>r.label==='Shotgun'),false);
 assert.ok(searchGuide('shot',guide,recipes).every(r=>/shot/i.test(r.label)));
 for(const r of searchGuide('a',guide,recipes))for(const key of ['label','detail','hash'])assert.equal(typeof r[key],'string');
 assert.ok(searchGuide('a',guide,recipes).length<=8);
 assert.equal(searchGuide('a',guide,recipes,3).length,3);
});
test('search finds guides, benches and postcodes',()=>{
 assert.deepEqual(searchGuide('cocaine',guide,recipes)[0],{label:'Cocaine',detail:'Substance guide',hash:'#substances/cocaine'});
 assert.deepEqual(searchGuide('scrap',guide,recipes)[0],{label:'Scrap Yard',detail:'Gathering guide',hash:'#gathering/scrap-yard'});
 assert.deepEqual(searchGuide('938',guide,recipes),[{label:'Ammo Crafting (Main Land)',detail:'Location · postcode 938',hash:'#locations/mainland-938'}]);
 assert.equal(searchGuide('smelter',guide,recipes).find(r=>r.hash==='#locations/smelter-174').detail,'Location · postcode 174');
 assert.deepEqual(searchGuide('',guide,recipes),[]);assert.deepEqual(searchGuide('   ',guide,recipes),[]);assert.deepEqual(searchGuide('zzzz',guide,recipes),[]);
});
test('guide chapters, escaping and number formatting are shared helpers',()=>{
 assert.deepEqual(GUIDE_TEXT_FIELDS,Object.keys(GUIDE_SECTIONS));
 assert.deepEqual(GUIDE_TEXT_FIELDS,['overview','requirements','locations','steps','tips']);
 assert.equal(esc(`<a href="x">Tom's & Jerry</a>`),'&lt;a href=&quot;x&quot;&gt;Tom&#39;s &amp; Jerry&lt;/a&gt;');
 assert.equal(esc(null),'');assert.equal(esc(undefined),'');assert.equal(esc(0),'0');
 assert.equal(fmt(1234567),'1,234,567');
});
