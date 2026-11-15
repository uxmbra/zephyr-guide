import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dist=new URL('../dist/',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,dist),'utf8');
const html=read('index.html');
const scripts=fs.readdirSync(dist).filter(name=>name.endsWith('.js'));
test('each stylesheet and script is named with one version number everywhere',()=>{
 // A browser treats core.js?v=1 and core.js?v=2 as different files, so a mismatch loads the file twice or serves a stale copy.
 const versions={};
 for(const [file,text] of [['index.html',html],...scripts.map(name=>[name,read(name)])])
  for(const [,name,version] of text.matchAll(/([a-z-]+\.(?:js|css))\?v=(\d+)/g))(versions[name]??=new Map()).set(file,version);
 for(const name of ['theme.css','business.css','app.js','core.js','business.js'])assert.ok(versions[name],name+' should be loaded with a ?v= number');
 for(const [name,uses] of Object.entries(versions)){
  assert.ok(fs.existsSync(new URL(name,dist)),name+' is referenced but missing');
  assert.equal(new Set(uses.values()).size,1,`${name} has different ?v= numbers: ${[...uses].map(([file,v])=>file+' says '+v).join(', ')}`);
 }
});
test('the page loads nothing from another site, and every local file it names exists',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 for(const [,url] of head.matchAll(/<(?:link|script)[^>]*?(?:href|src)="([^"]+)"/g)){
  if(url.startsWith('data:'))continue;
  assert.doesNotMatch(url,/^(https?:)?\/\//,'the page should not load '+url+' from another site');
  assert.ok(fs.existsSync(new URL(url.split('?')[0],dist)),url+' is missing from dist/');
 }
 for(const [,url] of read('theme.css').matchAll(/url\(([^)]+)\)/g))assert.ok(fs.existsSync(new URL(url,dist)),url+' is missing from dist/');
 assert.ok(fs.existsSync(new URL('fonts/OFL.txt',dist)),'the font licence must ship with the font');
});
test('the home-screen manifest is valid and its icons exist',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 for(const key of ['name','short_name','start_url','display','background_color','theme_color'])assert.equal(typeof manifest[key],'string',key);
 assert.ok(manifest.icons.some(i=>i.sizes==='192x192')&&manifest.icons.some(i=>i.sizes==='512x512'));
 for(const icon of manifest.icons){
  const file=fs.readFileSync(new URL(icon.src,dist));
  assert.equal(file.subarray(1,4).toString(),'PNG',icon.src);
  assert.equal(file.readUInt32BE(16)+'x'+file.readUInt32BE(20),icon.sizes,icon.src+' is not the size the manifest says');
 }
});
test('the link preview points at a real picture on the live site',()=>{
 const image=html.match(/<meta property="og:image" content="([^"]+)"/)[1],site=html.match(/<meta property="og:url" content="([^"]+)"/)[1];
 assert.match(site,/^https:\/\/.+\/$/);
 assert.ok(image.startsWith(site));
 const file=fs.readFileSync(new URL(image.slice(site.length),dist));
 assert.equal(file.readUInt16BE(0),0xffd8,'the preview should be a JPEG');
 assert.ok(file.length<300*1024,'keep the preview picture under 300 KB');
 for(const tag of ['og:title','og:description','og:type'])assert.match(html,new RegExp(`<meta property="${tag}" content="[^"]+">`));
});
