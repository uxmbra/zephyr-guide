import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {priceList,formatPrice,validateData,resolveRoute,searchGuide,EXTRA_PAGES,SECTION_NOTES} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
// The live data with a few example player prices added, so the tests do not depend on which prices are known today.
const withPrices=playerPrices=>({...guide,playerPrices});
const examples=[
 {itemId:'steel',price:[40,60],notes:'Bought in stacks of 100',updated:'2026-11-23'},
 {itemId:'copper',price:200},
 {recipeId:'weapon-vector',price:15000},
 {id:'fresh-cocaine-brick',name:'Fresh Cocaine Brick',group:'Substances',price:900,unit:'per brick'},
];
test('the live player prices are valid and the page has an address and a home card',()=>{
 assert.equal(validateData(guide,recipes),true);
 assert.ok(Array.isArray(guide.playerPrices),'guide.json keeps a playerPrices list, even when it is empty');
 assert.equal(EXTRA_PAGES.prices,'Player prices');
 assert.ok(SECTION_NOTES.prices);
 assert.deepEqual(resolveRoute('#prices',guide,recipes),{category:'prices'});
 assert.deepEqual(resolveRoute('#prices/nothing-here',guide,recipes),{category:'prices'});
});
test('every material with a sell price is listed, waiting for a player price',()=>{
 const rows=priceList({...guide,playerPrices:[]},recipes),sold=guide.items.filter(i=>i.sellPrice!==undefined);
 assert.equal(rows.length,sold.length);
 for(const item of sold){const row=rows.find(r=>r.key===item.id);assert.equal(row.sellPrice,item.sellPrice);assert.equal(row.low,null);assert.equal(row.group,'Materials');assert.equal(formatPrice(row),'');}
});
test('player prices name a material, a recipe or their own item, and are grouped and linked',()=>{
 const g=withPrices(examples),rows=priceList(g,recipes),get=key=>rows.find(r=>r.key===key);
 assert.equal(validateData(g,recipes),true);
 assert.deepEqual([get('steel').low,get('steel').high,formatPrice(get('steel'))],[40,60,'$40–$60']);
 assert.equal(get('steel').hash,'#materials/steel');
 assert.equal(formatPrice(get('copper')),'$200');
 assert.equal(get('copper').sellPrice,180,'the city sell price sits beside the player price');
 assert.equal(rows.filter(r=>r.key==='copper').length,1,'a material is not listed twice');
 assert.deepEqual([get('weapon-vector').name,get('weapon-vector').group,get('weapon-vector').hash],['Vector','Weapon Crafting','#weapons/weapon-vector']);
 assert.deepEqual([get('fresh-cocaine-brick').group,get('fresh-cocaine-brick').unit,get('fresh-cocaine-brick').hash],['Substances','per brick','']);
 assert.equal(get('steel').unit,'each');
 // Materials first, then the crafting categories in guide order, then anything else.
 const groups=[...new Set(rows.map(r=>r.group))];
 assert.deepEqual(groups,['Materials','Weapon Crafting','Substances']);
 assert.deepEqual(resolveRoute('#prices/steel',g,recipes),{category:'prices',price:'steel'});
 assert.deepEqual(resolveRoute('#prices/fresh-cocaine-brick',g,recipes),{category:'prices',price:'fresh-cocaine-brick'});
});
test('search finds a player price after the material of the same name',()=>{
 const g=withPrices(examples),found=searchGuide('steel',g,recipes).map(r=>r.hash);
 assert.ok(found.indexOf('#prices/steel')>found.indexOf('#materials/steel'));
 assert.match(searchGuide('cocaine brick',g,recipes).find(r=>r.hash==='#prices/fresh-cocaine-brick').detail,/^Player price · \$900 per brick$/);
 assert.equal(searchGuide('gold ore',g,recipes).some(r=>r.hash.startsWith('#prices/')),false,'a sell price alone is not a search result');
});
test('mistakes in player prices are caught with a clear message',()=>{
 const bad=(entry,message)=>assert.throws(()=>validateData(withPrices([entry]),recipes),message);
 bad({itemId:'unobtainium',price:5},/unknown material/);
 bad({recipeId:'no-such-recipe',price:5},/unknown recipe/);
 bad({itemId:'steel',recipeId:'weapon-vector',price:5},/exactly one of/);
 bad({price:5},/exactly one of/);
 bad({id:'mystery',price:5},/needs a name/);
 bad({itemId:'steel'},/whole dollars/);
 bad({itemId:'steel',price:12.5},/whole dollars/);
 bad({itemId:'steel',price:[60,40]},/whole dollars/);
 bad({itemId:'steel',price:'$50'},/whole dollars/);
 bad({itemId:'steel',price:50,updated:'23/11/2026'},/YYYY-MM-DD/);
 bad({itemId:'steel',price:50,cost:50},/unknown field/);
 assert.throws(()=>validateData(withPrices([{itemId:'steel',price:5},{itemId:'steel',price:6}]),recipes),/listed twice/);
 assert.throws(()=>validateData({...guide,playerPrices:{steel:5}},recipes),/must be a list/);
});
