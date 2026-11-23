import {calculate,combinePlan,validateData,MAX_QUANTITY,formatDuration,planDuration,calculateAvailable,smelterRuns,SUBSTANCE_SECTIONS,GUIDE_SECTIONS,GUIDE_TEXT_FIELDS,AMMO_METHODS,GATHERING_METHODS,esc,fmt,resolveRoute,searchGuide,validateChangelog,unseenChanges,formatDate,THEMES,SYSTEM_THEME,resolveTheme,materialIndex,EXTRA_PAGES,encodePlan,expandPlan,pinDetails,thumbFor,SECTION_NOTES,homeSections} from './core.js?v=20';
import {renderBusiness,configureBusiness} from './business.js?v=13';
const $=s=>document.querySelector(s);
const SITE_TITLE='Zephyr City Field Guide';
const PLAN_KEY='zephyr-plan';
const CHANGELOG_KEY='zephyr-changelog-seen';
const THEME_KEY='zephyr-theme';
const PINS_KEY='zephyr-pins';
const OFFLINE_KEY='zephyr-offline-ready';
let changelog=[];
let guide,recipes=[],category='home',selectedId,quantity=60,plan=[],inventory={},editorTab='photos';
let smeltMode=(()=>{try{return localStorage.getItem('smeltMode')==='target'?'target':'available';}catch{return 'available';}})(),availableAmount=null,availableItemId='',availableCoal=null;
let weaponTier=3;
let ammoMethod='mainland';
let substanceSection='meth';
let heistGuideId;
let gatheringMethod='hobo-camps';
let materialId;
// A plan opened from someone's link, waiting for the visitor to choose what to do with it.
let sharedPlan=null;
// Whether the plan is broken down to raw materials, and which recipe to use for a material that has more than one.
let rawMode=false,methods={};
let pins=(()=>{try{const saved=JSON.parse(localStorage.getItem(PINS_KEY));return Array.isArray(saved)?saved.filter(hash=>typeof hash==='string').slice(0,60):[];}catch{return [];}})();
const EDITING=new URLSearchParams(location.search).has('edit');
const hasGuideText=entry=>GUIDE_TEXT_FIELDS.some(key=>entry?.[key]?.trim());
function renderGatheringMethods(){
  const host=$('#gathering-methods');host.hidden=category!=='gathering';
  if(host.hidden){host.innerHTML='';return;}
  host.innerHTML=`<p class="eyebrow">GATHERING METHOD</p><div class="tier-options gathering-options" role="group" aria-label="Gathering method">${Object.entries(GATHERING_METHODS).map(([id,name])=>`<button data-gathering="${id}" aria-pressed="${gatheringMethod===id}"><span>${name}</span><small>${hasGuideText(guide.gatheringGuides?.[id])?'Read guide':'Details coming soon'}</small></button>`).join('')}</div>`;
  host.querySelectorAll('[data-gathering]').forEach(b=>b.onclick=()=>{gatheringMethod=b.dataset.gathering;render();host.querySelector(`[data-gathering="${gatheringMethod}"]`).focus();});
}
// Gathering has no recipes, so it shows the chosen method without the calculator or crafting plan.
function renderGathering(){
  const entry=guide.gatheringGuides?.[gatheringMethod];
  if(hasGuideText(entry)){$('#content').innerHTML=`<article class="substance-guide"><header class="guide-intro"><p class="eyebrow">ZEPHYR RP · GATHERING GUIDE</p><h2>${esc(GATHERING_METHODS[gatheringMethod])}</h2><p class="muted">Your reference for this activity in the city.</p></header><div class="guide-chapters">${GUIDE_TEXT_FIELDS.map(key=>guideChapter(entry,key,'gathering')).join('')}</div></article>`;bindPhotos();return;}
  $('#content').innerHTML=`<div class="empty"><p class="eyebrow">THE GUIDE IS GROWING</p><h2>${esc(GATHERING_METHODS[gatheringMethod])}</h2><p class="muted">Locations, tools and yields for ${esc(GATHERING_METHODS[gatheringMethod])} have not been supplied yet.<br>Details will appear here as the guide expands.</p></div>`;
}
function renderSubstanceSections(){
  const host=$('#substance-sections');host.hidden=category!=='substances';
  if(host.hidden){host.innerHTML='';return;}
  host.innerHTML=`<p class="eyebrow">SUBSTANCE GUIDES</p><div class="tier-options substance-options" role="group" aria-label="Substance section">${Object.entries(SUBSTANCE_SECTIONS).map(([id,name])=>`<button data-substance="${id}" aria-pressed="${substanceSection===id}"><span>${name}</span><small>${hasGuideText(guide.substanceGuides?.[id])?'Read guide':'Details coming soon'}</small></button>`).join('')}</div>`;
  host.querySelectorAll('[data-substance]').forEach(b=>b.onclick=()=>{substanceSection=b.dataset.substance;selectedId=undefined;render();host.querySelector(`[data-substance="${substanceSection}"]`).focus();});
}
function renderAmmoMethods(){
  const host=$('#ammo-methods');host.hidden=category!=='ammo';
  if(host.hidden){host.innerHTML='';return;}
  host.innerHTML=`<p class="eyebrow">CRAFTING METHOD</p><div class="tier-options method-options" role="group" aria-label="Ammo crafting method">${Object.entries(AMMO_METHODS).map(([id,name])=>{const count=recipes.filter(r=>r.categoryId==='ammo'&&r.method===id).length;return `<button data-method="${id}" aria-pressed="${ammoMethod===id}"><span>${name}</span><small>${count?count+' recipes':'Recipes coming soon'}</small></button>`;}).join('')}</div>`;
  host.querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>{ammoMethod=b.dataset.method;selectedId=undefined;render();host.querySelector(`[data-method="${ammoMethod}"]`).focus();});
}
function renderWeaponTiers(){
  const host=$('#weapon-tiers');host.hidden=category!=='weapons';
  if(host.hidden){host.innerHTML='';return;}
  host.innerHTML=`<p class="eyebrow">WEAPON TIERS</p><div class="tier-options" role="group" aria-label="Weapon tier">${[1,2,3].map(t=>{const count=recipes.filter(r=>r.categoryId==='weapons'&&r.tier===t).length;return `<button data-tier="${t}" aria-pressed="${weaponTier===t}"><span>Tier ${t}</span><small>${count?count+' recipes':'Recipes coming soon'}</small></button>`;}).join('')}</div>`;
  host.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{weaponTier=Number(b.dataset.tier);selectedId=undefined;render();host.querySelector(`[data-tier="${weaponTier}"]`).focus();});
}
function renderSubstanceGuide(){
  const entry=guide.substanceGuides?.[substanceSection]||{};
  $('#page-title').textContent='Substance guides';$('#breadcrumb').textContent='GUIDES';
  $('#page-description').textContent='Explore the in-city process, what to bring and where to go.';
  $('#content').innerHTML=`<article class="substance-guide"><header class="guide-intro"><p class="eyebrow">ZEPHYR RP · CITY GUIDE</p><h2>${SUBSTANCE_SECTIONS[substanceSection]}</h2><p class="muted">${hasGuideText(entry)?'Your reference for this activity in the city.':'This guide is ready for your city-specific information.'}</p></header><div class="guide-chapters">${GUIDE_TEXT_FIELDS.map(key=>guideChapter(entry,key,'substance')).join('')}</div></article>`;bindPhotos();
}
function guideChapter(entry,key,prefix){const value=entry[key]||'';const lines=value.split('\n').map(s=>s.trim()).filter(Boolean);return `<section class="guide-chapter" id="${prefix}-${key}"><h3>${GUIDE_SECTIONS[key]}</h3>${lines.length?(key==='steps'?`<ol>${lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ol>`:key==='requirements'||key==='tips'?`<ul>${lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>`:lines.map(line=>`<p>${esc(line)}</p>`).join('')):'<p class="muted">Details have not been supplied yet.</p>'}${key==='locations'&&entry.images?.length?`<div class="photos guide-photos">${entry.images.map(image=>photo(image.src,image.alt,image.title||'',image.detail||'')).join('')}</div>`:''}</section>`;}
const heistGuides=()=>guide.heistGuides||[];
// Heist guides link to heist item recipes by ID; an item page lists every guide that uses any method for that item.
const guidesUsing=r=>heistGuides().filter(g=>(g.itemIds||[]).some(id=>{const linked=recipes.find(x=>x.id===id);return linked&&productName(linked)===productName(r);}));
// Links between guides and items are plain addresses, so the router selects the target and the back button works.
const heistItemLink=r=>`<a href="#heist/${esc(r.id)}" class="item-link">${esc(r.name)}</a>`;
const heistGuideLink=g=>`<a href="#heist-guides/${esc(g.id)}" class="item-link">${esc(g.name)}</a>`;
function renderHeistGuide(){
  const guides=heistGuides();
  $('#breadcrumb').textContent='GUIDES';
  $('#page-description').textContent='Plan the job: what to bring, where to go and which heist items to craft.';
  if(!guides.length){$('#content').innerHTML=`<div class="empty"><p class="eyebrow">THE GUIDE IS GROWING</p><h2>Heist guides</h2><p class="muted">No heist guides have been supplied yet.<br>Each guide will link to the heist items it needs, and each item will link back to its guides.</p></div>`;return;}
  if(!guides.some(g=>g.id===heistGuideId))heistGuideId=guides[0].id;
  const entry=guides.find(g=>g.id===heistGuideId),items=(entry.itemIds||[]).map(id=>recipes.find(r=>r.id===id)).filter(Boolean);
  const itemsChapter=`<section class="guide-chapter" id="heist-guide-items"><h3>Heist items used</h3>${items.length?`<ul class="item-links">${items.map(r=>`<li>${heistItemLink(r)}<small>${esc(r.ingredients.map(i=>itemName(i.itemId)).join(' + '))}</small></li>`).join('')}</ul>`:'<p class="muted">No heist items have been linked to this guide yet.</p>'}</section>`;
  const chapters=GUIDE_TEXT_FIELDS.map(key=>guideChapter(entry,key,'heist-guide')+(key==='requirements'?itemsChapter:'')).join('');
  $('#content').innerHTML=`<div class="guide-picker"><p class="eyebrow">HEIST GUIDES</p><div class="tier-options heist-guide-options" role="group" aria-label="Heist guide">${guides.map(g=>`<button data-heist-guide="${esc(g.id)}" aria-pressed="${g.id===heistGuideId}"><span>${esc(g.name)}</span><small>${(g.itemIds||[]).length?(g.itemIds.length===1?'1 heist item':g.itemIds.length+' heist items'):'Read guide'}</small></button>`).join('')}</div></div><article class="substance-guide"><header class="guide-intro"><p class="eyebrow">ZEPHYR RP · HEIST GUIDE</p><h2>${esc(entry.name)}</h2><p class="muted">${GUIDE_TEXT_FIELDS.some(key=>entry[key]?.trim())?'Your reference for this job in the city.':'This guide is ready for your city-specific information.'}</p></header><div class="guide-chapters">${chapters}</div></article>`;
  document.querySelectorAll('[data-heist-guide]').forEach(b=>b.onclick=()=>{heistGuideId=b.dataset.heistGuide;render();document.querySelector(`[data-heist-guide="${heistGuideId}"]`).focus();});
  bindPhotos();
}
function renderSubstanceEditor(){
  $('#editor-body').innerHTML=`<p class="editor-help">Write the in-game guide here. For requirements, steps and tips, use one entry per line. Preview, then export guide.json to keep your changes.</p><label class="editor-form">Substance<select id="edit-substance">${Object.entries(SUBSTANCE_SECTIONS).map(([id,name])=>`<option value="${id}" ${id===substanceSection?'selected':''}>${name}</option>`).join('')}</select></label><div id="substance-fields"></div>`;
  const fields=()=>{const id=$('#edit-substance').value,entry=guide.substanceGuides?.[id]||{};$('#substance-fields').innerHTML=`<form id="substance-form" class="editor-form guide-editor">${Object.entries(GUIDE_SECTIONS).map(([key,label])=>`<label>${label}<textarea name="${key}">${esc(entry[key]||'')}</textarea></label>`).join('')}<div class="editor-actions"><button class="primary" type="submit">Apply guide to preview</button><button type="button" id="export-substance-guide">Export guide.json</button></div></form>`;
    $('#substance-form').onsubmit=e=>{e.preventDefault();try{const form=new FormData(e.target),g=structuredClone(guide);g.substanceGuides??={};g.substanceGuides[id]={...g.substanceGuides[id],...Object.fromEntries(GUIDE_TEXT_FIELDS.map(key=>[key,form.get(key).trim()]))};applyPreview(g,recipes);editorStatus('Guide applied to preview. Export guide.json to keep these changes.');}catch(error){editorStatus(error.message,true);}};
    $('#export-substance-guide').onclick=()=>download('guide.json',guide);
  };$('#edit-substance').onchange=fields;fields();
}
function renderHeistGuideEditor(){
  const heistRecipes=recipes.filter(r=>r.categoryId==='heist');
  $('#editor-body').innerHTML=`<p class="editor-help">Write a heist guide and tick the heist items it uses. For requirements, steps and tips, use one entry per line. Preview, then export guide.json to keep your changes.</p><label class="editor-form">Heist guide<select id="edit-heist-guide">${heistGuides().map(g=>`<option value="${esc(g.id)}" ${g.id===heistGuideId?'selected':''}>${esc(g.name)}</option>`).join('')}<option value="">New heist guide</option></select></label><div id="heist-guide-fields"></div>`;
  const fields=()=>{const existing=heistGuides().find(g=>g.id===$('#edit-heist-guide').value),entry=existing||{id:'',name:'',itemIds:[]};$('#heist-guide-fields').innerHTML=`<form id="heist-guide-form" class="editor-form guide-editor"><div class="editor-fields"><label>Stable guide ID<input name="id" required pattern="[a-z0-9\\-]+" ${existing?'readonly':''} value="${esc(entry.id)}" placeholder="fleeca-bank"></label><label>Guide name<input name="name" required value="${esc(entry.name)}"></label></div>${Object.entries(GUIDE_SECTIONS).map(([key,label])=>`<label>${label}<textarea name="${key}">${esc(entry[key]||'')}</textarea></label>`).join('')}<fieldset class="item-picker"><legend>Heist items used</legend>${heistRecipes.length?heistRecipes.map(r=>`<label><input type="checkbox" name="itemIds" value="${esc(r.id)}" ${(entry.itemIds||[]).includes(r.id)?'checked':''}>${esc(r.name)}</label>`).join(''):'<p class="muted">No heist item recipes yet. Add them in the recipe editor, then link them here.</p>'}</fieldset><div class="editor-actions"><button class="primary" type="submit">Apply guide to preview</button><button type="button" id="export-heist-guide">Export guide.json</button></div></form>`;
    $('#heist-guide-form').onsubmit=e=>{e.preventDefault();try{const form=new FormData(e.target),g=structuredClone(guide),next={...entry,id:form.get('id').trim(),name:form.get('name').trim(),...Object.fromEntries(GUIDE_TEXT_FIELDS.map(key=>[key,form.get(key).trim()])),itemIds:form.getAll('itemIds')};g.heistGuides=existing?heistGuides().map(x=>x.id===existing.id?next:x):[...heistGuides(),next];heistGuideId=next.id;applyPreview(g,recipes);renderHeistGuideEditor();editorStatus('Heist guide applied to preview. Export guide.json to keep these changes.');}catch(error){editorStatus(error.message,true);}};
    $('#export-heist-guide').onclick=()=>download('guide.json',guide);
  };$('#edit-heist-guide').onchange=fields;fields();
}
const status=(message,error=false)=>{$('#status').textContent=message;$('#status').classList.toggle('error',error);};
const recipe=()=>recipes.find(r=>r.id===selectedId);
const duration=seconds=>formatDuration(seconds);
const postalLabel=location=>location.postcode===''?'No postal':location.postcodeType==='closest'?'Closest postal':'Postcode';
// A postcode tag copies its number, ready to paste into the in-game GPS. Locations without a number stay plain labels.
const COPY_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
const postalTag=location=>{const text=postalLabel(location).toUpperCase()+' '+esc(location.postcode);return /\d/.test(location.postcode)?`<button type="button" class="tag" data-copy-postal="${esc(location.postcode)}" title="Copy postcode" aria-label="${esc(postalLabel(location))} ${esc(location.postcode)}, copy">${text}${COPY_ICON}</button>`:`<span class="tag">${text}</span>`;};
const warningBanner=location=>location.warning?`<div class="warning-banner" role="note"><strong>⚠ Rob zone</strong><span>${esc(location.warning)}</span></div>`:'';
const itemName=id=>guide.items.find(i=>i.id===id)?.name||id;
// Material names link to their page: how to get it and what else uses it.
const materialLink=id=>`<a class="material-link" href="#materials/${esc(id)}">${esc(itemName(id))}</a>`;
const categoryLabels={ammo:'Ammo',weapons:'Weapons',substances:'Substances',attachments:'Attachments','heist-guides':'Heist guides',heist:'Heist items',generic:'Generic items',melee:'Melee',gathering:'Gathering',smelting:'Smelting',business:'Business'};
const categoryIcons={'heist-guides':'M6 3h9l3 3v15H6V3Zm3 7h6M9 14h6M9 18h4',ammo:'M8 20V8l4-5 4 5v12H8ZM8 15h8',weapons:'M4 7h16v6h-7l-2 7H6l2-7H4V7Zm10 0v6',substances:'M9 3h6M10 3v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M8 15h8',attachments:'M3 12h18M12 3v18M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0',heist:'M5 7h14v14H5V7Zm4 0V3h6v4M5 12h14M10 12v3h4v-3',generic:'m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10',melee:'m5 20 4-4M7 14l3 3M9 14 18 3l3 1-2 5-8 7',smelting:'M12 3c1 5 7 7 7 12a7 7 0 0 1-14 0c0-3 2-5 4-7 0 3 1 4 2 4s2-4 1-9Z',gathering:'M12 21V11M12 11c0-4 3-7 8-7 0 5-3 7-8 7Zm0 3c0-3-2-6-7-6 0 4 2 6 7 6ZM7 21h10',home:'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',locations:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',materials:'m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5'};
const guideCategories=['substances','heist-guides','gathering'];
// How much each section holds: written guides for the guide sections, recipes for the rest.
function categoryCount(id){return id==='home'?1:id==='substances'?Object.values(guide.substanceGuides||{}).filter(hasGuideText).length:id==='heist-guides'?heistGuides().length:id==='gathering'?Object.values(guide.gatheringGuides||{}).filter(hasGuideText).length:id==='locations'?guide.locations.length:id==='materials'?guide.items.length:recipes.filter(r=>r.categoryId===id).length;}
const categoryDetail=(id,count)=>id==='home'?'Start here':guideCategories.includes(id)?(count?`${count} guide${count===1?'':'s'}`:'Coming soon'):id==='locations'?`${count} locations`:id==='materials'?`${count} materials`:count?`${count} recipes`:'Coming soon';
const sectionIcon=id=>`<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${categoryIcons[id]||categoryIcons.generic}"/></svg></span>`;
function categoryLink(id,name,count){const active=category===id,detail=categoryDetail(id,count);return `<a href="#${esc(id)}" class="${active?'active':''} ${count?'':'pending'}" ${active?'aria-current="page"':''} aria-label="${esc(categoryLabels[id]||name)} — ${detail}">${sectionIcon(id)}<span class="nav-label">${esc(categoryLabels[id]||name)}<small>${detail}</small></span></a>`;}
// Data is revalidated on every visit (cache:'no-cache'), so a visitor always gets the latest files but unchanged ones are not downloaded again.
// On the first load the page itself has already asked for the data (window.guideData, started in index.html while the scripts
// were still downloading), so that head start is used; anything it could not fetch is asked for again here, which also gives the error to show.
async function load(){try{const first=!guide;if(guide)status('Loading latest guide…');const fetchJson=async file=>{const r=await fetch('data/'+file,{cache:'no-cache'});if(!r.ok)throw new Error('Could not load '+file);return r.json();};const started=window.guideData;window.guideData=null;const [early,earlyFiles]=(await started)||[];const g=early||await fetchJson('guide.json');validateData(g,[],{links:false});const groups=await Promise.all(g.categories.map(async(c,i)=>(earlyFiles&&await earlyFiles[i])||fetchJson(c.file)));groups.forEach((rows,i)=>{if(!Array.isArray(rows)||rows.some(r=>r.categoryId!==g.categories[i].id))throw new Error('Recipe file does not match its category.');});const all=groups.flat();validateData(g,all);guide=g;recipes=all;restorePlan();const place=first?enterPage():undefined;route();if(place!==undefined)scrollTo({top:place,behavior:'instant'});status('');if(first)saveOffline();}catch(e){$('#content .loading')?.remove();status('The guide could not be loaded: '+e.message+'. Refresh the page to try again.',true);}}
// Offline copy: after the first visit sw.js keeps the guide on the device, so it still opens with no connection.
// The first time that is ready the visitor is told once; a small "Offline" note shows whenever the connection is down.
const offlineNote=()=>{$('#offline-note').hidden=navigator.onLine!==false;};
addEventListener('online',offlineNote);addEventListener('offline',offlineNote);offlineNote();
async function saveOffline(){
  if(!('serviceWorker' in navigator))return;
  try{
    await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;
    if(localStorage.getItem(OFFLINE_KEY))return;
    localStorage.setItem(OFFLINE_KEY,'1');
    // Wait for any message already on screen to finish before adding this one.
    setTimeout(()=>toast('Saved on this device. The guide now opens with no connection.'),$('#toast').hidden?0:5200);
  }catch{}
}
// The crafting plan lives on this device, so it survives a refresh or a trip back into the game.
function savePlan(){try{if(plan.length||Object.keys(inventory).length||rawMode)localStorage.setItem(PLAN_KEY,JSON.stringify({plan,inventory,raw:rawMode,methods}));else localStorage.removeItem(PLAN_KEY);}catch{}}
function restorePlan(){
  let saved={};try{saved=JSON.parse(localStorage.getItem(PLAN_KEY))||{};}catch{}
  plan=[];inventory={};rawMode=saved.raw===true;methods={};
  for(const entry of Array.isArray(saved.plan)?saved.plan:[]){const r=recipes.find(r=>r.id===entry?.recipeId);try{if(r&&!plan.some(p=>p.recipeId===r.id)){calculate(r,entry.quantity);plan.push({recipeId:r.id,quantity:entry.quantity});}}catch{}}
  for(const [itemId,owned] of Object.entries(saved.inventory&&typeof saved.inventory==='object'?saved.inventory:{}))if(guide.items.some(i=>i.id===itemId)&&Number.isSafeInteger(owned)&&owned>=0&&owned<=1e12)inventory[itemId]=owned;
  for(const [itemId,recipeId] of Object.entries(saved.methods&&typeof saved.methods==='object'?saved.methods:{}))if(recipes.some(r=>r.id===recipeId&&r.outputItemId===itemId))methods[itemId]=recipeId;
}
// Back and Forward return to the spot you left, and a refresh keeps your place. A browser normally does this by itself, but
// here each page is drawn after the address changes, so it has nothing to scroll to. Instead every stop in the tab's history
// is given a short name, and how far down the page it was is remembered against that name for as long as the tab is open.
const PLACES_KEY='zephyr-places';
let places=(()=>{try{const saved=JSON.parse(sessionStorage.getItem(PLACES_KEY));return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};}catch{return {};}})();
let stop=null,leaving=null;
try{history.scrollRestoration='manual';}catch{}
// Following a link to something with the same name as the address (the plan box on a recipe page) makes the browser scroll
// to it before the page changes, so the position is noted at the click, while it is still the reader's own.
const noteLeaving=()=>{leaving={y:scrollY,at:performance.now()};};
document.addEventListener('click',e=>{if(e.target.closest?.('a[href^="#"]'))noteLeaving();},true);
function keepPlace(y=leaving&&performance.now()-leaving.at<1000?leaving.y:scrollY){
  leaving=null;if(!stop)return;
  delete places[stop];places[stop]=Math.round(y);
  const names=Object.keys(places);for(const old of names.slice(0,Math.max(0,names.length-60)))delete places[old];
}
// Names the stop the tab is on now, and returns where it was scrolled to if it has been here before.
function enterPage(){
  const known=history.state?.stop;
  if(typeof known==='string'){stop=known;return places[known];}
  stop=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  try{history.replaceState({stop},'');}catch{}
}
addEventListener('pagehide',()=>{keepPlace(scrollY);try{sessionStorage.setItem(PLACES_KEY,JSON.stringify(places));}catch{}});
// Following a link starts the new page at the top; loading data or previewing an edit keeps the scroll position.
// A different page appears at once where it should be; moving within the page you are on glides there (unless the device asks for less motion).
function route(scroll=false){
  if(!guide)return;
  const r=resolveRoute(location.hash,guide,recipes),behavior=r.category===category?'auto':'instant';
  category=r.category;
  if(category==='materials')materialId=r.material;
  if(r.tier)weaponTier=r.tier;if(r.method)ammoMethod=r.method;if(r.substance)substanceSection=r.substance;if(r.gathering)gatheringMethod=r.gathering;if(r.heistGuide)heistGuideId=r.heistGuide;
  if(r.recipeId&&r.recipeId!==selectedId){selectedId=r.recipeId;quantity=recipe().outputQuantity;availableAmount=null;}
  const choices=recipes.filter(x=>x.categoryId===category);
  // Pages without recipes (locations, materials, the plan, empty sections) leave the last recipe and amount alone, so going back restores them.
  if(choices.length&&!choices.some(x=>x.id===selectedId)){selectedId=choices[0].id;quantity=choices[0].outputQuantity;}
  // A shared plan fills an empty plan straight away. If there is already a plan here, the visitor is asked what to do with the new one.
  let loaded=false;sharedPlan=null;
  if(category==='plan'&&r.shared){if(!plan.length){plan=r.shared;savePlan();loaded=true;}else if(encodePlan(plan)!==encodePlan(r.shared))sharedPlan=r.shared;}
  render();
  const target=r.location&&$('#location-'+r.location);
  if(target)target.scrollIntoView({behavior});else if(scroll)scrollTo({top:0,behavior});
  if(loaded)toast('Shared plan loaded. It is saved on this device now.');
}
// Go to an address, re-rendering if the page is already there.
function navigate(hash){if(location.hash===hash)route(true);else{noteLeaving();location.hash=hash;}}
function currentHash(){const r=recipe(),sub=category==='substances'?substanceSection:category==='gathering'?gatheringMethod:category==='heist-guides'?heistGuideId:category==='materials'?materialId:category==='plan'?(sharedPlan?encodePlan(sharedPlan):''):r?.categoryId===category&&category!=='business'?r.id:'';return '#'+category+(sub?'/'+sub:'');}
function render(){
  renderPage();
  const c=guide.categories.find(c=>c.id===category);
  document.title=category==='home'?SITE_TITLE:(category==='materials'&&materialId?itemName(materialId)+' — ':'')+(c?c.name:EXTRA_PAGES[category])+' — '+SITE_TITLE;
  updatePlanCount();renderPins();
  // Keep the address in step with what is on screen so any page can be bookmarked or shared.
  // The home page keeps the plain address it was opened with.
  if(category!=='locations'&&!(category==='home'&&!location.hash)&&location.hash!==currentHash())history.replaceState(history.state,'',currentHash());
}
function renderPage(){
  const navigationFocused=$('#navigation').contains(document.activeElement);
  $('#navigation').innerHTML=categoryLink('home',EXTRA_PAGES.home,1)+guide.categories.map(c=>categoryLink(c.id,c.name,categoryCount(c.id))).join('')+['locations','materials'].map(id=>categoryLink(id,EXTRA_PAGES[id],categoryCount(id))).join('');
  // Choosing the section you are already on takes you back to the top of it.
  $('#navigation').querySelectorAll('a').forEach(a=>a.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;e.preventDefault();navigate(a.getAttribute('href'));});
  // On narrow screens the menu scrolls sideways, so keep the current page in view.
  const nav=$('#navigation'),activeLink=nav.querySelector('.active');if(activeLink&&nav.scrollWidth>nav.clientWidth)nav.scrollLeft=activeLink.offsetLeft-(nav.clientWidth-activeLink.offsetWidth)/2;
  if(navigationFocused)$('#navigation [aria-current="page"]')?.focus({preventScroll:true});
  const c=guide.categories.find(c=>c.id===category);
  renderWeaponTiers();renderAmmoMethods();
  renderSubstanceSections();renderGatheringMethods();
  $('#page-title').textContent=category==='home'?'Everything you need to craft in Zephyr':c?c.name:EXTRA_PAGES[category];
  $('#breadcrumb').textContent=c?'CRAFTING':category.toUpperCase();
  $('#page-description').textContent=category==='home'?'Pick what you want to make and the guide tells you what you need, how long it takes and where to craft it, with a map and a photo of the bench.':category==='gathering'?'Know where to find raw materials, what to bring and what you’ll get.':category==='smelting'?'Start with the ore you have. See your yield, fuel requirements and leftovers.':category==='materials'?'Look up any material: how to get it and every recipe that uses it.':category==='plan'?'Everything you have queued up, combined into one materials list.':c?'Choose a recipe, prepare your materials, find your bench.':'Know where to go. Find the bench when you get there.';
  if(category==='home'){renderHome();return;}
  if(category==='locations'){renderLocations();return;}
  if(category==='materials'){renderMaterials();return;}
  if(category==='plan'){$('#content').innerHTML=sharedBanner()+'<div id="plan" class="wide"></div>';bindShared();renderPlan();return;}
  if(category==='business'){
    $('#page-description').textContent='Enter the parts you need to craft. Get the materials and time for your quota.';
    renderBusiness($('#content'),recipes.filter(r=>r.categoryId==='business'),guide,entries=>{const next=plan.map(e=>({...e}));for(const entry of entries){const existing=next.find(e=>e.recipeId===entry.recipeId);if(existing)existing.quantity+=entry.quantity;else next.push(entry);}next.forEach(e=>calculate(recipes.find(r=>r.id===e.recipeId),e.quantity));plan=next;renderPlan();});renderPlan();return;
  }
  if(category==='substances'){renderSubstanceGuide();return;}
  if(category==='heist-guides'){renderHeistGuide();return;}
  if(category==='gathering'){renderGathering();return;}
  const rows=recipes.filter(r=>r.categoryId===category&&(category!=='weapons'||r.tier===weaponTier)&&(category!=='ammo'||r.method===ammoMethod));
  if(rows.length&&!rows.some(r=>r.id===selectedId)){selectedId=rows[0].id;quantity=rows[0].outputQuantity;}
  if(!rows.length){$('#content').innerHTML=`<div class="empty"><p class="eyebrow">THE GUIDE IS GROWING</p><h2>${esc(c.name)}${category==='weapons'?' · Tier '+weaponTier:category==='ammo'?' · '+AMMO_METHODS[ammoMethod]:''}</h2><p class="muted">${category==='weapons'?'No recipes have been supplied for Tier '+weaponTier+' yet.':category==='ammo'?'No '+AMMO_METHODS[ammoMethod]+' ammo recipes have been supplied yet.':'No recipes have been supplied for this section yet.'}<br>Details will appear here as the guide expands.</p></div><div id="plan"></div>`;renderPlan();return;}
  const current=recipe(),bench=guide.benches.find(b=>b.id===current.benchId)||{id:null,name:'Location not supplied',image:'',notes:'Bench details and photos have not been supplied.'},loc=guide.locations.find(l=>l.id===bench.locationId)||{name:'Location pending',postcode:'Not supplied',mapImage:'',notes:'The location and postcode are awaiting details.'};
  $('#content').innerHTML=`${warningBanner(loc)}<div class="location-strip"><div><strong>⌖ &nbsp;${esc(bench.name)}</strong><div class="muted">${bench.id?rows.filter(r=>r.benchId===bench.id).length+' recipes at this bench'+(loc.name===bench.name?'':' · '+esc(loc.name)):'Bench and postcode have not been supplied.'}</div></div>${postalTag(loc)}<button id="jump-location" class="quiet">View location guide</button></div>${category==='heist'?usedInGuides(current):''}<div class="work-grid">${recipePicker(rows,current)}<section class="calculator" aria-label="Crafting calculator"><div class="calc-heading"><p class="eyebrow">CRAFTING CALCULATOR</p><h2>${esc(current.name)}</h2><p>Set your target. We’ll round up to full crafts.${current.outputName?' Output: '+esc(current.outputName)+'.':''}</p></div><div class="calc-body"><label for="quantity">How many do you need?</label><div class="quantity-row"><button id="decrement" aria-label="Decrease by one craft">−</button><input id="quantity" type="number" min="1" max="1000000" step="1" value="${quantity}" inputmode="numeric"><button id="increment" aria-label="Increase by one craft">+</button></div><div id="calculation" aria-live="polite"></div><button class="primary" id="add-plan">Add to crafting plan</button><p class="fine">${esc(current.notes||'Recipe supplied by the guide maintainer. Costs are materials per craft.')} Time estimates assume consecutive crafts, excluding travel and gathering.</p></div></section></div>${category==='smelting'?usedInRecipes(current):''}<section class="location-section" id="location-guide"><div class="section-header"><div><p class="eyebrow">FIND YOUR WORKBENCH</p><h2>${esc(bench.name)}</h2></div>${postalTag(loc)}</div><div class="photos">${photo(loc.mapImage,loc.mapAlt,'01 / Map location',postalLabel(loc)+' '+loc.postcode)}${photo(bench.image,bench.imageAlt,'02 / Bench & surroundings',loc.name)}</div><p class="location-notes">${esc(loc.notes)} ${esc(bench.notes)}</p></section><div id="plan"></div>`;
  $('.calc-body').insertAdjacentHTML('beforeend',`<details class="per-craft"><summary>Original recipe · ${fmt(current.outputQuantity)} per craft</summary><dl class="ingredients">${current.ingredients.map(i=>`<div><dt>${materialLink(i.itemId)}</dt><dd>${fmt(i.quantity)}</dd></div>`).join('')}</dl></details>`);
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{const next=rows.find(r=>productName(r)===b.dataset.product);selectRecipe(next.id);document.querySelectorAll('[data-product]').forEach(button=>{if(button.dataset.product===productName(recipe()))button.focus();});});
  document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>{selectRecipe(b.dataset.variant);document.querySelector(`[data-variant="${recipe().id}"]`)?.focus();});
  if($('#recipe-variant'))$('#recipe-variant').onchange=e=>{selectRecipe(e.target.value);$('#recipe-variant').focus();};
  if(category==='smelting')setupAvailableMode();
  $('#quantity').oninput=e=>{quantity=Number(e.target.value);updateCalculation();};
  // Ammo amounts snap up to full crafts when the field is left. That changes only the "extra" figure, so it alone is updated:
  // redrawing the whole result would replace the links in it, and a link replaced mid-click never receives the click.
  $('#quantity').onchange=()=>{if(category!=='ammo'||!Number.isSafeInteger(quantity)||quantity<1)return;const per=recipe().outputQuantity,crafts=Math.ceil(quantity/per),surplus=$('#calculation [data-surplus]');quantity=Math.min(crafts*per,Math.floor(MAX_QUANTITY/per)*per);$('#quantity').value=quantity;if(surplus&&quantity===crafts*per)surplus.textContent='0';else updateCalculation();};
  $('#decrement').onclick=()=>{quantity=Math.max(category==='ammo'?recipe().outputQuantity:1,(Number.isSafeInteger(quantity)?quantity:1)-recipe().outputQuantity);$('#quantity').value=quantity;updateCalculation();};
  $('#increment').onclick=()=>{quantity=Math.min(MAX_QUANTITY,(Number.isSafeInteger(quantity)?quantity:0)+recipe().outputQuantity);$('#quantity').value=quantity;updateCalculation();};
  $('#add-plan').onclick=()=>{try{const plannedQuantity=category==='smelting'&&smeltMode==='available'?calculateAvailable(recipe(),availableItemId,availableAmount).output:quantity;calculate(recipe(),plannedQuantity);const found=plan.find(p=>p.recipeId===selectedId);if(found){calculate(recipe(),found.quantity+plannedQuantity);found.quantity+=plannedQuantity;}else plan.push({recipeId:selectedId,quantity:plannedQuantity});renderPlan();toast('Added '+recipe().name+' to your crafting plan.',{label:'View plan',action:()=>$('#plan').scrollIntoView()});}catch(e){status(e.message,true);}};
  document.querySelectorAll('[data-goto-recipe]').forEach(b=>b.onclick=()=>gotoRecipe(b.dataset.gotoRecipe));
  $('#jump-location').onclick=()=>$('#location-guide').scrollIntoView();bindPhotos();updateCalculation();renderPlan();
}
// A short confirmation near the bottom of the screen, where it is visible however far down the page you are.
let toastTimer;
function toast(message,button){
  const host=$('#toast');host.innerHTML=`<span></span>${button?'<button type="button" class="quiet"></button>':''}`;
  host.querySelector('span').textContent=message;
  if(button){const b=host.querySelector('button');b.textContent=button.label;b.onclick=()=>{host.hidden=true;button.action();};}
  host.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{host.hidden=true;},button?8000:5000);
}
function usedInGuides(r){const guides=guidesUsing(r);return `<nav class="used-in" aria-label="Heist guides that use ${esc(productName(r))}"><p class="eyebrow">USED IN HEIST GUIDES</p>${guides.length?`<ul class="item-links">${guides.map(g=>`<li>${heistGuideLink(g)}</li>`).join('')}</ul>`:'<p class="muted">Not linked to a heist guide yet.</p>'}</nav>`;}
function productName(r){return r.name.split(' (')[0].replace(/ Ingot$/,'');}
function renderLocations(){
  const locations=guide.locations.map(location=>{const benches=guide.benches.filter(b=>b.locationId===location.id);return {location,benches,title:benches.length===1?benches[0].name:location.name};}).sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true}));
  $('#page-description').textContent=`${locations.length} locations · Each entry pairs its map with its bench photo. Sorted by name.`;
  const jump=locations.length>2?`<nav class="location-jump" aria-label="Jump to a location"><p class="eyebrow">JUMP TO</p><ul class="item-links">${locations.map(({location:l,title})=>`<li><a class="item-link" href="#locations/${esc(l.id)}">${esc(title)} <small>${/\d/.test(l.postcode)?esc(l.postcode):'No postal'}</small></a></li>`).join('')}</ul></nav>`:'';
  $('#content').innerHTML=jump+locations.map(({location:l,benches,title})=>`<section class="location-section location-entry" id="location-${esc(l.id)}" aria-label="${esc(title)} — ${postalLabel(l).toLowerCase()} ${esc(l.postcode)}"><div class="section-header"><div><p class="eyebrow">CRAFTING LOCATION</p><h2>${esc(title)}</h2></div>${postalTag(l)}</div><div class="photos">${photo(l.mapImage,l.mapAlt,'Map location',postalLabel(l)+' '+l.postcode)}${benches.map(b=>photo(b.image,b.imageAlt,benches.length===1?'Bench & surroundings':b.name,postalLabel(l)+' '+l.postcode)).join('')}</div><div class="location-entry-footer"><div>${warningBanner(l)}${l.notes?`<p class="location-notes">${esc(l.notes)}</p>`:''}${benches.filter(b=>b.notes).map(b=>`<p class="location-notes">${benches.length>1?esc(b.name)+': ':''}${esc(b.notes)}</p>`).join('')}</div><div class="location-entry-actions">${benches.filter(b=>recipes.some(r=>r.benchId===b.id)).map(b=>`<button data-bench="${esc(b.id)}">${benches.length===1?'View recipes':'View '+esc(b.name)+' recipes'}</button>`).join('')}</div></div></section>`).join('')||'<div class="empty">No locations added yet.</div>';
  bindPhotos();
  document.querySelectorAll('[data-bench]').forEach(b=>b.onclick=()=>{const r=recipes.find(r=>r.benchId===b.dataset.bench);navigate('#'+r.categoryId+'/'+r.id);});
}
// Home: what the guide is, how to use it and where everything lives. The cards and figures come from the data, so it stays
// current on its own; a returning visitor also gets their pins and plan at the top.
const HOME_STEPS=[['Pick what to make','Choose a section, then a recipe. Search finds any recipe, material, guide or postcode.'],['Say how many','The calculator rounds up to full crafts and lists every material and how long it takes.'],['Head to the bench','Each recipe shows its bench with a postcode to copy, a map and a photo of the spot.']];
const HOME_TOOLS=[
 ['Crafting plan','Queue up several recipes and get one combined materials list. Break it down to raw ore, take off what you already have, or send it to your crew as a link.','<a class="item-link" href="#plan">Open your plan</a>'],
 ['Search','Find any recipe, material, guide, bench or postcode. It also looks inside the written guides, takes several words such as “cayo 9mm”, and forgives a small typo.','<button type="button" class="item-link" data-home="search">Search the guide</button>'],
 ['Materials','Not sure where something comes from? Look up any material to see how to get it and every recipe that uses it.','<a class="item-link" href="#materials">Browse materials</a>'],
 ['Pins','Use the Pin button beside a page title to keep a recipe, guide or material at the top of the menu.',''],
 ['Works offline','After your first visit the guide is saved on your device, so it still opens if your connection drops. On a phone you can add it to your home screen.',''],
 ['Themes','Zephyr purple, light, high contrast and more. Your pick is saved on this device.','<button type="button" class="item-link" data-home="theme">Pick a theme</button>'],
];
function renderHome(){
  const label=id=>categoryLabels[id]||guide.categories.find(c=>c.id===id)?.name||EXTRA_PAGES[id];
  const card=id=>{const count=categoryCount(id);return `<a class="home-card${count?'':' pending'}" href="#${esc(id)}">${sectionIcon(id)}<span><strong>${esc(label(id))}</strong><span>${esc(SECTION_NOTES[id]||'Recipes and where to craft them.')}</span><small>${categoryDetail(id,count)}</small></span></a>`;};
  // Sections that are still empty go to the end of their group.
  const groups=homeSections(guide).map(group=>({...group,ids:[...group.ids.filter(categoryCount),...group.ids.filter(id=>!categoryCount(id))]}));
  const guides=guideCategories.reduce((sum,id)=>sum+categoryCount(id),0),first=guide.categories.find(c=>recipes.some(r=>r.categoryId===c.id));
  const stats=[[recipes.length,'recipes'],[guide.items.length,'materials'],[guide.locations.length,'crafting locations'],[guides,guides===1?'written guide':'written guides']];
  const pinned=pins.map(hash=>pinDetails(hash,guide,recipes)).filter(Boolean);
  const resume=pinned.length||plan.length?`<section class="home-resume" aria-labelledby="home-resume-title"><p class="eyebrow" id="home-resume-title">PICK UP WHERE YOU LEFT OFF</p><ul class="item-links">${plan.length?`<li><a class="item-link" href="#plan">Your plan <small>${plan.length} ${plan.length===1?'recipe':'recipes'}</small></a></li>`:''}${pinned.map(pin=>`<li><a class="item-link" href="${esc(pin.hash)}">${esc(pin.label)} <small>${esc(pin.detail)}</small></a></li>`).join('')}</ul></section>`:'';
  $('#content').innerHTML=`<div class="home">
<section class="home-hero" aria-label="Start here"><div class="home-actions"><button type="button" class="primary" data-home="search">Search the guide</button>${first?`<a class="button" href="#${esc(first.id)}">Browse recipes</a>`:''}<button type="button" data-home="news">What’s new</button></div><ul class="home-stats">${stats.map(([n,name])=>`<li><strong>${fmt(n)}</strong><span>${name}</span></li>`).join('')}</ul></section>
${resume}
<section aria-labelledby="home-steps-title"><p class="eyebrow">HOW IT WORKS</p><h2 id="home-steps-title">Three steps to anything in the guide</h2><ol class="home-steps">${HOME_STEPS.map(([title,text])=>`<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol></section>
<section aria-labelledby="home-sections-title"><p class="eyebrow">EXPLORE THE GUIDE</p><h2 id="home-sections-title">Where do you want to go?</h2>${groups.map(group=>`<div class="home-group"><h3>${group.title} <small>${group.note}</small></h3><div class="home-cards">${group.ids.map(card).join('')}</div></div>`).join('')}</section>
<section aria-labelledby="home-tools-title"><p class="eyebrow">HANDY TOOLS</p><h2 id="home-tools-title">What else it can do</h2><div class="home-tools">${HOME_TOOLS.map(([title,text,action])=>`<article><h3>${title}</h3><p>${text}</p>${action}</article>`).join('')}</div></section>
<section id="home-news" aria-labelledby="home-news-title" hidden></section>
<section class="home-help" aria-labelledby="home-help-title"><div><h2 id="home-help-title">Spotted something wrong?</h2><p>Recipes change and new things get added to the city all the time. If a recipe looks off, a bench has moved or you know something the guide does not, say so and it will get updated.</p></div><button type="button" data-home="feedback">Report it</button></section>
</div>`;
  const actions={search:()=>{$('#search-input').scrollIntoView({block:'center'});$('#search-input').focus();},news:openChangelog,theme:()=>$('#theme-dialog').showModal(),feedback:()=>$('#feedback-dialog').showModal()};
  $('#content').onclick=e=>{const button=e.target.closest('[data-home]');if(button&&category==='home')actions[button.dataset.home]();};
  renderHomeNews();
}
// The latest changes arrive separately from the guide data, so this part is filled in whenever both are ready.
function renderHomeNews(){
  const host=$('#home-news');if(!host)return;
  host.hidden=!changelog.length;
  host.innerHTML=changelog.length?`<p class="eyebrow">WHAT’S NEW</p><h2 id="home-news-title">Latest changes</h2><ul>${changelog.slice(0,3).map(entry=>`<li><time datetime="${esc(entry.date)}">${esc(formatDate(entry.date))}</time><span>${esc(entry.title)}</span></li>`).join('')}</ul><button type="button" data-home="news">See all changes</button>`:'';
}
// Materials: every ingredient in the guide, how to get it and each recipe that uses it. Built from the recipes, so it never needs upkeep.
function renderMaterials(){
  const all=materialIndex(guide,recipes),m=all.find(x=>x.id===materialId),price=guide.items.find(i=>i.id===materialId)?.sellPrice;
  const label=r=>r.name+(r.categoryId==='weapons'?' · Tier '+r.tier:r.categoryId==='ammo'?' · '+AMMO_METHODS[r.method]:'');
  const link=(r,text,note)=>`<li><a class="item-link" href="#${esc(r.categoryId)}/${esc(r.id)}">${esc(text)}${note?` <small>${esc(note)}</small>`:''}</a></li>`;
  const groups=m?guide.categories.map(c=>[c,m.usedIn.filter(u=>u.recipe.categoryId===c.id)]).filter(([,list])=>list.length):[];
  const detail=m?`<section class="material-detail" aria-label="${esc(m.name)}"><div class="section-header"><div><p class="eyebrow">MATERIAL</p><h2>${esc(m.name)}</h2></div><span class="muted">Used in ${fmt(m.usedIn.length)} ${m.usedIn.length===1?'recipe':'recipes'}${price===undefined?'':' · sells for $'+fmt(price)+' each'}</span></div><h3>How to get it</h3>${m.madeBy.length?`<ul class="item-links">${m.madeBy.map(r=>link(r,guide.categories.find(c=>c.id===r.categoryId).name+': '+r.ingredients.map(i=>fmt(i.quantity)+' '+itemName(i.itemId)).join(' + ')+' makes '+fmt(r.outputQuantity)+' '+m.name)).join('')}</ul>`:'<p class="muted">No recipe in the guide makes this. It is gathered, bought or found in the city.</p>'}<h3>What it is used for</h3>${groups.length?groups.map(([c,list])=>`<div class="material-uses"><h4>${esc(c.name)} <small>${fmt(list.length)}</small></h4><ul class="item-links">${list.map(u=>link(u.recipe,label(u.recipe),fmt(u.quantity)+' per craft')).join('')}</ul></div>`).join(''):'<p class="muted">No recipe in the guide uses it yet.</p>'}</section>`:'';
  $('#content').innerHTML=`${detail}<section class="material-list" aria-label="All materials"><div class="section-header"><div><p class="eyebrow">ALL MATERIALS</p><h2>${m?'Look up another':'Pick a material'}</h2></div><span class="muted">${fmt(all.length)} materials</span></div><label class="visually-hidden" for="material-filter">Filter materials by name</label><input id="material-filter" type="search" placeholder="Filter materials" autocomplete="off"><div class="material-grid">${all.map(x=>`<a href="#materials/${esc(x.id)}" class="material-chip${x.id===materialId?' active':''}" ${x.id===materialId?'aria-current="true"':''} data-name="${esc(x.name.toLowerCase())}"><span>${esc(x.name)}</span><small>${fmt(x.usedIn.length)} ${x.usedIn.length===1?'recipe':'recipes'}${x.madeBy.length?' · can be made':''}</small></a>`).join('')}</div><p id="material-empty" class="muted" hidden>No material matches that.</p></section>`;
  $('#material-filter').oninput=e=>{const q=e.target.value.trim().toLowerCase();let shown=0;document.querySelectorAll('.material-chip').forEach(chip=>{chip.hidden=!chip.dataset.name.includes(q);if(!chip.hidden)shown++;});$('#material-empty').hidden=shown>0;};
}
function selectRecipe(id){const sameItem=recipe()&&productName(recipe())===productName(recipes.find(r=>r.id===id));selectedId=id;quantity=recipe().outputQuantity;if(!sameItem)availableAmount=null;availableItemId='';render();}
function recipePicker(rows,current){
  const products=[...new Set(rows.map(productName))],variants=rows.filter(r=>productName(r)===productName(current)),factsOnly=['ammo','melee','heist','weapons','attachments'].includes(current.categoryId)||(current.categoryId==='smelting'&&variants.length<2);
  return `<section class="catalog recipe-library" aria-label="Recipe selection"><div class="section-header"><div><p class="eyebrow">RECIPE LIBRARY</p><h2>What are you making?</h2></div><span class="muted">${products.length} items · ${rows.length} recipes</span></div><div class="product-strip" role="group" aria-label="Choose an item">${products.map(name=>`<button data-product="${esc(name)}" aria-pressed="${name===productName(current)}">${esc(name)}${rows.filter(r=>productName(r)===name).length>1?` <small>${rows.filter(r=>productName(r)===name).length} methods</small>`:''}</button>`).join('')}</div><div class="method-row${factsOnly?' facts-only':''}">${factsOnly?'':current.categoryId==='smelting'?`<div class="method-pick"><span id="method-label">Method</span><div class="mode-switch" role="group" aria-labelledby="method-label">${variants.map(r=>`<button data-variant="${esc(r.id)}" aria-pressed="${r.id===current.id}">${esc(r.ingredients.filter(i=>i.itemId!=='coal-ore').map(i=>itemName(i.itemId)).join(' + '))}</button>`).join('')}</div></div>`:`<label for="recipe-variant">Crafting method<select id="recipe-variant">${variants.map(r=>`<option value="${esc(r.id)}" ${r.id===current.id?'selected':''}>${esc(r.name)} — ${esc(r.ingredients.map(i=>itemName(i.itemId)).join(' + '))}</option>`).join('')}</select></label>`}<div class="recipe-facts"><span>Output per craft<strong>${fmt(current.outputQuantity)} ${esc(current.outputName||current.name)}</strong></span><span>Time per craft<strong>${duration(current.craftTimeSeconds)}</strong></span></div>${current.categoryId==='smelting'&&current.maxCraftsPerRun?`<p class="fine run-limit">Up to ${fmt(current.maxCraftsPerRun)} smelts per run${current.maxRunTimeSeconds?' · a full run takes about '+duration(current.maxRunTimeSeconds):''}</p>`:''}</div></section>`;
}
function setupAvailableMode(){
  const r=recipe();
  if(!r.ingredients.some(i=>i.itemId===availableItemId))availableItemId=(r.ingredients.find(i=>i.itemId!=='coal-ore')||r.ingredients[0]).itemId;
  if(availableAmount===null)availableAmount=r.ingredients.find(i=>i.itemId===availableItemId).quantity;
  $('.calc-heading p:last-child').textContent=smeltMode==='available'?'Turn the materials you have into a smelting plan.':'Choose your desired output. Materials round up to full crafts.';
  $('.calc-heading').insertAdjacentHTML('beforeend',`<div class="mode-switch" role="group" aria-label="Smelting calculation mode"><button data-mode="available" aria-pressed="${smeltMode==='available'}">What I have</button><button data-mode="target" aria-pressed="${smeltMode==='target'}">What I need</button></div>`);
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{smeltMode=b.dataset.mode;try{localStorage.setItem('smeltMode',smeltMode);}catch{}render();document.querySelector(`[data-mode="${smeltMode}"]`).focus();});
  if(smeltMode!=='available')return;
  $('.calc-body').classList.add('available-mode');
  $('label[for="quantity"]').hidden=true;$('.quantity-row').hidden=true;
  $('.calc-body').insertAdjacentHTML('afterbegin',`<div class="available-controls"><label for="available-item">Ore or item you have</label><select id="available-item">${r.ingredients.map(i=>`<option value="${esc(i.itemId)}" ${i.itemId===availableItemId?'selected':''}>${esc(itemName(i.itemId))}</option>`).join('')}</select><label for="available-quantity">Amount available</label><input id="available-quantity" type="number" min="0" max="1000000" step="1" inputmode="numeric" value="${availableAmount}" aria-describedby="available-help"><div class="quick-amounts" role="group" aria-label="Quick amounts">${[100,500,1000].map(n=>`<button type="button" data-amount="${n}">${fmt(n)}</button>`).join('')}</div>${hasCoal(r)?`<label for="available-coal">Coal Ore you have <span class="muted">(optional)</span></label><input id="available-coal" type="number" min="0" max="1000000" step="1" inputmode="numeric" placeholder="Leave blank if you have plenty" value="${availableCoal??''}"><div id="coal-match" class="coal-match" aria-live="polite"></div>`:''}<p class="fine" id="available-help">Full crafts only. ${hasCoal(r)?'Add your coal to see which runs out first.':'Other ingredients are requirements, not limits.'} Choose any ingredient to calculate from it.</p></div>`);
  document.querySelectorAll('[data-amount]').forEach(b=>b.onclick=()=>{availableAmount=Number(b.dataset.amount);$('#available-quantity').value=availableAmount;$('#available-quantity').removeAttribute('aria-invalid');updateCalculation();});
  if($('#available-coal'))$('#available-coal').oninput=e=>{availableCoal=e.target.value===''?null:Number(e.target.value);updateCalculation();};
  $('#available-item').onchange=e=>{availableItemId=e.target.value;availableAmount=r.ingredients.find(i=>i.itemId===availableItemId).quantity;$('#available-quantity').value=availableAmount;updateCalculation();};
  $('#available-quantity').oninput=e=>{availableAmount=e.target.value===''?NaN:Number(e.target.value);updateCalculation();};
}
function hasCoal(r){return r.ingredients.some(i=>i.itemId==='coal-ore')&&availableItemId!=='coal-ore';}
function updateCoalMatch(){
  const box=$('#coal-match');if(!box)return;
  const r=recipe(),coal=r.ingredients.find(i=>i.itemId==='coal-ore'),input=r.ingredients.find(i=>i.itemId===availableItemId);
  if(availableCoal===null||!Number.isSafeInteger(availableCoal)||availableCoal<0||availableCoal>MAX_QUANTITY||!coal||!input){box.innerHTML='';return;}
  const crafts=Math.floor(availableCoal/coal.quantity),match=crafts*input.quantity;
  box.innerHTML=crafts?`<span>Your coal covers <strong>${fmt(match)} ${esc(itemName(input.itemId))}</strong> (${fmt(crafts)} ${crafts===1?'craft':'crafts'}, ${fmt(crafts*r.outputQuantity)} ${esc(r.outputName||r.name)})</span>${match!==availableAmount&&match<=MAX_QUANTITY?`<button type="button" id="use-coal-match">Use ${fmt(match)}</button>`:''}`:`<span>Not enough coal for one craft. Each craft needs ${fmt(coal.quantity)} Coal Ore.</span>`;
  $('#use-coal-match')?.addEventListener('click',()=>{availableAmount=match;$('#available-quantity').value=match;$('#available-quantity').removeAttribute('aria-invalid');updateCalculation();$('#available-quantity').focus();});
}
function updateAvailable(){
  updateCoalMatch();
  try{
    const coalLimit=hasCoal(recipe())&&availableCoal!==null?{'coal-ore':availableCoal}:{};
    const r=calculateAvailable(recipe(),availableItemId,availableAmount,coalLimit),coal=r.materials.find(i=>i.itemId==='coal-ore');
    $('#available-quantity').removeAttribute('aria-invalid');$('#available-coal')?.removeAttribute('aria-invalid');
    $('#calculation').innerHTML=`<div class="smelt-result"><p class="eyebrow">MAXIMUM OUTPUT</p><strong>${fmt(r.output)}</strong><span>${esc(recipe().outputName||recipe().name)}</span></div><div class="batch-summary"><div><strong>${fmt(r.batches)}</strong>full crafts</div><div><strong>${fmt(r.used)}</strong>${esc(itemName(r.itemId))} used</div><div><strong>${fmt(r.leftover)}</strong>left over</div></div>${r.limitedBy!==r.itemId?`<p class="limit-note">${esc(itemName(r.limitedBy))} runs out first. It limits you to ${fmt(r.batches)} ${r.batches===1?'craft':'crafts'}.</p>`:''}${runsNote(recipe(),r.batches)}<div class="craft-time"><p class="eyebrow">TIME TO CRAFT</p><div class="total-row"><span>Per craft</span><b>${duration(recipe().craftTimeSeconds)}</b></div><div class="total-row"><span>${r.totalTimeSeconds===null||r.batches===0?'Total time':'Total for '+fmt(r.batches)+(r.batches===1?' craft':' crafts')}</span><b>${duration(r.totalTimeSeconds)}</b></div></div>${coal?`<div class="coal-required"><span>${materialLink('coal-ore')} required</span><strong>${fmt(coal.quantity)}</strong></div>`:'<p class="fine">This recipe does not use Coal Ore.</p>'}<div class="totals"><p class="eyebrow">${coal?'OTHER MATERIALS':'MATERIALS REQUIRED'}</p>${r.materials.filter(i=>i!==coal).map(i=>`<div class="total-row"><span>${materialLink(i.itemId)}</span><b>${fmt(i.quantity)}</b></div>`).join('')}</div>${sellValue(recipe(),r)}${otherMethods(recipe())}${r.batches===0?`<p class="fine">One craft needs ${fmt(recipe().ingredients.find(i=>i.itemId===availableItemId).quantity)} ${esc(itemName(availableItemId))}.</p>`:''}${r.output>MAX_QUANTITY?'<p class="fine">This output exceeds the plan limit of 1,000,000. Use a smaller amount to add it to your plan.</p>':''}`;
    $('#add-plan').disabled=r.output===0||r.output>MAX_QUANTITY;
    $('#add-plan').textContent='Add smelting output to plan';
    $('#calculation').querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>selectRecipe(b.dataset.variant));
  }catch(e){$(availableCoal!==null&&!(Number.isSafeInteger(availableCoal)&&availableCoal>=0&&availableCoal<=MAX_QUANTITY)?'#available-coal':'#available-quantity').setAttribute('aria-invalid','true');$('#calculation').innerHTML=`<p class="error">${esc(e.message)}</p>`;$('#add-plan').disabled=true;}
}
function sellValue(r,result){
  const price=id=>guide.items.find(i=>i.id===id)?.sellPrice,money=n=>'$'+fmt(n),coal=r.ingredients.find(i=>i.itemId==='coal-ore');
  const ore=price(result.itemId),out=price(r.outputItemId),coalPrice=coal&&result.itemId!=='coal-ore'?price('coal-ore'):undefined;
  if(ore===undefined&&out===undefined)return '';
  const coalUsed=coal&&result.itemId!=='coal-ore'?coal.quantity*result.batches:0,inputs=ore!==undefined&&(!coalUsed||coalPrice!==undefined)?result.used*ore+coalUsed*(coalPrice||0):null;
  const row=(label,value)=>`<div class="total-row"><span>${label}</span><b>${value}</b></div>`;
  return `<div class="totals sell-value"><p class="eyebrow">SELL VALUE</p>${ore!==undefined?row(`${fmt(result.available)} ${esc(itemName(result.itemId))} sold as is`,money(result.available*ore)):''}${coalUsed&&coalPrice!==undefined?row(`${fmt(coalUsed)} Coal Ore used`,money(coalUsed*coalPrice)):''}${row(`${fmt(result.output)} ${esc(r.outputName||r.name)} after smelting`,out===undefined?'Price not supplied':money(result.output*out))}${out!==undefined&&inputs!==null&&result.batches?`<p class="fine">Smelting ${inputs<=result.output*out?'gains':'loses'} ${money(Math.abs(result.output*out-inputs))} over selling the ore and coal it uses.</p>`:''}</div>`;
}
function usedInRecipes(r){
  if(!r.outputItemId)return '';
  const item=itemName(r.outputItemId),users=recipes.filter(o=>o.ingredients.some(i=>i.itemId===r.outputItemId)),groups=guide.categories.map(c=>[c,users.filter(o=>o.categoryId===c.id)]).filter(([,list])=>list.length);
  const label=o=>o.name+(o.categoryId==='weapons'?' · Tier '+o.tier:o.categoryId==='ammo'?' · '+AMMO_METHODS[o.method]:'');
  return `<section class="used-in-recipes" aria-label="Recipes that use ${esc(item)}"><div class="section-header"><div><p class="eyebrow">USED IN</p><h2>Where ${esc(item)} goes</h2></div><span class="muted">${users.length?fmt(users.length)+(users.length===1?' recipe':' recipes'):''}</span></div>${groups.length?groups.map(([c,list])=>`<details><summary>${esc(c.name)} <small>${fmt(list.length)}</small></summary><ul class="item-links">${list.map(o=>`<li><button type="button" class="item-link" data-goto-recipe="${esc(o.id)}">${esc(label(o))}</button></li>`).join('')}</ul></details>`).join(''):'<p class="muted">No recipe in the guide uses it yet.</p>'}</section>`;
}
function gotoRecipe(id){const r=recipes.find(r=>r.id===id);navigate('#'+r.categoryId+'/'+r.id);}
function runsNote(r,batches){const runs=smelterRuns(r,batches);return runs?`<p class="limit-note">That is ${fmt(runs.runs)} smelter runs of up to ${fmt(runs.perRun)} smelts each.</p>`:'';}
function otherMethods(r){const others=recipes.filter(o=>o.categoryId===r.categoryId&&o.id!==r.id&&productName(o)===productName(r));return others.length?`<div class="other-method"><p class="eyebrow">OTHER METHOD</p>${others.map(o=>`<button type="button" data-variant="${esc(o.id)}">${esc(o.ingredients.map(i=>fmt(i.quantity)+' '+itemName(i.itemId)).join(' + '))} makes ${fmt(o.outputQuantity)} ${esc(o.outputName||o.name)}</button>`).join('')}</div>`:'';}
// Pages show the small copy of a photo; if that is missing the full picture is used instead.
function photo(src,alt,title,detail){const thumb=thumbFor(src);return `<div class="photo-slot">${src?`<button data-photo="${esc(src)}" data-alt="${esc(alt||title)}" aria-label="Enlarge ${esc(title)}"><img src="${esc(thumb)}"${thumb===src?'':` data-full="${esc(src)}"`} alt="${esc(alt||title)}" loading="lazy" decoding="async"></button>`:`<div class="photo-placeholder"><span>⌖</span><p>${title.includes('Map')?'Map image':'Bench photo'} awaiting upload</p></div>`}<div class="photo-caption"><span>${esc(title)}</span><small>${esc(detail)}</small></div></div>`;}
function bindPhotos(){document.querySelectorAll('[data-photo]').forEach(b=>{const img=b.querySelector('img');b.onclick=()=>showPhoto(b);img.onerror=()=>{if(img.dataset.full){const full=img.dataset.full;delete img.dataset.full;img.src=full;return;}b.disabled=true;b.innerHTML='<div class="photo-placeholder"><p>Image unavailable. Update the image path.</p></div>';};});}
// The enlarged view opens at once with the small copy that is already on screen, then swaps in the full picture once it has
// loaded. With no connection the small copy simply stays. When the page has several photos, the arrows (or the arrow keys, or
// a swipe) step through them in the order they appear.
const pagePhotos=()=>[...document.querySelectorAll('#content [data-photo]:not(:disabled)')];
let shownPhoto=null;
function showPhoto(button){
  const img=button.querySelector('img'),src=button.dataset.photo,alt=button.dataset.alt,all=pagePhotos(),at=all.indexOf(button);
  const large=$('#large-photo'),small=img.currentSrc||img.src,swap=img.hasAttribute('data-full');
  shownPhoto=button;
  large.src=small;large.alt=alt;large.dataset.want=src;large.classList.toggle('filling',swap&&img.naturalWidth>=800);
  $('#photo-caption').textContent=alt;
  $('#photo-steps').hidden=all.length<2;$('#photo-count').textContent=all.length>1?`${at+1} of ${all.length}`:'';
  if(!$('#photo-dialog').open)$('#photo-dialog').showModal();
  if(!swap)return;
  const full=new Image();full.onload=()=>{if(large.dataset.want===src&&$('#photo-dialog').open){large.src=src;large.classList.remove('filling');}};full.src=src;
}
function stepPhoto(by){const all=pagePhotos();if(all.length<2||!$('#photo-dialog').open)return;showPhoto(all[(Math.max(0,all.indexOf(shownPhoto))+by+all.length)%all.length]);}
$('#photo-prev').onclick=()=>stepPhoto(-1);$('#photo-next').onclick=()=>stepPhoto(1);
$('#photo-dialog').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepPhoto(e.key==='ArrowLeft'?-1:1);}});
{let from=null;const picture=$('#large-photo');
 picture.addEventListener('touchstart',e=>{from=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 picture.addEventListener('touchend',e=>{if(!from)return;const dx=e.changedTouches[0].clientX-from.x,dy=e.changedTouches[0].clientY-from.y;from=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)stepPhoto(dx<0?1:-1);},{passive:true});}
function updateCalculation(){if(category==='smelting'&&smeltMode==='available'){updateAvailable();return;}try{const r=calculate(recipe(),quantity);$('#quantity').removeAttribute('aria-invalid');$('#calculation').innerHTML=`<div class="batch-summary"><div><strong>${fmt(r.batches)}</strong>craft${r.batches===1?'':'s'}</div><div><strong>${fmt(r.output)}</strong>total output</div><div><strong data-surplus>${fmt(r.surplus)}</strong>extra</div></div>${runsNote(recipe(),r.batches)}<div class="craft-time"><p class="eyebrow">TIME TO CRAFT</p><div class="total-row"><span>Per craft</span><b>${duration(recipe().craftTimeSeconds)}</b></div><div class="total-row"><span>${r.totalTimeSeconds===null?'Total time':'Total for '+fmt(r.batches)+(r.batches===1?' craft':' crafts')}</span><b>${duration(r.totalTimeSeconds)}</b></div></div><div class="totals"><p class="eyebrow" >MATERIALS REQUIRED</p>${r.materials.map(i=>`<div class="total-row"><span>${materialLink(i.itemId)}</span><b>${fmt(i.quantity)}</b></div>`).join('')}</div>`;$('#add-plan').disabled=false;}catch(e){$('#quantity').setAttribute('aria-invalid','true');$('#calculation').innerHTML=`<p class="fine">${esc(e.message)}</p>`;$('#add-plan').disabled=true;}}
// The top bar always shows how many recipes are in the plan and links to the plan page.
function updatePlanCount(){const badge=$('#plan-count'),link=$('#plan-link');badge.hidden=!plan.length;badge.textContent=plan.length;link.setAttribute('aria-label',plan.length?`Crafting plan, ${plan.length} recipe${plan.length===1?'':'s'}`:'Crafting plan');if(category==='plan')link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
// The plan is drawn in pieces so that typing a new amount can refresh the notes, time and materials table without
// replacing the field being typed in or the buttons around it (replacing a button mid-click would swallow the click).
const planNote=p=>{const calc=calculate(recipes.find(r=>r.id===p.recipeId),p.quantity);return `${fmt(calc.batches)} craft${calc.batches===1?'':'s'} · ${fmt(calc.output)} output · ${duration(calc.totalTimeSeconds)}${calc.totalTimeSeconds===null?' (time pending)':' crafting'}`;};
// Materials the guide has a recipe for (the smelted metals) can be broken down into what it takes to make them.
const breakable=()=>combinePlan(recipes,plan).filter(t=>recipes.some(r=>r.outputItemId===t.itemId)).map(t=>itemName(t.itemId));
function planView(){return rawMode&&breakable().length?expandPlan(recipes,plan,inventory,methods):{steps:[],materials:combinePlan(recipes,plan,inventory)};}
const methodLabel=r=>r.ingredients.filter(i=>i.itemId!=='coal-ore').map(i=>itemName(i.itemId)).join(' + ')||itemName(r.ingredients[0].itemId);
const stepVerb=(s,n)=>s.recipe.categoryId==='smelting'?(n===1?'smelt':'smelts'):(n===1?'craft':'crafts');
const stepNote=s=>s.batches?`${fmt(s.batches)} ${stepVerb(s,s.batches)} ${s.batches===1?'makes':'make'} ${fmt(s.output)}${s.output>s.missing?', '+fmt(s.output-s.missing)+' spare':''} · ${s.totalTimeSeconds===null?'time pending':duration(s.totalTimeSeconds)}`:s.quantity?'You have enough, nothing to make':'Not needed';
function planTime(view){const timing=planDuration(recipes,plan,view.steps);return `<strong>${timing.unknownRecipes?'Total time incomplete':'Total crafting time: '+duration(timing.totalSeconds)}</strong><p class="fine">${timing.unknownRecipes?duration(timing.knownSeconds)+' known; '+timing.unknownRecipes+(timing.unknownRecipes===1?' recipe still needs':' recipes still need')+' a duration. ':''}${view.steps.length?'Includes the smelting. ':''}Consecutive crafts only; travel and gathering excluded.</p>`;}
function planRows(view){
  const row=(t,extra='')=>`<tr class="${t.quantity?'':'none'}"><td>${materialLink(t.itemId)}${extra}</td><td data-required="${esc(t.itemId)}">${fmt(t.quantity)}</td><td><input type="number" min="0" max="1000000000000" step="1" inputmode="numeric" data-owned="${esc(t.itemId)}" aria-label="${esc(itemName(t.itemId))} already owned" value="${t.owned}"></td><td data-missing="${esc(t.itemId)}">${fmt(t.missing)}</td></tr>`;
  if(!view.steps.length)return view.materials.map(t=>row(t)).join('');
  const method=s=>s.options.length>1?`<select data-method="${esc(s.itemId)}" aria-label="What to make ${esc(itemName(s.itemId))} from">${s.options.map(o=>`<option value="${esc(o.id)}" ${o.id===s.recipe.id?'selected':''}>From ${esc(methodLabel(o))}</option>`).join('')}</select>`:`<small>From ${esc(methodLabel(s.recipe))}</small>`;
  return `<tr class="plan-group"><th colspan="4" scope="colgroup">Make these first</th></tr>${view.steps.map(s=>row(s,`<small data-step-note="${esc(s.itemId)}">${esc(stepNote(s))}</small>${method(s)}`)).join('')}<tr class="plan-group"><th colspan="4" scope="colgroup">Gather or buy these</th></tr>${view.materials.map(t=>row(t)).join('')}`;
}
function planProblem(){const invalid=!!document.querySelector('.plan input[aria-invalid]');$('#copy-plan').disabled=invalid;$('#share-plan').disabled=invalid;return invalid;}
// After an amount changes, every figure worked out from it is refreshed where it stands. The rows themselves never change while
// typing (a row is listed even when its amount drops to 0), so no field loses its place.
function refreshPlan(){
  const view=planView();
  for(const t of [...view.steps,...view.materials]){const required=document.querySelector(`[data-required="${t.itemId}"]`);if(!required)continue;required.textContent=fmt(t.quantity);required.closest('tr').classList.toggle('none',!t.quantity);document.querySelector(`[data-missing="${t.itemId}"]`).textContent=fmt(t.missing);}
  for(const s of view.steps){const note=document.querySelector(`[data-step-note="${s.itemId}"]`);if(note)note.textContent=stepNote(s);}
  $('.plan-time').innerHTML=planTime(view);
  $('#plan-status').textContent=planProblem()?'Correct the highlighted amounts.':'';
}
const planLink=()=>location.origin+location.pathname+'#plan/'+encodePlan(plan);
function planText(){
  const view=planView(),timing=planDuration(recipes,plan,view.steps),line=t=>`${itemName(t.itemId)}: ${t.quantity} required / ${t.owned} owned / ${t.missing} needed`;
  return 'ZEPHYR RP — Crafting plan\n'+plan.map(p=>{const r=recipes.find(r=>r.id===p.recipeId),calc=calculate(r,p.quantity);return `${r.name}: ${p.quantity} requested (${calc.batches} craft${calc.batches===1?'':'s'}; time: ${duration(calc.totalTimeSeconds)})`;}).join('\n')+'\n'+(timing.unknownRecipes?'Time incomplete: '+duration(timing.knownSeconds)+' known; '+timing.unknownRecipes+(timing.unknownRecipes===1?' recipe is':' recipes are')+' missing a duration.':'Total crafting time: '+duration(timing.totalSeconds))+(view.steps.length?'\n\nMake first:\n'+view.steps.map(s=>`${line(s)}${s.batches?` (${s.batches} ${stepVerb(s,s.batches)} from ${methodLabel(s.recipe)})`:''}`).join('\n')+'\n\nGather or buy:\n':'\n\n')+view.materials.map(line).join('\n');
}
function renderPlan(){
  updatePlanCount();
  if(!$('#plan'))return;
  savePlan();
  const view=planView(),names=breakable(),some=names.length>3?names.slice(0,3).join(', ')+' and more':names.join(', ').replace(/, ([^,]*)$/,' and $1');
  $('#plan').innerHTML=`<section class="plan"><div class="section-header"><h2>Your crafting plan</h2><span class="muted">Saved on this device</span></div>${!plan.length?`<p class="muted">${category==='plan'?'Your plan is empty. Open any recipe, set how many you need and choose Add to crafting plan. Everything you add is combined here into one materials list.':'Add recipes to combine their materials into one preparation list. It stays here until you clear it.'}</p>`:`<ul>${plan.map(p=>{const r=recipes.find(r=>r.id===p.recipeId);return `<li><div><a href="#${esc(r.categoryId)}/${esc(r.id)}">${esc(r.name)}</a> <small data-plan-note="${esc(p.recipeId)}">${planNote(p)}</small></div><div class="plan-entry"><input type="number" min="1" max="${MAX_QUANTITY}" step="1" inputmode="numeric" data-plan-quantity="${esc(p.recipeId)}" aria-label="How many ${esc(r.name)} you want" value="${p.quantity}"><button data-remove="${esc(p.recipeId)}" aria-label="Remove ${esc(r.name)} from plan">Remove</button></div></li>`;}).join('')}</ul>${names.length?`<label class="plan-raw"><input type="checkbox" id="plan-raw" ${rawMode?'checked':''}><span><strong>Break down to raw materials</strong><small>Works out the smelting for ${esc(some)}, so the list shows what to gather.</small></span></label>`:''}<div class="plan-time">${planTime(view)}</div><table><thead><tr><th>Material</th><th>Required</th><th>You have</th><th>Still need</th></tr></thead><tbody>${planRows(view)}</tbody></table><p class="fine">Change an amount in the list to update the totals. Repeated requests for the same recipe are combined before rounding to full crafts. ${view.steps.length?'What you already have of a metal reduces how much is smelted, and so the ore for it.':'Inventory reduces the shopping list, not the number of crafts.'}</p><div class="plan-actions"><button id="copy-plan">Copy materials list</button><button id="share-plan">Copy plan link</button><button id="clear-plan" class="quiet">Clear plan</button></div><p id="plan-status" role="status" class="fine"></p>`}</section>`;
  if(!plan.length)return;
  // Typing a new amount updates that recipe and everything worked out from it straight away.
  document.querySelectorAll('[data-plan-quantity]').forEach(input=>input.oninput=()=>{
    const entry=plan.find(p=>p.recipeId===input.dataset.planQuantity),n=Number(input.value);
    try{if(input.value.trim()==='')throw new Error('Enter a whole number from 1 to 1,000,000.');calculate(recipes.find(r=>r.id===entry.recipeId),n);}
    catch(e){input.setAttribute('aria-invalid','true');planProblem();$('#plan-status').textContent=e.message;return;}
    input.removeAttribute('aria-invalid');entry.quantity=n;savePlan();
    document.querySelector(`[data-plan-note="${entry.recipeId}"]`).textContent=planNote(entry);
    refreshPlan();
  });
  document.querySelectorAll('[data-owned]').forEach(input=>input.oninput=()=>{
    const n=Number(input.value);
    if(!Number.isSafeInteger(n)||n<0||n>1e12||input.value===''){input.setAttribute('aria-invalid','true');planProblem();$('#plan-status').textContent='Owned quantities must be whole numbers from 0 to 1,000,000,000,000.';return;}
    input.removeAttribute('aria-invalid');inventory[input.dataset.owned]=n;savePlan();refreshPlan();
  });
  // Switching the breakdown on or off, or choosing another way to make a metal, changes which rows there are, so the plan is redrawn.
  if($('#plan-raw'))$('#plan-raw').onchange=e=>{rawMode=e.target.checked;renderPlan();$('#plan-raw').focus();};
  document.querySelectorAll('[data-method]').forEach(select=>select.onchange=()=>{methods[select.dataset.method]=select.value;renderPlan();document.querySelector(`[data-method="${select.dataset.method}"]`)?.focus();});
  // Removing a recipe or clearing the plan can be taken back for a few seconds, in case of a slip.
  const undo=()=>{const before={plan:plan.map(p=>({...p})),inventory:{...inventory}};return {label:'Undo',action:()=>{plan=before.plan;inventory=before.inventory;savePlan();renderPlan();}};};
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const back=undo(),name=recipes.find(r=>r.id===b.dataset.remove).name;plan=plan.filter(p=>p.recipeId!==b.dataset.remove);renderPlan();toast(name+' removed from your plan.',back);});
  $('#clear-plan').onclick=()=>{const back=undo();plan=[];inventory={};renderPlan();toast('Crafting plan cleared.',back);};
  $('#copy-plan').onclick=async()=>{try{await navigator.clipboard.writeText(planText());$('#plan-status').textContent='Materials list copied.';}catch{$('#plan-status').textContent='Clipboard access is unavailable. You can select and copy the table manually.';}};
  $('#share-plan').onclick=async()=>{try{await navigator.clipboard.writeText(planLink());$('#plan-status').textContent='Plan link copied. Whoever opens it gets the same recipes and amounts.';}catch{$('#plan-status').textContent='Clipboard access is unavailable here.';}};
}
// A plan that arrived by link while this device already has one: show what is in it and let the visitor choose.
function sharedBanner(){
  if(!sharedPlan)return '';
  const list=sharedPlan.map(p=>fmt(p.quantity)+' '+recipes.find(r=>r.id===p.recipeId).name);
  return `<section class="shared-plan" aria-label="Shared crafting plan"><div><p class="eyebrow">SHARED WITH YOU</p><h2>A crafting plan with ${sharedPlan.length} ${sharedPlan.length===1?'recipe':'recipes'}</h2><p class="muted">${esc(list.slice(0,6).join(', '))}${list.length>6?' and '+(list.length-6)+' more':''}. You already have a plan on this device, so choose what to do with this one.</p></div><div class="shared-actions"><button id="shared-add" class="primary">Add to my plan</button><button id="shared-replace">Replace my plan</button><button id="shared-ignore" class="quiet">Ignore</button></div></section>`;
}
function bindShared(){
  if(!sharedPlan)return;
  const finish=message=>{sharedPlan=null;render();$('#main').focus({preventScroll:true});if(message)toast(message);};
  $('#shared-add').onclick=()=>{for(const entry of sharedPlan){const mine=plan.find(p=>p.recipeId===entry.recipeId);if(mine)mine.quantity=Math.min(MAX_QUANTITY,mine.quantity+entry.quantity);else plan.push({...entry});}finish('Shared plan added to yours.');};
  $('#shared-replace').onclick=()=>{plan=sharedPlan.map(entry=>({...entry}));finish('Your plan was replaced with the shared one.');};
  $('#shared-ignore').onclick=()=>finish();
}
// Pins: any recipe, written guide or material can be kept at the top of the menu. They are saved on this device.
const PIN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
function savePins(){try{if(pins.length)localStorage.setItem(PINS_KEY,JSON.stringify(pins));else localStorage.removeItem(PINS_KEY);}catch{}}
function renderPins(){
  const list=pins.map(hash=>pinDetails(hash,guide,recipes)).filter(Boolean),here=currentHash(),current=pinDetails(here,guide,recipes),host=$('#pins'),button=$('#pin-page');
  host.hidden=!list.length;
  host.innerHTML=list.length?`<p class="eyebrow" id="pins-title">PINNED</p><ul aria-labelledby="pins-title">${list.map(pin=>`<li><a href="${esc(pin.hash)}" ${pin.hash===here?'aria-current="page"':''}><span>${esc(pin.label)}</span><small>${esc(pin.detail)}</small></a><button type="button" data-unpin="${esc(pin.hash)}" aria-label="Unpin ${esc(pin.label)}, ${esc(pin.detail)}" title="Unpin">×</button></li>`).join('')}</ul>`:'';
  button.hidden=!current;
  if(!current)return;
  const pinned=pins.includes(current.hash);
  button.dataset.hash=current.hash;button.setAttribute('aria-pressed',String(pinned));
  button.innerHTML=`${PIN_ICON}<span>${pinned?'Pinned':'Pin '+esc(current.label)}</span>`;
  button.title=pinned?'Unpin '+current.label:'Keep '+current.label+' at the top of the menu';
}
$('#pin-page').onclick=e=>{const hash=e.currentTarget.dataset.hash,name=pinDetails(hash,guide,recipes).label;if(pins.includes(hash)){pins=pins.filter(pin=>pin!==hash);toast(name+' unpinned.');}else{pins=[...pins,hash];toast(name+' pinned to the top of the menu.');}savePins();renderPins();};
$('#pins').onclick=e=>{const button=e.target.closest('[data-unpin]');if(!button)return;pins=pins.filter(pin=>pin!==button.dataset.unpin);savePins();if(category==='home')render();else renderPins();($('#pins [data-unpin]')||$('#search-input')).focus();};
// Tapping into a number selects it, so typing replaces the amount instead of adding digits to it.
document.addEventListener('focusin',e=>{const field=e.target;if(field.matches?.('input[type=number]'))requestAnimationFrame(()=>{if(document.activeElement===field)field.select();});});
$('.skip').onclick=e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView();};
// Reload data is a maintainer tool: visitors always get the latest data when they open or refresh the page.
$('#reload').hidden=!EDITING;
$('#reload').onclick=()=>{if(confirm('Reload published data? This discards any unexported editor preview. Your crafting plan is kept.'))load();};
// Copying: a postcode from any location tag, or the address of the page being viewed.
async function copyText(text,done,failed){try{await navigator.clipboard.writeText(text);toast(done);}catch{toast(failed);}}
document.addEventListener('click',e=>{const tag=e.target.closest('[data-copy-postal]');if(tag)copyText(tag.dataset.copyPostal,'Postcode '+tag.dataset.copyPostal+' copied.','Copying is blocked here. The postcode is '+tag.dataset.copyPostal+'.');});
// On the plan page the link carries the plan itself, so whoever opens it gets the same list.
$('#copy-link').onclick=()=>category==='plan'&&plan.length&&!sharedPlan?copyText(planLink(),'Link to your plan copied. Whoever opens it gets the same list.','Copying is blocked here. Use Copy plan link below, or copy the address from your browser’s address bar.'):copyText(location.href,'Link to this page copied.','Copying is blocked here. Copy the address from your browser’s address bar.');
// A window left open (an enlarged photo, say) is closed when the page changes, so it never sits on top of a different page after Back.
window.addEventListener('hashchange',()=>{$('#toast').hidden=true;document.querySelectorAll('dialog[open]').forEach(d=>d.close());keepPlace();const place=enterPage();route(true);if(place!==undefined)scrollTo({top:place,behavior:'instant'});});
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
// Clicking the dimmed backdrop closes a dialog, like pressing Escape.
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
// Site search: results are plain links, so choosing one is ordinary navigation.
function renderSearch(){
  const input=$('#search-input'),results=$('#search-results'),query=input.value.trim();
  const matches=guide&&query?searchGuide(query,guide,recipes):[];
  results.hidden=!query;
  results.innerHTML=matches.length?`<ul>${matches.map(m=>`<li><a href="${esc(m.hash)}"><span>${esc(m.label)}</span><small>${esc(m.detail)}</small></a></li>`).join('')}</ul>`:query?'<p class="muted">Nothing matches that. Try a recipe, material, guide, bench or postcode.</p>':'';
  input.setAttribute('aria-expanded',String(!results.hidden));
}
function closeSearch(){$('#search-input').value='';renderSearch();}
$('#search-input').oninput=renderSearch;
$('#search-input').onkeydown=e=>{const first=$('#search-results a');if(e.key==='ArrowDown'&&first){e.preventDefault();first.focus();}else if(e.key==='Enter'){e.preventDefault();if(first){navigate(first.getAttribute('href'));closeSearch();}}else if(e.key==='Escape')closeSearch();};
$('#search-results').onkeydown=e=>{const links=[...$('#search-results').querySelectorAll('a')],index=links.indexOf(document.activeElement);if(e.key==='ArrowDown'&&index<links.length-1){e.preventDefault();links[index+1].focus();}else if(e.key==='ArrowUp'){e.preventDefault();(index>0?links[index-1]:$('#search-input')).focus();}else if(e.key==='Escape'){closeSearch();$('#search-input').focus();}};
$('#search-results').onclick=e=>{if(e.target.closest('a'))setTimeout(closeSearch);};
$('#search').onsubmit=e=>e.preventDefault();
// The slash key jumps to the search box from anywhere on the page.
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search-input').focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('#search'))$('#search-results').hidden=true;});
$('#search-input').onfocus=renderSearch;
$('#copy-discord').onclick=async e=>{const status=$('#copy-discord-status');try{await navigator.clipboard.writeText(e.currentTarget.dataset.username);status.textContent='Copied.';}catch{status.textContent='Copy failed. The username is uxmbra.';}};
$('#feedback').onclick=()=>$('#feedback-dialog').showModal();
// What's new: the changelog loads on its own, so a problem with it never stops the guide, and the badge counts
// the entries this visitor has not opened. Opening the list marks everything as seen.
async function loadChangelog(){try{const r=await fetch('data/changelog.json',{cache:'no-cache'});if(!r.ok)return;const rows=await r.json();validateChangelog(rows);changelog=rows;renderChangelogBadge();renderHomeNews();}catch(e){console.warn('What’s new is unavailable: '+e.message);}}
function seenChangelog(){try{return JSON.parse(localStorage.getItem(CHANGELOG_KEY));}catch{return null;}}
function renderChangelogBadge(){const n=unseenChanges(changelog,seenChangelog()),badge=$('#whats-new-badge');badge.hidden=!n;badge.textContent=n>9?'9+':n;$('#whats-new').setAttribute('aria-label',n?`What’s new, ${n} unread change${n===1?'':'s'}`:'What’s new');}
function openChangelog(){
  const unseen=unseenChanges(changelog,seenChangelog());
  $('#changelog').innerHTML=changelog.length?changelog.map((e,i)=>`<article class="change${i<unseen?' unread':''}"><div class="change-meta"><time datetime="${esc(e.date)}">${esc(formatDate(e.date))}</time>${i<unseen?'<span class="tag">NEW</span>':''}</div><h3>${esc(e.title)}</h3>${e.notes?.length?`<ul>${e.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</article>`).join(''):'<p class="muted">No changes have been written up yet.</p>';
  $('#changelog-dialog').showModal();
  if(changelog.length){try{localStorage.setItem(CHANGELOG_KEY,JSON.stringify({id:changelog[0].id,date:changelog[0].date}));}catch{}}
  renderChangelogBadge();
}
$('#whats-new').onclick=openChangelog;
loadChangelog();
// Themes: a script in the page head applies the saved choice before the first paint, so there is no flash. Here the picker is
// drawn, a pick is saved and applied at once, and the browser's own colour (theme-color) is kept in step.
const lightScheme=matchMedia('(prefers-color-scheme:light)');
function themeChoice(){try{const c=localStorage.getItem(THEME_KEY);return c===SYSTEM_THEME||THEMES.some(t=>t.id===c)?c:THEMES[0].id;}catch{return THEMES[0].id;}}
function applyTheme(choice){const id=resolveTheme(choice,lightScheme.matches);document.documentElement.dataset.theme=id;$('meta[name=theme-color]').content=THEMES.find(t=>t.id===id).color;document.querySelectorAll('[data-pick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pick===choice)));}
function swatch(id){return `<span class="swatch" data-theme="${id}" aria-hidden="true"><i><b></b><b></b><b></b></i><i><b class="sw-text"></b><b class="sw-muted"></b><b class="sw-accent"></b><b class="sw-gold"></b></i></span>`;}
function renderThemes(){
  $('#theme-options').innerHTML=[...THEMES.map(t=>`<button type="button" class="theme-option" data-pick="${t.id}">${swatch(t.id)}<div><strong>${esc(t.name)}</strong><small>${esc(t.note)}</small></div></button>`),`<button type="button" class="theme-option" data-pick="${SYSTEM_THEME}"><span class="swatch split" aria-hidden="true">${swatch('zephyr')}${swatch('light')}</span><div><strong>Match my device</strong><small>Zephyr when your device is set to dark, Light when it is set to light.</small></div></button>`].join('');
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{try{localStorage.setItem(THEME_KEY,b.dataset.pick);}catch{}applyTheme(b.dataset.pick);});
  applyTheme(themeChoice());
}
renderThemes();
$('#theme-button').onclick=()=>$('#theme-dialog').showModal();
lightScheme.addEventListener('change',()=>{if(themeChoice()===SYSTEM_THEME)applyTheme(SYSTEM_THEME);});
// The data editor is for maintainers only: open the guide with ?edit to show it.
$('#manage').hidden=!EDITING;
$('#manage').onclick=()=>{if(!guide)return;renderEditor();$('#manager').showModal();};
function editorStatus(message,error=false){$('#editor-status').textContent=message;$('#editor-status').classList.toggle('error',error);}
function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);editorStatus('Exported '+name+'. Replace dist/data/'+name+' and republish to update the shared guide.');}
function applyPreview(g,r){validateData(g,r);guide=g;recipes=r;plan=plan.filter(p=>recipes.some(r=>r.id===p.recipeId));route();status('Viewing an editor preview. Export your changes before reloading.');}
function renderEditor(){
  $('#editor-content').innerHTML=`<div class="editor-tabs">${[['photos','Location photos'],['substance-guides','Substance guides'],['heist-guides','Heist guides'],['recipes','Recipe editor'],['json','Advanced data']].map(([id,name])=>`<button data-editor="${id}" class="${id===editorTab?'active':''}">${name}</button>`).join('')}</div><div id="editor-body"></div>`;
  document.querySelectorAll('[data-editor]').forEach(b=>b.onclick=()=>{editorTab=b.dataset.editor;editorStatus('');renderEditor();});
  if(editorTab==='photos')renderPhotoEditor();else if(editorTab==='substance-guides')renderSubstanceEditor();else if(editorTab==='heist-guides')renderHeistGuideEditor();else if(editorTab==='recipes')renderRecipeEditor();else renderJsonEditor();
}
function renderPhotoEditor(){
  $('#editor-body').innerHTML=`<p class="editor-help">Each location has a map image; each bench has its own surroundings photo. Use a hosted HTTPS image URL, or a path such as images/mainland-938-map.webp. Empty fields show “awaiting upload”.</p><label class="editor-form">Choose a bench<select id="edit-bench">${guide.benches.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></label><div id="photo-fields"></div>`;
  const fields=()=>{const b=guide.benches.find(b=>b.id===$('#edit-bench').value);if(!b){$('#photo-fields').textContent='Add a location and bench in Advanced data first.';return;}const l=guide.locations.find(l=>l.id===b.locationId);$('#photo-fields').innerHTML=`<form id="photo-form" class="editor-form"><div class="editor-fields"><label>Location name<input name="locationName" required value="${esc(l.name)}"></label><label>Postcode<input name="postcode" value="${esc(l.postcode)}"></label><label>Map image URL or path<input name="mapImage" value="${esc(l.mapImage)}" placeholder="images/mainland-938-map.webp"></label><label>Map image description<input name="mapAlt" value="${esc(l.mapAlt)}"></label><label>Bench image URL or path<input name="image" value="${esc(b.image)}" placeholder="images/mainland-ammo-bench.webp"></label><label>Bench image description<input name="imageAlt" value="${esc(b.imageAlt)}"></label><label>Location directions / notes<input name="locationNotes" value="${esc(l.notes)}"></label><label>Bench directions / notes<input name="benchNotes" value="${esc(b.notes)}"></label></div><div class="editor-actions"><button class="primary" type="submit">Apply photo details to preview</button><button id="export-guide" type="button">Export guide.json</button></div></form>`;
    $('#photo-form').onsubmit=e=>{e.preventDefault();try{const f=new FormData(e.target),g=structuredClone(guide),loc=g.locations.find(x=>x.id===l.id),bench=g.benches.find(x=>x.id===b.id);Object.assign(loc,{name:f.get('locationName').trim(),postcode:f.get('postcode').trim(),mapImage:f.get('mapImage').trim(),mapAlt:f.get('mapAlt'),notes:f.get('locationNotes')});Object.assign(bench,{image:f.get('image').trim(),imageAlt:f.get('imageAlt'),notes:f.get('benchNotes')});applyPreview(g,recipes);editorStatus('Photo details applied to this preview. Export guide.json to keep them.');}catch(err){editorStatus(err.message,true);}};$('#export-guide').onclick=()=>download('guide.json',guide);};
  const showFields=()=>{fields();const b=guide.benches.find(b=>b.id===$('#edit-bench').value);if(b){$('#photo-fields').insertAdjacentHTML('afterbegin',imageInstructions(b));}};
  $('#edit-bench').onchange=showFields;showFields();
}
function imageInstructions(bench){
  const loc=guide.locations.find(l=>l.id===bench.locationId),mapName=loc.mapImage?.startsWith('images/')?loc.mapImage.slice(7):loc.id+'-map.webp',benchName=bench.image?.startsWith('images/')?bench.image.slice(7):bench.id+'-bench.webp';
  return `<details class="image-help" open><summary>Where to put images for ${esc(bench.name)}</summary><p>Save both screenshots in your project’s <code>zephyr-guide/dist/images/</code> folder.</p><table><thead><tr><th>Guide position</th><th>Filename & matching field value</th></tr></thead><tbody><tr><td>Map location<br><small>${postalLabel(loc)} ${esc(loc.postcode)}</small></td><td><code>${esc(mapName)}</code><br>Map image field: <code>images/${esc(mapName)}</code></td></tr><tr><td>Bench & surroundings</td><td><code>${esc(benchName)}</code><br>Bench image field: <code>images/${esc(benchName)}</code></td></tr></tbody></table><ol><li>Save the images using these names, or your own descriptive filenames. PNG, JPG, JPEG, WebP and GIF work. Use the actual file extension in the field; renaming a PNG to WebP does not convert it.</li><li>Enter the matching paths in the form below. The <strong>field assigns the position</strong>; the filename alone does not. Paths start with <code>images/</code>, not <code>dist/images/</code>.</li><li>Apply to preview, export <code>guide.json</code>, and replace <code>zephyr-guide/dist/data/guide.json</code> with the exported file.</li><li>Republish the images and JSON together. Files saved only on your PC are not uploaded by this form and will not appear on the hosted site until published.</li></ol><p>For replacements, use a new filename such as <code>${esc(loc.id)}-map-v2.webp</code> and update its field to avoid cached images. Landscape screenshots around 1600 × 900 work well. The full image is shown without cropping; click it to enlarge.</p></details>`;
}
function renderRecipeEditor(){
  $('#editor-body').innerHTML=`<label class="editor-form">Recipe<select id="edit-recipe"><option value="new">Add a new recipe</option>${recipes.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><div id="recipe-fields"></div>`;
  if(recipe())$('#edit-recipe').value=selectedId;
  const fields=()=>{const existing=recipes.find(r=>r.id===$('#edit-recipe').value),r=existing||{id:'',name:'',categoryId:guide.categories[0].id,benchId:null,outputQuantity:1,ingredients:[],notes:''};$('#recipe-fields').innerHTML=`<form id="recipe-form" class="editor-form"><div class="editor-fields"><label>Stable recipe ID<input name="id" required pattern="[a-z0-9\\-]+" ${existing?'readonly':''} value="${esc(r.id)}" placeholder="ammo-example"></label><label>Recipe name<input name="name" required value="${esc(r.name)}"></label><label>Category<select name="categoryId">${guide.categories.filter(c=>c.id!=='substances'&&c.id!=='heist-guides').map(c=>`<option value="${esc(c.id)}" ${c.id===r.categoryId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label id="weapon-tier-field">Weapon tier<select name="tier">${[1,2,3].map(t=>`<option value="${t}" ${t===(r.tier||3)?'selected':''}>Tier ${t}</option>`).join('')}</select></label><label id="ammo-method-field">Ammo crafting method<select name="method">${Object.entries(AMMO_METHODS).map(([id,name])=>`<option value="${id}" ${id===(r.method||'mainland')?'selected':''}>${name}</option>`).join('')}</select></label><label id="substance-section-field">Substance section<select name="substance">${Object.entries(SUBSTANCE_SECTIONS).map(([id,name])=>`<option value="${id}" ${id===(r.substance||'meth')?'selected':''}>${name}</option>`).join('')}</select></label><label>Bench<select name="benchId"><option value="" ${r.benchId===null?'selected':''}>Location not supplied</option>${guide.benches.map(b=>`<option value="${esc(b.id)}" ${b.id===r.benchId?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label><label>Output per craft<input name="outputQuantity" type="number" required min="1" max="1000000" step="1" value="${r.outputQuantity}"></label><label>Time per craft (seconds)<input name="craftTimeSeconds" type="number" required min="1" max="86400" step="1" value="${r.craftTimeSeconds??''}" placeholder="Required, e.g. 30"></label><label>Output item name<input name="outputName" value="${esc(r.outputName||'')}" placeholder="Optional, e.g. Copper Ingot"></label><label>Notes / requirements<input name="notes" value="${esc(r.notes)}"></label></div><h3>Ingredients per craft</h3><p class="editor-help">Set unused ingredients to 0. Add new material types in Advanced data → guide.json.</p><div class="editor-fields">${guide.items.map(i=>`<label>${esc(i.name)}<input type="number" name="ingredient:${esc(i.id)}" min="0" max="1000000" step="1" required value="${r.ingredients.find(x=>x.itemId===i.id)?.quantity||0}"></label>`).join('')}</div><div class="editor-actions"><button type="submit" class="primary">Apply recipe to preview</button><button type="button" id="export-recipes">Export category JSON</button></div></form>`;
    const syncTier=()=>{const isWeapon=$('#recipe-form [name=categoryId]').value==='weapons';$('#weapon-tier-field').hidden=!isWeapon;$('#recipe-form [name=tier]').disabled=!isWeapon;const isAmmo=$('#recipe-form [name=categoryId]').value==='ammo';$('#ammo-method-field').hidden=!isAmmo;$('#recipe-form [name=method]').disabled=!isAmmo;const isSubstance=$('#recipe-form [name=categoryId]').value==='substances';$('#substance-section-field').hidden=!isSubstance;$('#recipe-form [name=substance]').disabled=!isSubstance;};$('#recipe-form [name=categoryId]').onchange=syncTier;syncTier();
    $('#recipe-form').onsubmit=e=>{e.preventDefault();try{const f=new FormData(e.target),next={...r,id:f.get('id').trim(),name:f.get('name').trim(),categoryId:f.get('categoryId'),benchId:f.get('benchId')||null,outputQuantity:Number(f.get('outputQuantity')),craftTimeSeconds:Number(f.get('craftTimeSeconds')),outputName:f.get('outputName').trim(),notes:f.get('notes'),source:r.source||'Supplied by guide maintainer',ingredients:guide.items.map(i=>({itemId:i.id,quantity:Number(f.get('ingredient:'+i.id))})).filter(i=>i.quantity!==0)};if(next.categoryId==='weapons')next.tier=Number(f.get('tier'));else delete next.tier;if(next.categoryId==='ammo')next.method=f.get('method');else delete next.method;if(next.categoryId==='substances')next.substance=f.get('substance');else delete next.substance;const updated=existing?recipes.map(x=>x.id===existing.id?next:x):[...recipes,next];validateData(guide,updated);applyPreview(guide,updated);const moved=existing&&existing.categoryId!==next.categoryId;renderRecipeEditor();$('#edit-recipe').value=next.id;$('#edit-recipe').dispatchEvent(new Event('change'));editorStatus(moved?'Recipe moved in preview. Export both its old and new category files from Advanced data.':'Recipe applied to preview. Export the category JSON to keep this change.');}catch(err){editorStatus(err.message,true);}};
    $('#export-recipes').onclick=()=>{const id=$('#recipe-form [name=categoryId]').value,c=guide.categories.find(c=>c.id===id);download(c.file,recipes.filter(r=>r.categoryId===id));};};
  $('#edit-recipe').onchange=fields;fields();
}
function renderJsonEditor(){
  $('#editor-body').innerHTML=`<p class="editor-help">Edit locations, benches, materials, or recipes as plain JSON. Create new locations and benches in guide.json, then assign recipes to their IDs. Importing replaces only the selected file in this preview.</p><div class="editor-form"><label>Data file<select id="json-file"><option value="guide.json">guide.json — locations, benches & materials</option>${guide.categories.map(c=>`<option value="${esc(c.file)}">${esc(c.file)}</option>`).join('')}</select></label><label>JSON content<textarea id="json-source" spellcheck="false"></textarea></label><label class="editor-file">Load a JSON file<input type="file" id="json-import" accept=".json,application/json"></label><div class="editor-actions"><button class="primary" id="apply-json">Validate & apply to preview</button><button id="export-json">Export JSON content</button></div></div>`;
  const populate=()=>{const file=$('#json-file').value,c=guide.categories.find(c=>c.file===file);$('#json-source').value=JSON.stringify(c?recipes.filter(r=>r.categoryId===c.id):guide,null,2);};$('#json-file').onchange=populate;populate();
  const read=()=>{const value=JSON.parse($('#json-source').value),file=$('#json-file').value,c=guide.categories.find(c=>c.file===file);if(c){if(!Array.isArray(value)||value.some(r=>r.categoryId!==c.id))throw new Error('Every recipe in this file must use categoryId '+c.id);validateData(guide,[...recipes.filter(r=>r.categoryId!==c.id),...value]);}else validateData(value,recipes);return {value,file,c};};
  $('#json-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw new Error('JSON files must be smaller than 2 MB.');const data=JSON.parse(await file.text());$('#json-source').value=JSON.stringify(data,null,2);editorStatus('Loaded into the editor. Validate & apply to preview when ready.');}catch(err){editorStatus(err.message,true);}};
  $('#apply-json').onclick=()=>{try{const {value,c}=read();if(c)applyPreview(guide,[...recipes.filter(r=>r.categoryId!==c.id),...value]);else applyPreview(value,recipes);editorStatus('Valid data applied to preview. Export the file to keep your changes.');}catch(err){editorStatus(err.message,true);}};
  $('#export-json').onclick=()=>{try{const {file,value}=read();download(file,value);}catch(err){editorStatus(err.message,true);}};
}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_crafting_calculator',description:'Select a guide recipe and set its desired output quantity in the visible calculator. Does not add it to a plan or save guide data.',inputSchema:{type:'object',properties:{recipeId:{type:'string'},quantity:{type:'integer',minimum:1,maximum:MAX_QUANTITY}},required:['recipeId','quantity'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.recipeId!=='string')throw new Error('Recipe ID is required.');const r=recipes.find(r=>r.id===input.recipeId);if(!r)throw new Error('Recipe not found.');const result=calculate(r,input.quantity);selectedId=r.id;quantity=input.quantity;category=r.categoryId;if(category==='business')configureBusiness(r.id,input.quantity);if(category==='weapons')weaponTier=r.tier;if(category==='ammo')ammoMethod=r.method;if(category==='substances')substanceSection=r.substance;smeltMode='target';history.replaceState(history.state,'','#'+category);render();return {recipe:r.name,...result};}})).catch(()=>{});}catch{}}
load();


