import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateData,AMMO_METHODS} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),ammo=read('ammo.json');
test('ammo recipes are split into Mainland and Cayo crafting methods',()=>{
 assert.deepEqual(AMMO_METHODS,{mainland:'Mainland',cayo:'Cayo'});
 assert.equal(validateData(guide,ammo),true);
 assert.deepEqual(ammo.filter(r=>r.method==='mainland').map(r=>r.name),['9mm','.38 LC','.44 Magnum','5.56x45','.45 ACP','.50 AE']);
 assert.deepEqual(ammo.filter(r=>r.method==='cayo').map(r=>[r.name,r.outputQuantity,r.craftTimeSeconds,r.ingredients.map(i=>i.itemId+':'+i.quantity).join(',')]),[
  ['9mm',120,30,'bullet-casings:60,brass:60,gun-powder:60,copper:60'],
  ['.38 LC',40,60,'steel:20,brass:20,gun-powder:20,copper:20'],
  ['.44 Magnum',40,60,'steel:10,brass:10,gun-powder:10,copper:10'],
  ['5.56x45',120,20,'bullet-casings:60,brass:90,gun-powder:90,copper:90'],
  ['.45 ACP',120,30,'bullet-casings:60,brass:60,gun-powder:60,copper:60'],
  ['.50 AE',120,30,'bullet-casings:60,brass:60,gun-powder:60,copper:60'],
  ['12 Gauge',40,60,'steel:20,brass:20,gun-powder:20,copper:20']]);
 for(const method of [undefined,null,'','island','Mainland'])assert.throws(()=>validateData(guide,[{...ammo[0],method}]));
 for(const method of Object.keys(AMMO_METHODS))assert.equal(validateData(guide,[{...ammo[0],method}]),true);
});
