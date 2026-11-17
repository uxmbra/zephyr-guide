export const MAX_QUANTITY=1000000;
export const SUBSTANCE_SECTIONS={meth:'Meth',cocaine:'Cocaine',weed:'Weed',lsd:'LSD'};
export const GATHERING_METHODS={'hobo-camps':'Hobo Camps','bin-diving':'Bin Diving','metal-detecting':'Metal Detecting','scrap-yard':'Scrap Yard','recycling-centre':'Recycling Centre'};
export const AMMO_METHODS={mainland:'Mainland',cayo:'Cayo'};
// Chapters of every written guide (substances, gathering and heists), in display order.
export const GUIDE_SECTIONS={overview:'Overview',requirements:'Before you start',locations:'Locations',steps:'Step-by-step guide',tips:'Tips & notes'};
export const GUIDE_TEXT_FIELDS=Object.keys(GUIDE_SECTIONS);
// Looks a visitor can pick. Each has a block of colours in theme.css; `color` is its sidebar colour, which the browser paints around the page.
export const THEMES=[
 {id:'zephyr',name:'Zephyr',note:'The city’s own colours: deep purple and violet.',scheme:'dark',color:'#120d1f'},
 {id:'slate',name:'Slate',note:'The guide’s earlier look: deep slate and teal.',scheme:'dark',color:'#0f1519'},
 {id:'light',name:'Light',note:'Clean and bright for daytime.',scheme:'light',color:'#ffffff'},
 {id:'midnight',name:'Midnight',note:'Pure black for OLED screens.',scheme:'dark',color:'#060809'},
 {id:'nord',name:'Nord',note:'Cool arctic blues.',scheme:'dark',color:'#292e39'},
 {id:'dracula',name:'Dracula',note:'Purple on charcoal.',scheme:'dark',color:'#21222c'},
 {id:'solarized-dark',name:'Solarized Dark',note:'Low-glare teal on deep blue.',scheme:'dark',color:'#00232d'},
 {id:'solarized-light',name:'Solarized Light',note:'Warm paper tones.',scheme:'light',color:'#f4ecd7'},
 {id:'contrast',name:'High contrast',note:'Black, white and bold colours.',scheme:'dark',color:'#000000'},
];
export const SYSTEM_THEME='system';
// Turns a saved choice into a theme id: `system` follows the device, and anything unknown is the default look.
export function resolveTheme(choice,prefersLight=false){if(choice===SYSTEM_THEME)return prefersLight?'light':'zephyr';return THEMES.some(t=>t.id===choice)?choice:THEMES[0].id;}
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=n=>n.toLocaleString('en-AU');
// Pages that are built from the data rather than listed as a category in guide.json.
export const EXTRA_PAGES={locations:'Locations & benches',materials:'Materials',plan:'Crafting plan'};
// Every page has an address: #category, or #category/selection for a recipe, tier, method, guide section, heist guide, location or material.
export function resolveRoute(hash,guide,recipes){
  const [id,sub='']=String(hash||'').replace(/^#/,'').split('/');
  const category=Object.hasOwn(EXTRA_PAGES,id)||guide.categories.some(c=>c.id===id)?id:guide.categories[0].id;
  const route={category};
  if(!sub)return route;
  const recipe=recipes.find(r=>r.id===sub&&r.categoryId===category);
  if(recipe){route.recipeId=recipe.id;if(recipe.tier)route.tier=recipe.tier;if(recipe.method)route.method=recipe.method;return route;}
  if(category==='weapons'&&/^tier-[123]$/.test(sub))route.tier=Number(sub.slice(5));
  else if(category==='ammo'&&Object.hasOwn(AMMO_METHODS,sub))route.method=sub;
  else if(category==='substances'&&Object.hasOwn(SUBSTANCE_SECTIONS,sub))route.substance=sub;
  else if(category==='gathering'&&Object.hasOwn(GATHERING_METHODS,sub))route.gathering=sub;
  else if(category==='heist-guides'&&(guide.heistGuides||[]).some(g=>g.id===sub))route.heistGuide=sub;
  else if(category==='locations'&&guide.locations.some(l=>l.id===sub))route.location=sub;
  else if(category==='materials'&&guide.items.some(i=>i.id===sub))route.material=sub;
  else if(category==='plan'){const shared=decodePlan(sub,recipes);if(shared.length)route.shared=shared;}
  return route;
}
// A plan can be passed on as an address: #plan/ammo-9mm.600_smelting-brass.12 is each recipe ID, a dot and the amount,
// joined by underscores. Reading one back keeps only recipes the guide still has, with sensible amounts, once each.
export function encodePlan(plan){return plan.map(p=>p.recipeId+'.'+p.quantity).join('_');}
export function decodePlan(text,recipes){
  const plan=[];
  for(const part of String(text||'').split('_').slice(0,200)){
    const match=/^([a-z0-9-]+)\.([1-9]\d{0,6})$/.exec(part);
    if(!match||Number(match[2])>MAX_QUANTITY||plan.some(p=>p.recipeId===match[1])||!recipes.some(r=>r.id===match[1]))continue;
    plan.push({recipeId:match[1],quantity:Number(match[2])});
  }
  return plan;
}
// Pages worth pinning are the ones with a selection in their address: a recipe, a written guide or a material.
// Returns the tidy address with a name and a short description, or null for anything else (or anything that no longer exists).
export function pinDetails(hash,guide,recipes){
  const r=resolveRoute(hash,guide,recipes),category=guide.categories.find(c=>c.id===r.category);
  if(r.category==='business')return null;
  if(r.recipeId){const recipe=recipes.find(x=>x.id===r.recipeId);return {hash:'#'+r.category+'/'+recipe.id,label:recipe.name,detail:[category.name,recipe.tier?'Tier '+recipe.tier:'',recipe.method?AMMO_METHODS[recipe.method]:''].filter(Boolean).join(' · ')};}
  if(r.substance)return {hash:'#substances/'+r.substance,label:SUBSTANCE_SECTIONS[r.substance],detail:'Substance guide'};
  if(r.gathering)return {hash:'#gathering/'+r.gathering,label:GATHERING_METHODS[r.gathering],detail:'Gathering guide'};
  if(r.heistGuide)return {hash:'#heist-guides/'+r.heistGuide,label:guide.heistGuides.find(g=>g.id===r.heistGuide).name,detail:'Heist guide'};
  if(r.material)return {hash:'#materials/'+r.material,label:guide.items.find(i=>i.id===r.material).name,detail:'Material'};
  return null;
}
// Local photos have a small copy in images/thumbs/ (always WebP) for the page; the full picture loads when it is enlarged.
export function thumbFor(src){const match=/^images\/(?!thumbs\/)(.+)\.(?:png|jpe?g|webp|gif)$/i.exec(src||'');return match?'images/thumbs/'+match[1]+'.webp':src;}
// The changelog is a list of entries, newest first, that the What's new button shows.
export function validateChangelog(rows){
  const fail=m=>{throw new Error(m);};
  if(!Array.isArray(rows))fail('The changelog must be a list.');
  const ids=new Set();let previous='9999-12-31';
  for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row))fail('Each change must be an object.');
    if(typeof row.id!=='string'||!/^[a-z0-9-]+$/.test(row.id)||ids.has(row.id))fail('Each change needs a unique lowercase ID.');ids.add(row.id);
    if(typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||new Date(row.date+'T00:00:00Z').toISOString().slice(0,10)!==row.date)fail('Change dates must be real dates written YYYY-MM-DD.');
    if(row.date>previous)fail('Changes must be listed newest first.');previous=row.date;
    if(typeof row.title!=='string'||!row.title.trim())fail('Each change needs a title.');
    if(row.notes!==undefined&&(!Array.isArray(row.notes)||row.notes.some(n=>typeof n!=='string'||!n.trim())))fail('Change notes must be a list of sentences.');
    for(const key of Object.keys(row))if(!['id','date','title','notes'].includes(key))fail('Unknown change field: '+key);
  }
  return true;
}
// How many changes the visitor has not opened. A visitor who has never opened the list sees the last month as new;
// after that, everything above the entry they last saw. If that entry was edited away, its date decides instead.
export function unseenChanges(changelog,seen,today=new Date()){
  if(!changelog.length)return 0;
  if(seen&&typeof seen==='object'){const index=changelog.findIndex(e=>e.id===seen.id);return index>=0?index:changelog.filter(e=>e.date>String(seen.date||'')).length;}
  const cutoff=new Date(today.getTime()-30*864e5).toISOString().slice(0,10);
  return changelog.filter(e=>e.date>=cutoff).length;
}
export function formatDate(date){return new Date(date+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});}
// Every material with the recipes that make it and the recipes that use it, sorted by name.
export function materialIndex(guide,recipes){
  return guide.items.map(item=>({id:item.id,name:item.name,madeBy:recipes.filter(r=>r.outputItemId===item.id),usedIn:recipes.flatMap(r=>{const i=r.ingredients.find(i=>i.itemId===item.id);return i?[{recipe:r,quantity:i.quantity}]:[];})})).sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}));
}
// Finds recipes, guides, locations and materials by name or postcode. Exact names first, then names that start with the query,
// then any match. Several words match when every word appears in the name or its detail line, so "cayo 9mm" finds the Cayo recipe.
export function searchGuide(query,guide,recipes,limit=8){
  const q=String(query||'').trim().toLowerCase().replace(/\s+/g,' ');
  if(!q)return [];
  const categoryName=id=>guide.categories.find(c=>c.id===id)?.name||id;
  const entries=[];
  for(const r of recipes)entries.push({label:r.name,detail:[categoryName(r.categoryId),r.tier?'Tier '+r.tier:'',r.method?AMMO_METHODS[r.method]:''].filter(Boolean).join(' · '),hash:'#'+r.categoryId+'/'+r.id,keys:[r.name,r.outputName]});
  for(const [id,name] of Object.entries(SUBSTANCE_SECTIONS))entries.push({label:name,detail:'Substance guide',hash:'#substances/'+id,keys:[name]});
  for(const [id,name] of Object.entries(GATHERING_METHODS))entries.push({label:name,detail:'Gathering guide',hash:'#gathering/'+id,keys:[name]});
  for(const g of guide.heistGuides||[])entries.push({label:g.name,detail:'Heist guide',hash:'#heist-guides/'+g.id,keys:[g.name]});
  for(const l of guide.locations){const benches=guide.benches.filter(b=>b.locationId===l.id);entries.push({label:benches.length===1?benches[0].name:l.name,detail:'Location'+(l.postcode?' · postcode '+l.postcode:''),hash:'#locations/'+l.id,keys:[l.name,l.postcode,...benches.map(b=>b.name)]});}
  for(const m of materialIndex(guide,recipes))entries.push({label:m.name,detail:'Material · used in '+m.usedIn.length+(m.usedIn.length===1?' recipe':' recipes'),hash:'#materials/'+m.id,keys:[m.name]});
  const words=q.split(' ');
  const score=entry=>{
    const best=entry.keys.reduce((best,key)=>{const value=String(key||'').toLowerCase();return Math.max(best,!value?0:value===q?3:value.startsWith(q)?2:value.includes(q)?1:0);},0);
    if(best||words.length<2)return best;
    const text=[...entry.keys,entry.detail].join(' ').toLowerCase();
    return words.every(word=>text.includes(word))?.5:0;
  };
  return entries.map(({keys,...entry})=>({...entry,score:score({keys,...entry})})).filter(entry=>entry.score).sort((a,b)=>b.score-a.score).slice(0,limit).map(({score,...entry})=>entry);
}
// limits: other ingredients the player has, e.g. {'coal-ore':200}. The scarcest one sets the number of crafts.
export function calculateAvailable(recipe,itemId,available,limits={}){
  if(!Number.isSafeInteger(available)||available<0||available>MAX_QUANTITY)throw new Error('Enter a whole number from 0 to 1,000,000.');
  const input=recipe.ingredients.find(i=>i.itemId===itemId);
  if(!input)throw new Error('Choose an ingredient from this recipe.');
  let batches=Math.floor(available/input.quantity),limitedBy=itemId;
  for(const [id,amount] of Object.entries(limits)){
    const limit=recipe.ingredients.find(i=>i.itemId===id);
    if(!limit||id===itemId)continue;
    if(!Number.isSafeInteger(amount)||amount<0||amount>MAX_QUANTITY)throw new Error('Enter a whole number from 0 to 1,000,000.');
    if(Math.floor(amount/limit.quantity)<batches){batches=Math.floor(amount/limit.quantity);limitedBy=id;}
  }
  const output=batches*recipe.outputQuantity;
  return {batches,output,itemId,available,limitedBy,used:batches*input.quantity,leftover:available-batches*input.quantity,totalTimeSeconds:batches===0?0:recipe.craftTimeSeconds==null?null:batches*recipe.craftTimeSeconds,materials:recipe.ingredients.map(i=>({...i,quantity:i.quantity*batches}))};
}
export function smelterRuns(recipe,batches){
  if(!recipe.maxCraftsPerRun||batches<=recipe.maxCraftsPerRun)return null;
  return {runs:Math.ceil(batches/recipe.maxCraftsPerRun),perRun:recipe.maxCraftsPerRun};
}
export function calculate(recipe,quantity){
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>MAX_QUANTITY)throw new Error('Enter a whole number from 1 to 1,000,000.');
  const batches=Math.ceil(quantity/recipe.outputQuantity);
  const output=batches*recipe.outputQuantity;
  return {quantity,batches,output,totalTimeSeconds:recipe.craftTimeSeconds==null?null:batches*recipe.craftTimeSeconds,surplus:output-quantity,materials:recipe.ingredients.map(i=>({...i,quantity:i.quantity*batches}))};
}
export function combinePlan(recipes,plan,inventory={}){
  const totals={};
  for(const entry of plan){const recipe=recipes.find(r=>r.id===entry.recipeId);if(!recipe)throw new Error('A planned recipe no longer exists.');for(const i of calculate(recipe,entry.quantity).materials)totals[i.itemId]=(totals[i.itemId]||0)+i.quantity;}
  return Object.entries(totals).map(([itemId,quantity])=>({itemId,quantity,owned:inventory[itemId]||0,missing:Math.max(0,quantity-(inventory[itemId]||0))}));
}
// Breaks a plan down to raw materials. Anything a recipe in the guide can make (the smelted metals) becomes a step: the amount
// still missing after what the player already has is rounded up to full crafts, and that step's ingredients join the list.
// Steps come out in the order to read them (Steel before the Iron it needs); `methods` picks a recipe where an item has several.
// Every item that could be needed gets a row even when its amount is 0, so the list keeps its shape while "You have" is typed.
export function expandPlan(recipes,plan,inventory={},methods={}){
  const optionsFor=id=>recipes.filter(r=>r.outputItemId===id);
  const maker=id=>{const options=optionsFor(id);return options.find(r=>r.id===methods[id])||options[0];};
  const totals=new Map(combinePlan(recipes,plan).map(t=>[t.itemId,t.quantity]));
  const pending=new Set();
  const visit=id=>{const r=maker(id);if(!r||pending.has(id))return;pending.add(id);for(const i of r.ingredients)if(!totals.has(i.itemId))totals.set(i.itemId,0);for(const i of r.ingredients)visit(i.itemId);};
  [...totals.keys()].forEach(visit);
  const steps=[];
  while(pending.size){
    // An item is ready once nothing still waiting needs it as an ingredient. Recipes that feed each other in a loop are left as they are.
    const id=[...pending].find(p=>![...pending].some(q=>q!==p&&maker(q).ingredients.some(i=>i.itemId===p)));
    if(id===undefined)break;
    pending.delete(id);
    const recipe=maker(id),quantity=totals.get(id),owned=inventory[id]||0,missing=Math.max(0,quantity-owned),batches=Math.ceil(missing/recipe.outputQuantity);
    for(const i of recipe.ingredients)totals.set(i.itemId,totals.get(i.itemId)+i.quantity*batches);
    steps.push({itemId:id,recipe,options:optionsFor(id),quantity,owned,missing,batches,output:batches*recipe.outputQuantity,totalTimeSeconds:batches===0?0:recipe.craftTimeSeconds==null?null:batches*recipe.craftTimeSeconds});
  }
  const made=new Set(steps.map(s=>s.itemId));
  return {steps,materials:[...totals].filter(([id])=>!made.has(id)).map(([itemId,quantity])=>({itemId,quantity,owned:inventory[itemId]||0,missing:Math.max(0,quantity-(inventory[itemId]||0))}))};
}
const validGuideImages=value=>Array.isArray(value)&&!value.some(image=>!image||typeof image!=='object'||typeof image.src!=='string'||!image.src||!safeImage(image.src)||typeof (image.title??'')!=='string'||typeof (image.alt??'')!=='string'||typeof (image.detail??'')!=='string');
export function safeImage(value){return typeof value==='string'&&(value===''||/^https:\/\//i.test(value)||/^images\/[a-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..'));}
// Pass {links:false} to check guide.json on its own, before the recipe files are loaded.
export function validateData(guide,recipes,{links=true}={}){
  const fail=m=>{throw new Error(m);};
  if(guide.version!==1)fail('Unsupported guide version. Expected version 1.');
  for(const [field,sections,label] of [['substanceGuides',SUBSTANCE_SECTIONS,'substance'],['gatheringGuides',GATHERING_METHODS,'gathering']]){
    if(guide[field]===undefined)continue;
    if(!guide[field]||typeof guide[field]!=='object'||Array.isArray(guide[field]))fail('The '+label+' guides must be an object.');
    for(const [id,entry] of Object.entries(guide[field])){
      if(!Object.hasOwn(sections,id)||!entry||typeof entry!=='object'||Array.isArray(entry))fail('Invalid '+label+' guide.');
      for(const [key,value] of Object.entries(entry)){if(key==='images'){if(!validGuideImages(value))fail('Guide images need an HTTPS URL or images/ path.');continue;}if(!GUIDE_TEXT_FIELDS.includes(key)||typeof value!=='string')fail('Guide sections must contain plain text.');}
    }
  }
  if(guide.heistGuides!==undefined){
    if(!Array.isArray(guide.heistGuides))fail('Heist guides must be a list.');
    const seen=new Set();
    for(const entry of guide.heistGuides){
      if(!entry||typeof entry!=='object'||Array.isArray(entry)||typeof entry.id!=='string'||!/^[a-z0-9-]+$/.test(entry.id)||seen.has(entry.id)||typeof entry.name!=='string'||!entry.name.trim())fail('Heist guides need unique IDs and names.');seen.add(entry.id);
      for(const [key,value] of Object.entries(entry)){if(key==='id'||key==='name')continue;if(key==='images'){if(!validGuideImages(value))fail('Guide images need an HTTPS URL or images/ path.');continue;}if(key==='itemIds'){if(!Array.isArray(value)||value.some(id=>typeof id!=='string')||new Set(value).size!==value.length)fail('Heist guide items must be a list of unique recipe IDs.');continue;}if(!GUIDE_TEXT_FIELDS.includes(key)||typeof value!=='string')fail('Guide sections must contain plain text.');}
    }
  }
  for(const key of ['categories','items','locations','benches'])if(!Array.isArray(guide[key]))fail('Missing '+key+' array.');
  if(!guide.categories.length||!guide.items.length)fail('At least one category and material are required.');
  if(guide.pendingCraftTimeRecipeIds!==undefined&&(!Array.isArray(guide.pendingCraftTimeRecipeIds)||guide.pendingCraftTimeRecipeIds.some(id=>typeof id!=='string')))fail('Pending craft-time exceptions must be a list of recipe IDs.');
  const ids={};
  for(const key of ['categories','items','locations','benches']){ids[key]=new Set();for(const row of guide[key]){if(!row||typeof row.id!=='string'||!/^[a-z0-9-]+$/.test(row.id)||!row.name||typeof row.name!=='string'||ids[key].has(row.id))fail('Invalid or duplicate ID/name in '+key+'.');ids[key].add(row.id);}}
  const files=new Set();for(const c of guide.categories){if(!/^[a-z0-9-]+\.json$/.test(c.file)||c.file==='guide.json'||files.has(c.file))fail('Category files must be unique simple JSON filenames.');files.add(c.file);}
  for(const l of guide.locations){if(typeof l.postcode!=='string')fail('Location postcode must be text.');if(l.warning!==undefined&&typeof l.warning!=='string')fail('Location warning must be text.');if(!safeImage(l.mapImage))fail('Use an HTTPS URL or images/ path for map photos.');}
  for(const b of guide.benches){if(!ids.locations.has(b.locationId))fail('Bench references an unknown location.');if(!safeImage(b.image))fail('Use an HTTPS URL or images/ path for bench photos.');}
  if(!Array.isArray(recipes))fail('Recipes must be an array.');const seen=new Set();
  for(const r of recipes)if(r?.categoryId==='weapons'&&![1,2,3].includes(r.tier))fail('Weapon recipes require tier 1, 2 or 3.');
  for(const r of recipes)if(r?.categoryId==='ammo'&&!Object.hasOwn(AMMO_METHODS,r.method))fail('Ammo recipes require a crafting method: mainland or cayo.');
  for(const r of recipes)if(r?.categoryId==='substances'&&!Object.hasOwn(SUBSTANCE_SECTIONS,r.substance))fail('Substance recipes require a section: meth, cocaine, weed or lsd.');
  for(const r of recipes){if(!r||typeof r.id!=='string'||!/^[a-z0-9-]+$/.test(r.id)||seen.has(r.id)||typeof r.name!=='string'||!r.name.trim())fail('Recipes need unique IDs and names.');seen.add(r.id);if(r.craftTimeSeconds===null){if(!guide.pendingCraftTimeRecipeIds?.includes(r.id))fail('Craft time is required for '+r.name+'.');}else if(!Number.isSafeInteger(r.craftTimeSeconds)||r.craftTimeSeconds<1||r.craftTimeSeconds>86400)fail('Craft time must be a whole number of seconds from 1 to 86,400 for '+r.name+'.');if(!ids.categories.has(r.categoryId)||(r.benchId!==null&&!ids.benches.has(r.benchId)))fail('Recipe references an unknown category or bench.');if(!Number.isSafeInteger(r.outputQuantity)||r.outputQuantity<1||r.outputQuantity>MAX_QUANTITY)fail('Recipe output must be a positive whole number up to 1,000,000.');if(!Array.isArray(r.ingredients)||!r.ingredients.length)fail('Recipes need at least one ingredient.');const ing=new Set();for(const i of r.ingredients){if(!ids.items.has(i.itemId)||ing.has(i.itemId)||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>MAX_QUANTITY)fail('Ingredient IDs must exist, appear once, and have positive whole quantities up to 1,000,000.');ing.add(i.itemId);}}
  for(const r of recipes)if(r.outputItemId!==undefined&&!ids.items.has(r.outputItemId))fail(r.name+' produces an unknown item.');
  if(links)for(const entry of guide.heistGuides||[])for(const id of entry.itemIds||[])if(!recipes.some(r=>r.id===id&&r.categoryId==='heist'))fail('Heist guide '+entry.name+' links to '+id+', which is not a heist item recipe.');
  return true;
}

export function formatDuration(seconds){
  if(seconds==null)return 'Not supplied';
  const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),remaining=seconds%60;
  return [hours?hours+'h':'',minutes?minutes+'m':'',remaining?remaining+'s':''].filter(Boolean).join(' ')||'0s';
}
// `steps` are the smelting steps from expandPlan, when the plan is broken down to raw materials.
export function planDuration(recipes,plan,steps=[]){
  let knownSeconds=0,unknownRecipes=0;
  for(const entry of plan){const recipe=recipes.find(r=>r.id===entry.recipeId);if(!recipe)throw new Error('A planned recipe no longer exists.');const time=calculate(recipe,entry.quantity).totalTimeSeconds;if(time===null)unknownRecipes++;else knownSeconds+=time;}
  for(const step of steps){if(step.totalTimeSeconds===null)unknownRecipes++;else knownSeconds+=step.totalTimeSeconds;}
  return {knownSeconds,unknownRecipes,totalSeconds:unknownRecipes?null:knownSeconds};
}
