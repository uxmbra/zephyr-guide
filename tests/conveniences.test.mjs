import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {searchGuide,typoDistance} from '../dist/core.js';
const dist=new URL('../dist/',import.meta.url);
const text=file=>fs.readFileSync(new URL(file,dist),'utf8');
const read=name=>JSON.parse(text('data/'+name));
const guide=read('guide.json'),recipes=guide.categories.flatMap(c=>read(c.file));
const find=(query,g=guide)=>searchGuide(query,g,recipes);
// A small guide to search inside, so these tests do not depend on what the real guides happen to say.
const written={...guide,gatheringGuides:{...guide.gatheringGuides,'bin-diving':{overview:'Search the green bins behind shops.',requirements:'',locations:'Best around postal 4455.',steps:'Walk up to a bin.\nPress E to rummage.',tips:'Sell the junk at the pawn shop.'}}};

test('search looks inside the written guides, after everything matched by name',()=>{
 const postal=find('4455',written);
 assert.deepEqual(postal.map(r=>r.hash),['#gathering/bin-diving']);
 assert.equal(postal[0].detail,'Gathering guide · mentions “4455”');
 // A name match always comes before a mention.
 const rummage=find('pawn',written);
 assert.equal(rummage.at(-1).hash,'#gathering/bin-diving');
 const bin=find('bin',written);
 assert.equal(bin[0].hash,'#gathering/bin-diving');
 assert.equal(bin[0].detail,'Gathering guide','a guide found by its name is not also labelled as a mention');
 // Several words may be spread through the guide.
 assert.equal(find('junk shops',written)[0].detail,'Gathering guide · mentions these words');
 assert.equal(find('Sell  the JUNK',written)[0].detail,'Gathering guide · mentions “Sell the JUNK”');
});
test('a mention has to start a word, and needs at least three letters',()=>{
 assert.deepEqual(find('ummage',written),[],'the middle of a word is not a mention');
 assert.equal(find('rumm',written).length,1);
 assert.equal(find('pr',written).some(r=>r.detail.includes('mentions')),false);
 assert.equal(find('zzzz qqqq',written).length,0);
});
test('typoDistance counts single-letter slips and gives up early',()=>{
 assert.equal(typoDistance('vector','vector'),0);
 assert.equal(typoDistance('vecter','vector'),1,'a wrong letter');
 assert.equal(typoDistance('vectr','vector'),1,'a missing letter');
 assert.equal(typoDistance('vecttor','vector'),1,'an extra letter');
 assert.equal(typoDistance('vetcor','vector'),1,'two letters swapped');
 assert.equal(typoDistance('suppresser','suppressor',2),1);
 assert.ok(typoDistance('brass','steel',1)>1);
 assert.ok(typoDistance('a','abcdef',2)>2);
});
test('search forgives a typo only when nothing matches properly',()=>{
 assert.equal(find('vecter')[0].hash,'#weapons/weapon-vector');
 assert.equal(find('vetcor')[0].hash,'#weapons/weapon-vector');
 assert.ok(find('cooper').some(r=>r.hash==='#materials/copper'));
 assert.deepEqual(find('gun podwer').map(r=>r.hash),['#materials/gun-powder']);
 assert.ok(find('suppresor').every(r=>/suppressor/i.test(r.label)));
 // A real match is never padded out with near misses.
 assert.ok(find('steel').every(r=>/steel/i.test(r.label)));
 // Short words, numbers and postcodes are taken as typed.
 assert.deepEqual(find('9nm'),[]);
 assert.deepEqual(find('175'),[]);
 assert.deepEqual(find('zzzz'),[]);
 assert.deepEqual(find('cayo zzzz'),[]);
 for(const r of find('vecter'))for(const key of ['label','detail','hash'])assert.equal(typeof r[key],'string');
});

// The page asks for the data before its scripts have arrived. This runs that exact piece of the page against a fake network.
const html=text('index.html'),app=text('app.js');
const headStart=html.match(/<script>\/\* Asks for the guide's data[^]*?\*\/([^]*?)<\/script>/)?.[1];
async function early(files){
 const asked=[];
 const window={};
 const fetch=async(url,options)=>{asked.push([url,options?.cache]);const body=files[url];if(body===undefined)throw new TypeError('Failed to fetch');return {ok:body!==404,json:async()=>JSON.parse(body)};};
 vm.runInNewContext(headStart,{window,fetch});
 const result=await window.guideData;
 return {asked,result,files:result?await Promise.all(result[1]):null};
}
test('the page starts fetching the guide data before the scripts arrive, and app.js picks it up',async()=>{
 assert.ok(headStart,'index.html should start the data request in its head');
 assert.ok(html.indexOf(headStart)<html.indexOf('<link rel="stylesheet"'),'it should come before the stylesheets so nothing holds it up');
 const {asked,result,files}=await early({'data/guide.json':'{"categories":[{"file":"a.json"},{"file":"b.json"}]}','data/a.json':'[1]','data/b.json':'[]'});
 assert.deepEqual(asked,[['data/guide.json','no-cache'],['data/a.json','no-cache'],['data/b.json','no-cache']]);
 assert.deepEqual(result[0].categories.length,2);
 assert.deepEqual(files,[[1],[]]);
 // app.js uses the head start once, then forgets it so Reload data fetches afresh.
 assert.match(app,/const started=window\.guideData;window\.guideData=null;/);
 assert.match(app,/\(earlyFiles&&await earlyFiles\[i\]\)\|\|fetchJson\(c\.file\)/);
});
test('a failed head start never throws: app.js is left to ask again and report the problem',async()=>{
 assert.equal((await early({})).result,null,'no connection');
 assert.equal((await early({'data/guide.json':404})).result,null,'missing file');
 assert.equal((await early({'data/guide.json':'{"categories":7}'})).result,null,'broken data');
 const partial=await early({'data/guide.json':'{"categories":[{"file":"a.json"},{"file":"gone.json"}]}','data/a.json':'[1]'});
 assert.deepEqual(partial.files,[[1],null],'a file that failed is null, which app.js fetches again');
});

test('Back, Forward and refresh can return to the same spot on the page',()=>{
 // Each stop in the tab's history is named in history.state. Rewriting the address with null would lose that name.
 assert.match(app,/history\.scrollRestoration='manual'/);
 assert.doesNotMatch(app,/replaceState\(null/,'pass history.state when rewriting the address, so the stop keeps its name');
 assert.match(app,/addEventListener\('pagehide'/,'positions are saved when the tab is left or refreshed');
});

test('the page shown for a wrong address leads back to the guide',()=>{
 const page=text('404.html'),site=html.match(/<meta property="og:url" content="([^"]+)"/)[1];
 assert.ok(page.includes(`var GUIDE='${site}'`),'404.html should send people to the address in og:url');
 assert.ok(page.includes(`<a href="${site}">`),'and offer the same link to anyone without scripts');
 // It is served for addresses of any depth, so a relative file would not be found.
 for(const [,url] of page.matchAll(/(?:href|src)="([^"]+)"/g))assert.match(url,/^https:\/\//,url+' must be a full address');
 assert.doesNotMatch(page,/<link|<script src|<img/);
 // The redirect keeps the last word as the section and can never loop on the guide's own address.
 const go=address=>{let to=null;const u=new URL(address);vm.runInNewContext(page.match(/<script>([^]*?)<\/script>/)[1],{location:{origin:u.origin,pathname:u.pathname,replace:x=>{to=x;}}});return to;};
 assert.equal(go(site+'smelting'),site+'#smelting');
 assert.equal(go(site+'Plan.html'),site+'#plan');
 assert.equal(go(site+'some/deep/heist-guides/'),site+'#heist-guides');
 assert.equal(go(site+'404.html'),site);
 assert.equal(go(site+'what%20is%20this'),site);
 assert.equal(go(site),null,'the guide’s own address is never redirected to itself');
});
