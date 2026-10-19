import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculate,combinePlan,planDuration,validateData} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const recipes=read('business.json'),guide=read('guide.json');
test('business data preserves source recipe quantities and assumed timing',()=>{assert.equal(validateData(guide,recipes),true);assert.deepEqual(recipes.map(r=>r.ingredients.map(i=>[i.itemId,i.quantity])),[[['copper',1],['iron',1],['steel',1],['metal-scrap',2]],[['steel',2],['iron',2],['copper',2],['metal-scrap',4]],[['metal-scrap',2]]]);for(const r of recipes){assert.equal(r.outputQuantity,1);assert.equal(r.craftTimeSeconds,10);}});
test('mixed order combines shared materials and sequential duration',()=>{const order=recipes.map((r,i)=>({recipeId:r.id,quantity:[8,5,10][i]}));const totals=Object.fromEntries(combinePlan(recipes,order).map(r=>[r.itemId,r.quantity]));assert.deepEqual(totals,{copper:18,iron:18,steel:18,'metal-scrap':56});assert.equal(planDuration(recipes,order).totalSeconds,230);assert.equal(calculate(recipes[0],8).output,8);});
