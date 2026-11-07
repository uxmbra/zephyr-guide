import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {THEMES,SYSTEM_THEME,resolveTheme} from '../dist/core.js';
const read=file=>fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
const css=read('theme.css'),html=read('index.html');
// A token block is a rule whose selectors are only :root and [data-theme=…]; each one must sit on its own line.
const TOKEN_BLOCK=/(?:^|\n)((?::root|\[data-theme=[a-z-]+\])(?:,(?::root|\[data-theme=[a-z-]+\]))*)\{([^}]*)\}/g;
const blocks=[...css.matchAll(TOKEN_BLOCK)].map(m=>({selectors:m[1].split(','),body:m[2]}));
const BASE=['bg','bg-glow','sidebar','panel','panel-2','raised','raised-2','field','media','line','line-strong','text','muted','faint','accent','accent-strong','ink','gold','danger','shade'];
test('every theme in the picker has a complete block of colours, and every block is in the picker',()=>{
 assert.equal(new Set(THEMES.map(t=>t.id)).size,THEMES.length);
 assert.equal(THEMES[0].id,'zephyr');
 for(const theme of THEMES){
  const block=blocks.find(b=>b.selectors.includes(`[data-theme=${theme.id}]`));
  assert.ok(block,`theme.css has no [data-theme=${theme.id}] block`);
  const tokens=new Set([...block.body.matchAll(/--([a-z0-9-]+):/g)].map(m=>m[1]));
  for(const t of BASE)assert.ok(tokens.has(t),`${theme.id} is missing --${t}`);
  assert.match(block.body,new RegExp(`color-scheme:${theme.scheme}(;|$)`),`${theme.id} should set color-scheme:${theme.scheme}`);
  assert.match(block.body,new RegExp(`--sidebar:${theme.color}(;|$)`),`${theme.id}'s browser colour should match its sidebar`);
  assert.ok(theme.name&&theme.note);
 }
 for(const b of blocks)for(const s of b.selectors)if(s!==':root')assert.ok(THEMES.some(t=>`[data-theme=${t.id}]`===s),`${s} is styled but not in THEMES`);
});
test('the stylesheets only use colours through theme variables',()=>{
 for(const file of ['theme.css','business.css']){
  const rest=read(file).replace(TOKEN_BLOCK,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/var\(--[a-z0-9-]+,[^)]*\)/g,'');
  assert.equal(rest.match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(|\b(?:white|black)\b(?!-)/gi),null,`${file} names a colour outside the theme blocks`);
 }
});
test('a saved choice resolves to a real theme',()=>{
 assert.equal(resolveTheme('nord'),'nord');
 assert.equal(resolveTheme('gone'),'zephyr');
 assert.equal(resolveTheme(null),'zephyr');
 assert.equal(resolveTheme(SYSTEM_THEME,true),'light');
 assert.equal(resolveTheme(SYSTEM_THEME,false),'zephyr');
 assert.equal(resolveTheme(SYSTEM_THEME),'zephyr');
});
test('the page applies the saved theme before it paints and starts on the default browser colour',()=>{
 const head=html.slice(0,html.indexOf('<link rel="stylesheet"'));
 assert.match(head,/<script>[^<]*localStorage\.getItem\('zephyr-theme'\)[^<]*dataset\.theme[^<]*<\/script>/);
 assert.match(head,/prefers-color-scheme:light/);
 assert.match(head,new RegExp(`<meta name="theme-color" content="${THEMES[0].color}">`));
 assert.match(head,/<meta name="color-scheme" content="dark light">/);
 assert.match(html,/id="theme-button"/);
 assert.match(html,/<dialog id="theme-dialog">[\s\S]*id="theme-options"/);
});
