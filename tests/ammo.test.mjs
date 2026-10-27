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
 for(const method of [undefined,null,'','island','Mainland'])assert.throws(()=>validateData(guide,[{...ammo[0],method}]));
 for(const method of Object.keys(AMMO_METHODS))assert.equal(validateData(guide,[{...ammo[0],method}]),true);
});
