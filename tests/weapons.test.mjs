import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData,calculate,combinePlan,planDuration} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),weapons=read('weapons.json');
test('seven tier 3 recipes have valid references, single output and observed 90 second time',()=>{
 assert.equal(validateData(guide,weapons),true);
 assert.deepEqual(weapons.map(r=>[r.name,r.tier,r.outputQuantity,r.craftTimeSeconds]),['XM7','PPSH41','Famas','SCAR-L Black','AK47','Assault Rifle','Special Carbine'].map(name=>[name,3,1,90]));
 for(const tier of [undefined,null,0,4,'3'])assert.throws(()=>validateData(guide,[{...weapons[0],tier}]));
 for(const tier of [1,2,3])assert.equal(validateData(guide,[{...weapons[0],tier}]),true);
});
test('weapon quantities preserve gold exclusions, assault costs and distinct blueprints',()=>{
 assert.deepEqual(weapons.map(r=>r.ingredients.map(i=>i.quantity)),[[1,220,185,100,135,25,8],[1,220,185,100,135,20,4],[1,220,185,100,135,20,4],[1,220,185,100,135,4],[1,220,185,100,135,4],[1,280,235,120,165,4],[1,220,185,100,135,20,4]]);
 assert.equal(new Set(weapons.map(r=>r.ingredients[0].itemId)).size,7);
 assert.deepEqual(weapons.filter(r=>r.ingredients.some(i=>i.itemId==='gold-ingot')).map(r=>r.name),['XM7','PPSH41','Famas','Special Carbine']);
});
test('multi-weapon plans aggregate common materials and multiply time',()=>{
 const xm7=weapons[0],ak47=weapons[4],plan=[{recipeId:xm7.id,quantity:2},{recipeId:ak47.id,quantity:1}];
 assert.equal(calculate(xm7,2).totalTimeSeconds,180);
 const totals=combinePlan(weapons,plan);
 assert.equal(totals.find(i=>i.itemId==='iron').quantity,660);
 assert.equal(totals.find(i=>i.itemId==='gold-ingot').quantity,50);
 assert.equal(totals.find(i=>i.itemId==='zephyr-lubricant-spray').quantity,20);
 assert.equal(totals.find(i=>i.itemId==='xm7-blueprint').quantity,2);
 assert.equal(planDuration(weapons,plan).totalSeconds,270);
});
