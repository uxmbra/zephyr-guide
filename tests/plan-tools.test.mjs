import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {encodePlan,decodePlan,resolveRoute,expandPlan,combinePlan,planDuration,pinDetails,MAX_QUANTITY} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
const byId=id=>recipes.find(r=>r.id===id);

test('a plan survives the trip through a shared link',()=>{
 const plan=[{recipeId:'ammo-9mm',quantity:600},{recipeId:'weapon-vector',quantity:1},{recipeId:'smelting-brass',quantity:MAX_QUANTITY}];
 const text=encodePlan(plan);
 assert.equal(text,'ammo-9mm.600_weapon-vector.1_smelting-brass.1000000');
 assert.match(text,/^[a-z0-9._-]+$/,'the link must survive being pasted into a chat app');
 assert.deepEqual(decodePlan(text,recipes),plan);
 assert.deepEqual(resolveRoute('#plan/'+text,guide,recipes),{category:'plan',shared:plan});
 const everything=recipes.map(r=>({recipeId:r.id,quantity:r.outputQuantity}));
 assert.deepEqual(decodePlan(encodePlan(everything),recipes),everything);
 assert.equal(encodePlan([]),'');
});
test('a shared link keeps only real recipes with sensible amounts, once each',()=>{
 assert.deepEqual(decodePlan('ammo-9mm.60_made-up.5_ammo-9mm.999_weapon-vector.0_weapon-vector.-2_weapon-vector.1.5_weapon-vector.1000001_weapon-vector.3',recipes),[{recipeId:'ammo-9mm',quantity:60},{recipeId:'weapon-vector',quantity:3}]);
 for(const junk of ['','anything','ammo-9mm','ammo-9mm.','.60','ammo-9mm.6e2','ammo-9mm.060','AMMO-9MM.60','<script>.1',undefined,null])assert.deepEqual(decodePlan(junk,recipes),[],String(junk));
 assert.deepEqual(resolveRoute('#plan/made-up.5',guide,recipes),{category:'plan'});
 assert.deepEqual(resolveRoute('#plan',guide,recipes),{category:'plan'});
});

test('breaking a plan down replaces smelted metals with the ore to gather',()=>{
 const plan=[{recipeId:'ammo-9mm',quantity:600}],direct=combinePlan(recipes,plan);
 const brass=direct.find(t=>t.itemId==='brass').quantity,recipe=byId('smelting-brass');
 const {steps,materials}=expandPlan(recipes,plan);
 const step=steps.find(s=>s.itemId==='brass');
 assert.equal(step.recipe.id,'smelting-brass');
 assert.equal(step.quantity,brass);assert.equal(step.missing,brass);
 assert.equal(step.batches,Math.ceil(brass/recipe.outputQuantity));
 assert.equal(step.output,step.batches*recipe.outputQuantity);
 assert.ok(step.output>=brass);
 assert.equal(materials.some(t=>t.itemId==='brass'),false,'a metal that is smelted is not also listed to gather');
 for(const i of recipe.ingredients)assert.ok(materials.find(t=>t.itemId===i.itemId).quantity>=i.quantity*step.batches,i.itemId);
 // Everything that is not smelted is untouched.
 for(const t of direct.filter(t=>!steps.some(s=>s.itemId===t.itemId)))assert.ok(materials.find(m=>m.itemId===t.itemId).quantity>=t.quantity,t.itemId);
});
test('a metal made from another metal is worked out in order',()=>{
 const tiny=[
  {id:'gun',outputQuantity:1,craftTimeSeconds:10,ingredients:[{itemId:'steel',quantity:3},{itemId:'iron',quantity:2},{itemId:'spring',quantity:1}]},
  {id:'make-steel',outputItemId:'steel',outputQuantity:1,craftTimeSeconds:null,ingredients:[{itemId:'iron',quantity:5},{itemId:'carbon',quantity:30}]},
  {id:'make-steel-scrap',outputItemId:'steel',outputQuantity:18,craftTimeSeconds:20,ingredients:[{itemId:'coal',quantity:5},{itemId:'scrap',quantity:10}]},
  {id:'make-iron',outputItemId:'iron',outputQuantity:18,craftTimeSeconds:15,ingredients:[{itemId:'coal',quantity:10},{itemId:'iron-ore',quantity:5}]},
 ],plan=[{recipeId:'gun',quantity:2}];
 const view=expandPlan(tiny,plan);
 // 2 guns need 6 steel and 4 iron; 6 steel needs 30 more iron; 34 iron is 2 smelts of 18.
 assert.deepEqual(view.steps.map(s=>[s.itemId,s.quantity,s.batches,s.output,s.totalTimeSeconds,s.options.length]),[['steel',6,6,6,null,2],['iron',34,2,36,30,1]]);
 assert.deepEqual(view.materials.map(t=>[t.itemId,t.quantity]),[['spring',2],['carbon',180],['coal',20],['iron-ore',10]]);
 // Choosing the other way to make steel changes what is gathered, and iron is then only needed for the guns.
 const scrap=expandPlan(tiny,plan,{},{steel:'make-steel-scrap'});
 assert.deepEqual(scrap.steps.map(s=>[s.itemId,s.recipe.id,s.quantity,s.batches,s.output]),[['steel','make-steel-scrap',6,1,18],['iron','make-iron',4,1,18]]);
 assert.deepEqual(scrap.materials.map(t=>[t.itemId,t.quantity]),[['spring',2],['coal',15],['scrap',10],['iron-ore',5]]);
 // An unknown choice falls back to the first recipe.
 assert.deepEqual(expandPlan(tiny,plan,{},{steel:'nope'}),view);
 // The time for the plan includes the smelting, and says so when a step has no time yet.
 assert.deepEqual(planDuration(tiny,plan,scrap.steps),{knownSeconds:20+20+15,unknownRecipes:0,totalSeconds:55});
 assert.deepEqual(planDuration(tiny,plan,view.steps),{knownSeconds:20+30,unknownRecipes:1,totalSeconds:null});
 assert.deepEqual(planDuration(tiny,plan),{knownSeconds:20,unknownRecipes:0,totalSeconds:20});
});
test('what the player already has reduces the smelting, and the list keeps its rows',()=>{
 const plan=[{recipeId:'ammo-9mm',quantity:600},{recipeId:'weapon-vector',quantity:1}];
 const none=expandPlan(recipes,plan),all=expandPlan(recipes,plan,Object.fromEntries(none.steps.map(s=>[s.itemId,s.quantity])));
 // Having every metal means nothing is smelted and no ore is needed, but every row is still there to type into.
 assert.deepEqual(all.steps.map(s=>s.itemId),none.steps.map(s=>s.itemId));
 assert.deepEqual(all.materials.map(t=>t.itemId),none.materials.map(t=>t.itemId));
 assert.ok(all.steps.every(s=>s.batches===0&&s.output===0&&s.missing===0&&s.totalTimeSeconds===0));
 for(const item of ['zinc-ore','copper-ore','coal-ore'])assert.equal(all.materials.find(t=>t.itemId===item).quantity,0,item);
 // Having part of a metal smelts only the rest, rounded up to full smelts.
 const brass=none.steps.find(s=>s.itemId==='brass'),some=expandPlan(recipes,plan,{brass:brass.quantity-1}).steps.find(s=>s.itemId==='brass');
 assert.deepEqual([some.owned,some.missing,some.batches,some.output],[brass.quantity-1,1,1,byId('smelting-brass').outputQuantity]);
 // Ore the player has is reported against what is needed.
 const zinc=expandPlan(recipes,plan,{'zinc-ore':100}).materials.find(t=>t.itemId==='zinc-ore');
 assert.equal(zinc.owned,100);assert.equal(zinc.missing,zinc.quantity-100);
});
test('recipes that make each other do not hang the breakdown',()=>{
 const loop=[
  {id:'thing',outputQuantity:1,craftTimeSeconds:1,ingredients:[{itemId:'a',quantity:1}]},
  {id:'make-a',outputItemId:'a',outputQuantity:1,craftTimeSeconds:1,ingredients:[{itemId:'b',quantity:1}]},
  {id:'make-b',outputItemId:'b',outputQuantity:1,craftTimeSeconds:1,ingredients:[{itemId:'a',quantity:1}]},
 ];
 const view=expandPlan(loop,[{recipeId:'thing',quantity:1}]);
 assert.deepEqual(view.steps,[]);
 assert.deepEqual(view.materials.map(t=>[t.itemId,t.quantity]),[['a',1],['b',0]]);
});
test('a plan with nothing to smelt comes back unchanged',()=>{
 const recipe=recipes.find(r=>!r.ingredients.some(i=>recipes.some(o=>o.outputItemId===i.itemId))),plan=[{recipeId:recipe.id,quantity:recipe.outputQuantity}];
 assert.deepEqual(expandPlan(recipes,plan,{}),{steps:[],materials:combinePlan(recipes,plan,{})});
});

test('recipes, written guides and materials can be pinned; other pages cannot',()=>{
 assert.deepEqual(pinDetails('#ammo/ammo-cayo-9mm',guide,recipes),{hash:'#ammo/ammo-cayo-9mm',label:'9mm',detail:'Ammo Crafting · Cayo'});
 assert.deepEqual(pinDetails('#weapons/weapon-vector',guide,recipes),{hash:'#weapons/weapon-vector',label:'Vector',detail:'Weapon Crafting · Tier 2'});
 assert.deepEqual(pinDetails('#materials/steel',guide,recipes),{hash:'#materials/steel',label:'Steel',detail:'Material'});
 assert.deepEqual(pinDetails('#substances/cocaine',guide,recipes),{hash:'#substances/cocaine',label:'Cocaine',detail:'Substance guide'});
 assert.deepEqual(pinDetails('#gathering/scrap-yard',guide,recipes),{hash:'#gathering/scrap-yard',label:'Scrap Yard',detail:'Gathering guide'});
 assert.deepEqual(pinDetails('#heist-guides/fleeca',{...guide,heistGuides:[{id:'fleeca',name:'Fleeca'}]},recipes),{hash:'#heist-guides/fleeca',label:'Fleeca',detail:'Heist guide'});
 const business=recipes.find(r=>r.categoryId==='business');
 for(const hash of ['','#ammo','#plan','#plan/ammo-9mm.60','#locations','#locations/smelter-174','#materials','#weapons/tier-2','#ammo/cayo','#business/'+business.id,'#ammo/removed-recipe','#materials/removed'])assert.equal(pinDetails(hash,guide,recipes),null,hash);
 // Every recipe outside Business can be pinned, and its pin leads back to it.
 for(const r of recipes.filter(r=>r.categoryId!=='business')){const pin=pinDetails('#'+r.categoryId+'/'+r.id,guide,recipes);assert.equal(resolveRoute(pin.hash,guide,recipes).recipeId,r.id);}
});
