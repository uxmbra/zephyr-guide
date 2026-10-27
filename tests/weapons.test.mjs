import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData,calculate,combinePlan,planDuration} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),all=read('weapons.json'),weapons=all.filter(r=>r.tier===3),tier2=all.filter(r=>r.tier===2),tier1=all.filter(r=>r.tier===1);
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
test('seventeen tier 2 recipes share costs, skip silver only on the double barrel and take 90 seconds',()=>{
 assert.equal(validateData(guide,all),true);
 assert.equal(all.length,38);
 assert.deepEqual(tier2.map(r=>r.name),['Vector','Pump Shotgun','Double Barrel Shotgun','H2 SMG','Assault SMG','MP9','Pump Shotgun MK2','SMG','Heavy SMG','Combat PDW','Sawn Off Shotgun','MP5X','Bullpup SMG','SR-3M VVS','Machine Pistol','Tommygun Chrome','Sweeper Shotgun']);
 for(const r of tier2){
  assert.deepEqual([r.outputQuantity,r.craftTimeSeconds,r.benchId],[1,90,'weapons-tier-2']);
  const expected=[['iron',180],['steel',135],['rubber',60],['plastic',85],...(r.name==='Double Barrel Shotgun'?[]:[['silver-ingot',20]]),['zephyr-lubricant-spray',2]];
  assert.deepEqual(r.ingredients.slice(1).map(i=>[i.itemId,i.quantity]),expected);
  assert.equal(r.ingredients[0].quantity,1);
  assert.match(r.ingredients[0].itemId,/-blueprint$/);
 }
 assert.equal(new Set(all.map(r=>r.ingredients[0].itemId)).size,38);
 const bench=guide.benches.find(b=>b.id==='weapons-tier-2'),loc=guide.locations.find(l=>l.id===bench.locationId);
 assert.equal(loc.postcode,'54');
 for(const src of [loc.mapImage,bench.image])assert.ok(src&&fs.existsSync(new URL('../dist/'+src,import.meta.url)),src);
 assert.equal(guide.items.find(i=>i.id==='tommygun-chrome-blueprint')?.name,'Blueprint - Gusenberg');
});
test('fourteen tier 1 pistols use one of three carbon fiber cost sizes and one lubricant',()=>{
 assert.equal(validateData(guide,all),true);
 assert.deepEqual(tier1.map(r=>r.name),['Ruger 57','Musket','Marksmen Pistol','Glock 19X Green','Pistol .50','Revolver','M270D Pistol','V17 Neutral','HKUS Pistol','Double Action Revolver','AP Pistol','Combat Pistol','Revolver MK2','FNX45']);
 const sizes={small:[70,70,70,35],medium:[140,130,130,70],large:[220,210,210,120]};
 const expected={'Ruger 57':'small','Glock 19X Green':'small','V17 Neutral':'small','Pistol .50':'medium','Revolver':'medium','Combat Pistol':'small','Revolver MK2':'medium','FNX45':'small'};
 for(const r of tier1){
  assert.deepEqual([r.outputQuantity,r.craftTimeSeconds,r.benchId],[1,90,'weapons-tier-1']);
  assert.deepEqual(r.ingredients.map(i=>i.itemId),[r.id.replace(/^weapon-/,'')+'-blueprint','iron','steel','rubber','carbon-fiber','zephyr-lubricant-spray']);
  assert.deepEqual(r.ingredients.map(i=>i.quantity),[1,...sizes[expected[r.name]||'large'],1]);
 }
 const bench=guide.benches.find(b=>b.id==='weapons-tier-1'),loc=guide.locations.find(l=>l.id===bench.locationId);
 assert.equal(loc.postcode,'817');
 assert.ok(fs.existsSync(new URL('../dist/'+bench.image,import.meta.url)));
 assert.ok(fs.existsSync(new URL('../dist/'+loc.mapImage,import.meta.url)));
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
