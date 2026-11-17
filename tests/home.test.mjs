import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeSections,SECTION_NOTES,EXTRA_PAGES,resolveRoute,pinDetails} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
test('the home page is where a visitor lands without an address',()=>{
 assert.equal(EXTRA_PAGES.home,'Home');
 for(const hash of ['','#','#home','#no-such-page'])assert.deepEqual(resolveRoute(hash,guide,recipes),{category:'home'},hash);
 assert.equal(guide.categories.some(c=>c.id==='home'),false,'home must not also be a category');
 assert.equal(pinDetails('#home',guide,recipes),null);
 assert.match(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),/<a class="brand" href="#home"/,'the logo leads home');
});
test('the home page has a card for every section, once, each with a line about it',()=>{
 const groups=homeSections(guide),ids=groups.flatMap(g=>g.ids);
 assert.deepEqual([...ids].sort(),[...guide.categories.map(c=>c.id),'locations','materials'].sort());
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ids)assert.ok(SECTION_NOTES[id]?.trim(),`Add a line about "${id}" to SECTION_NOTES in dist/core.js so its home page card says what it is.`);
 for(const group of groups){assert.ok(group.title&&group.note);assert.ok(group.ids.length);}
 assert.deepEqual(groups.map(g=>g.title),['Crafting','Guides','Reference']);
});
test('a category the home page has not heard of still gets a card, and missing ones leave no gap',()=>{
 const extra=homeSections({categories:[...guide.categories,{id:'fishing',name:'Fishing'}]});
 assert.equal(extra[0].ids.at(-1),'fishing');
 const few=homeSections({categories:[{id:'ammo',name:'Ammo'}]});
 assert.deepEqual(few.map(g=>[g.title,g.ids]),[['Crafting',['ammo']],['Reference',['locations','materials']]]);
});
