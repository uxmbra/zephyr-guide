import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {priceList,formatPrice,validateData,resolveRoute,searchGuide,EXTRA_PAGES,SECTION_NOTES,PRICE_MONEY,PRICE_CATEGORIES} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
// The live data with a few example player prices added, so the tests do not depend on which prices are known today.
const withPrices=playerPrices=>({...guide,playerPrices});
const examples=[
 {itemId:'steel',clean:[40,60],dirty:35,notes:'Bought in stacks of 100',updated:'2026-11-23'},
 {itemId:'copper',clean:200},
 {recipeId:'weapon-vector',dirty:15000},
 {recipeId:'ammo-9mm',clean:3,unit:'per round'},
 {id:'vector-blueprint',name:'Vector BP',category:'blueprints',dirty:[50000,60000]},
 {id:'fresh-cocaine-brick',name:'Fresh Cocaine Brick',category:'drugs',dirty:900,unit:'per brick'},
];
test('prices come in clean and dirty money, split into five categories',()=>{
 assert.deepEqual(PRICE_MONEY,{clean:'Clean',dirty:'Dirty'});
 assert.deepEqual(Object.values(PRICE_CATEGORIES),['Materials','Guns','Ammo','BP’s','Drugs']);
});
test('the live player prices are valid and the page has addresses and a home card',()=>{
 assert.equal(validateData(guide,recipes),true);
 assert.ok(Array.isArray(guide.playerPrices),'guide.json keeps a playerPrices list, even when it is empty');
 assert.equal(EXTRA_PAGES.prices,'Player prices');
 assert.ok(SECTION_NOTES.prices);
 assert.deepEqual(resolveRoute('#prices',guide,recipes),{category:'prices'});
 assert.deepEqual(resolveRoute('#prices/dirty',guide,recipes),{category:'prices',money:'dirty'});
 assert.deepEqual(resolveRoute('#prices/nothing-here',guide,recipes),{category:'prices'});
});
test('every material with a city sell price is listed under clean, waiting for a player price',()=>{
 const g={...guide,playerPrices:[]},rows=priceList(g,recipes,'clean'),sold=guide.items.filter(i=>i.sellPrice!==undefined);
 assert.equal(rows.length,sold.length);
 for(const item of sold){const row=rows.find(r=>r.key===item.id);assert.equal(row.sellPrice,item.sellPrice);assert.equal(row.low,null);assert.equal(row.category,'materials');assert.equal(formatPrice(row),'');}
 assert.deepEqual(priceList(g,recipes,'dirty'),[]);
});
test('each entry is listed under the money it has a price in, in the right category',()=>{
 const g=withPrices(examples),clean=priceList(g,recipes,'clean'),dirty=priceList(g,recipes,'dirty'),get=(rows,key)=>rows.find(r=>r.key===key);
 assert.equal(validateData(g,recipes),true);
 assert.deepEqual([formatPrice(get(clean,'steel')),formatPrice(get(dirty,'steel'))],['$40–$60','$35']);
 assert.equal(get(clean,'steel').hash,'#materials/steel');
 assert.equal(get(clean,'copper').sellPrice,180,'the city sell price sits beside the clean price');
 assert.equal(get(dirty,'steel').sellPrice,undefined,'the city pays clean money, so dirty prices have no sell price beside them');
 assert.equal(get(dirty,'copper'),undefined,'an entry with only a clean price is not in the dirty list');
 assert.equal(clean.filter(r=>r.key==='copper').length,1,'a material is not listed twice');
 assert.deepEqual([get(dirty,'weapon-vector').name,get(dirty,'weapon-vector').category,get(dirty,'weapon-vector').hash],['Vector','guns','#weapons/weapon-vector']);
 assert.deepEqual([get(clean,'ammo-9mm').category,get(clean,'ammo-9mm').unit],['ammo','per round']);
 assert.deepEqual([get(dirty,'vector-blueprint').category,get(dirty,'vector-blueprint').hash],['blueprints','']);
 assert.equal(get(dirty,'fresh-cocaine-brick').category,'drugs');
 assert.deepEqual([...new Set(dirty.map(r=>r.category))],['materials','guns','blueprints','drugs'],'categories keep their order');
 assert.deepEqual(resolveRoute('#prices/dirty/steel',g,recipes),{category:'prices',money:'dirty',price:'steel'});
 assert.deepEqual(resolveRoute('#prices/steel',g,recipes),{category:'prices',money:'clean',price:'steel'});
 assert.deepEqual(resolveRoute('#prices/vector-blueprint',g,recipes),{category:'prices',money:'dirty',price:'vector-blueprint'});
 assert.deepEqual(resolveRoute('#prices/clean/vector-blueprint',g,recipes),{category:'prices',money:'clean'});
});
test('search finds clean and dirty prices after the material of the same name',()=>{
 const g=withPrices(examples),found=searchGuide('steel',g,recipes).map(r=>r.hash);
 assert.ok(found.indexOf('#prices/clean/steel')>found.indexOf('#materials/steel'));
 assert.ok(found.includes('#prices/dirty/steel'));
 assert.match(searchGuide('cocaine brick',g,recipes).find(r=>r.hash==='#prices/dirty/fresh-cocaine-brick').detail,/^Dirty price · \$900 per brick$/);
 assert.equal(searchGuide('gold ore',g,recipes).some(r=>r.hash.startsWith('#prices/')),false,'a sell price alone is not a search result');
});
test('mistakes in player prices are caught with a clear message',()=>{
 const bad=(entry,message)=>assert.throws(()=>validateData(withPrices([entry]),recipes),message);
 bad({itemId:'unobtainium',clean:5},/unknown material/);
 bad({recipeId:'no-such-recipe',clean:5},/unknown recipe/);
 bad({recipeId:'smelting-steel',clean:5},/needs a category/);
 bad({itemId:'steel',recipeId:'weapon-vector',clean:5},/exactly one of/);
 bad({clean:5},/exactly one of/);
 bad({id:'mystery',category:'drugs',clean:5},/needs a name/);
 bad({id:'mystery',name:'Mystery',clean:5},/needs a category/);
 bad({itemId:'steel',category:'weapons',clean:5},/needs a category/);
 bad({itemId:'steel'},/clean price, a dirty price or both/);
 bad({itemId:'steel',price:5},/clean price, a dirty price or both/);
 bad({itemId:'steel',clean:12.5},/clean price in whole dollars/);
 bad({itemId:'steel',dirty:[60,40]},/dirty price in whole dollars/);
 bad({itemId:'steel',clean:'$50'},/whole dollars/);
 bad({itemId:'steel',clean:50,updated:'23/11/2026'},/YYYY-MM-DD/);
 bad({itemId:'steel',clean:50,cost:50},/unknown field/);
 assert.equal(validateData(withPrices([{recipeId:'smelting-steel',category:'materials',clean:5}]),recipes),true,'a category can be given for any crafted item');
 assert.throws(()=>validateData(withPrices([{itemId:'steel',clean:5},{itemId:'steel',dirty:6}]),recipes),/listed twice/);
 assert.throws(()=>validateData({...guide,playerPrices:{steel:5}},recipes),/must be a list/);
});
