import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData,calculate,combinePlan,planDuration} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),melee=read('melee.json');
test('eight melee recipes are valid, single output and use the postal 906 pier bench',()=>{
 assert.equal(validateData(guide,melee),true);
 assert.deepEqual(melee.map(r=>r.name),['Baseball Bat','Marshmallow Stick','Knife','Brass Knuckles','Karambit','Katana','Sledgehammer','Pink Electric Guitar']);
 assert.ok(melee.every(r=>r.categoryId==='melee'&&r.outputQuantity===1&&r.benchId==='melee-906'));
 const bench=guide.benches.find(b=>b.id==='melee-906'),loc=guide.locations.find(l=>l.id===bench.locationId);
 assert.equal(loc.postcode,'906');
 assert.ok(fs.existsSync(new URL('../dist/'+loc.mapImage,import.meta.url)));
});
test('melee quantities match the supplied recipes',()=>{
 assert.deepEqual(melee.map(r=>r.ingredients.map(i=>i.quantity)),[[1,1],[1,75,1,20],[1,1,1],[200,150],[1,75,60,20,65],[1,100,85,30,95],[100,125,60,125],[1,75,6,20]]);
 const items=new Set(guide.items.map(i=>i.id));
 assert.ok(melee.every(r=>r.ingredients.every(i=>items.has(i.itemId))));
});
test('every melee item takes 15 seconds per craft',()=>{
 assert.ok(melee.every(r=>r.craftTimeSeconds===15&&!guide.pendingCraftTimeRecipeIds.includes(r.id)));
 assert.equal(calculate(melee[0],3).totalTimeSeconds,45);
 assert.equal(planDuration(melee,[{recipeId:'melee-katana',quantity:2},{recipeId:'melee-knife',quantity:4}]).totalSeconds,90);
 const totals=combinePlan(melee,[{recipeId:'melee-katana',quantity:2},{recipeId:'melee-sledgehammer',quantity:1}]);
 assert.equal(totals.find(i=>i.itemId==='steel').quantity,295);
 assert.equal(totals.find(i=>i.itemId==='katana-blueprint').quantity,2);
});
