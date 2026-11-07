import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateChangelog,unseenChanges,formatDate} from '../dist/core.js';
import {addChange} from '../scripts/add-change.mjs';
const changelog=JSON.parse(fs.readFileSync(new URL('../dist/data/changelog.json',import.meta.url)));
const entry=(id,date,title='Change')=>({id,date,title});
test('the published changelog is valid and newest first',()=>{
 assert.equal(validateChangelog(changelog),true);
 assert.ok(changelog.length>=3);
 assert.equal(changelog.at(-1).date,'2026-10-19');
});
test('broken changelogs are rejected with a reason',()=>{
 const bad=[
  {},
  [null],
  [entry('Bad ID','2026-11-07')],
  [entry('a','2026-11-07'),entry('a','2026-11-06')],
  [entry('a','2026-13-01')],
  [entry('a','2026-02-30')],
  [entry('a','7 Nov 2026')],
  [entry('a','2026-11-06'),entry('b','2026-11-07')],
  [entry('a','2026-11-07','  ')],
  [{...entry('a','2026-11-07'),notes:'one note'}],
  [{...entry('a','2026-11-07'),notes:['']}],
  [{...entry('a','2026-11-07'),extra:true}],
 ];
 for(const rows of bad)assert.throws(()=>validateChangelog(rows),JSON.stringify(rows));
 assert.equal(validateChangelog([]),true);
 assert.equal(validateChangelog([entry('a','2026-11-07'),entry('b','2026-11-07'),{...entry('c','2026-11-01'),notes:['A note.']}]),true);
});
test('unread count: last month for a new visitor, then everything above the entry last opened',()=>{
 const rows=[entry('d','2026-11-07'),entry('c','2026-11-05'),entry('b','2026-10-20'),entry('a','2026-09-01')];
 const today=new Date('2026-11-07T12:00:00Z');
 assert.equal(unseenChanges(rows,null,today),3);
 assert.equal(unseenChanges(rows,undefined,new Date('2027-01-01T00:00:00Z')),0);
 assert.equal(unseenChanges(rows,{id:'d',date:'2026-11-07'},today),0);
 assert.equal(unseenChanges(rows,{id:'c',date:'2026-11-05'},today),1);
 assert.equal(unseenChanges(rows,{id:'a',date:'2026-09-01'},today),3);
 assert.equal(unseenChanges(rows,{id:'gone',date:'2026-10-20'},today),2);
 assert.equal(unseenChanges(rows,{id:'gone'},today),4);
 assert.equal(unseenChanges([],null,today),0);
});
test('dates read naturally',()=>{assert.equal(formatDate('2026-11-07'),'7 Nov 2026');});
test('adding a change puts it first with a stable ID and skips a repeat of the same day',()=>{
 const rows=[entry('old','2026-10-01')],today=new Date('2026-11-07T23:30:00Z');
 const next=addChange(rows,'  Add the Cayo 12 Gauge recipe! ',['Costs 40 casings.',''],today);
 assert.equal(next.length,2);
 assert.deepEqual(next[0],{id:'2026-11-07-add-the-cayo-12-gauge-recipe',date:'2026-11-07',title:'Add the Cayo 12 Gauge recipe!',notes:['Costs 40 casings.']});
 assert.equal(validateChangelog(next),true);
 assert.equal(addChange(next,'Add the Cayo 12 Gauge recipe!',[],today),next);
 assert.equal(addChange(next,'Add the Cayo 12 Gauge recipe',[],today)[0].id,'2026-11-07-add-the-cayo-12-gauge-recipe-2');
 assert.throws(()=>addChange(rows,'   ',[],today));
 assert.equal(addChange(rows,'Fix',[],today)[0].notes,undefined);
});
