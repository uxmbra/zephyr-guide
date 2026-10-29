import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculate,validateData,planDuration,formatDuration} from '../dist/core.js';
const load=async name=>JSON.parse(await readFile(new URL('../dist/data/'+name,import.meta.url)));
const guide=await load('guide.json'),ammo=await load('ammo.json'),smelting=await load('smelting.json');
test('six mainland ammo durations match supplied times',()=>assert.deepEqual(ammo.filter(r=>r.method==='mainland').map(r=>r.craftTimeSeconds),[30,60,60,20,30,30]));
test('duration counts complete batches, not individual items',()=>{assert.equal(calculate(ammo[3],61).totalTimeSeconds,40);assert.equal(calculate(ammo[1],21).totalTimeSeconds,120);assert.equal(calculate(ammo[0],1).totalTimeSeconds,30);});
test('unknown durations never appear as a zero estimate',()=>{const pending=smelting.find(r=>r.id==='smelting-iron-trash');assert.equal(calculate(pending,13).totalTimeSeconds,null);assert.equal(formatDuration(null),'Not supplied');const p=planDuration([...ammo,...smelting],[{recipeId:ammo[0].id,quantity:61},{recipeId:pending.id,quantity:12}]);assert.deepEqual(p,{knownSeconds:60,unknownRecipes:1,totalSeconds:null});});
test('known plan times sum full crafts across recipes',()=>assert.deepEqual(planDuration(ammo,[{recipeId:ammo[0].id,quantity:61},{recipeId:ammo[3].id,quantity:60}]),{knownSeconds:80,unknownRecipes:0,totalSeconds:80}));
test('new recipe durations are mandatory and validated',()=>{for(const value of [undefined,null,0,-1,1.5,86401,'30']){const r={...ammo[0],id:'new-recipe',craftTimeSeconds:value};assert.throws(()=>validateData(guide,[r]));}assert.equal(validateData(guide,[{...ammo[0],id:'new-recipe',craftTimeSeconds:30}]),true);});
test('all 11 smelting formulas preserve supplied inputs and outputs',()=>{assert.deepEqual(smelting.map(r=>[r.outputName,r.outputQuantity,r.ingredients.map(i=>[i.itemId,i.quantity])]),[
 ['Copper Ingot',12,[['coal-ore',5],['copper-ore',5]]],['Iron Ingot',18,[['coal-ore',10],['iron-ore',5]]],['Iron',18,[['coal-ore',5],['iron-trash',10]]],['Silver Ingot',1,[['coal-ore',15],['silver-ore',5]]],['Gold Ingot',1,[['coal-ore',20],['gold-ore',5]]],['Steel',1,[['iron',5],['carbon',30]]],['Steel',18,[['coal-ore',5],['steel-trash',10]]],['Plastic',62,[['coal-ore',1],['bottle-caps',100]]],['Brass',12,[['zinc-ore',5],['copper-ore',10]]],['Silver',1,[['silver-fragments',20],['coal-ore',1]]],['Gold Ingot',1,[['gold-flakes',25],['coal-ore',1]]]
 ]);assert.equal(validateData(guide,[...ammo,...smelting]),true);});
test('smelting batches round materials up while alternate recipes remain distinct',()=>{assert.deepEqual(calculate(smelting[0],13).materials.map(i=>i.quantity),[10,10]);assert.equal(calculate(smelting[7],63).output,124);assert.notEqual(smelting[1].id,smelting[2].id);});
test('iron time per craft is derived from the supplied max run',()=>{const iron=smelting.find(r=>r.id==='smelting-iron');assert.equal(iron.craftTimeSeconds,Math.round(iron.maxRunTimeSeconds/iron.maxCraftsPerRun));assert.equal(iron.craftTimeSeconds,15);assert.ok(!guide.pendingCraftTimeRecipeIds.includes('smelting-iron'));});
test('duration formatting covers hours and minutes',()=>{assert.equal(formatDuration(60),'1m');assert.equal(formatDuration(3661),'1h 1m 1s');});
