export const MAX_QUANTITY=1000000;
export const SUBSTANCE_SECTIONS={meth:'Meth',cocaine:'Cocaine',weed:'Weed',lsd:'LSD'};
export const GATHERING_METHODS={'bin-diving':'Bin Diving / Hobo Camps','metal-detecting':'Metal Detecting','scrap-yard':'Scrap Yard','recycling-centre':'Recycling Centre'};
export const AMMO_METHODS={mainland:'Mainland',cayo:'Cayo'};
// Chapters of every written guide (substances, gathering and heists), in display order.
export const GUIDE_SECTIONS={overview:'Overview',requirements:'Before you start',locations:'Locations',steps:'Step-by-step guide',tips:'Tips & notes'};
export const GUIDE_TEXT_FIELDS=Object.keys(GUIDE_SECTIONS);
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=n=>n.toLocaleString('en-AU');
// Every page has an address: #category, or #category/selection for a recipe, tier, method, guide section, heist guide or location.
export function resolveRoute(hash,guide,recipes){
  const [id,sub='']=String(hash||'').replace(/^#/,'').split('/');
  const category=id==='locations'||guide.categories.some(c=>c.id===id)?id:guide.categories[0].id;
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
  return route;
}
// Finds recipes, guides and locations by name or postcode. Exact names first, then names that start with the query, then any match.
export function searchGuide(query,guide,recipes,limit=8){
  const q=String(query||'').trim().toLowerCase();
  if(!q)return [];
  const categoryName=id=>guide.categories.find(c=>c.id===id)?.name||id;
  const entries=[];
  for(const r of recipes)entries.push({label:r.name,detail:[categoryName(r.categoryId),r.tier?'Tier '+r.tier:'',r.method?AMMO_METHODS[r.method]:''].filter(Boolean).join(' · '),hash:'#'+r.categoryId+'/'+r.id,keys:[r.name,r.outputName]});
  for(const [id,name] of Object.entries(SUBSTANCE_SECTIONS))entries.push({label:name,detail:'Substance guide',hash:'#substances/'+id,keys:[name]});
  for(const [id,name] of Object.entries(GATHERING_METHODS))entries.push({label:name,detail:'Gathering guide',hash:'#gathering/'+id,keys:[name]});
  for(const g of guide.heistGuides||[])entries.push({label:g.name,detail:'Heist guide',hash:'#heist-guides/'+g.id,keys:[g.name]});
  for(const l of guide.locations){const benches=guide.benches.filter(b=>b.locationId===l.id);entries.push({label:benches.length===1?benches[0].name:l.name,detail:'Location'+(l.postcode?' · postcode '+l.postcode:''),hash:'#locations/'+l.id,keys:[l.name,l.postcode,...benches.map(b=>b.name)]});}
  const score=keys=>keys.reduce((best,key)=>{const value=String(key||'').toLowerCase();return Math.max(best,!value?0:value===q?3:value.startsWith(q)?2:value.includes(q)?1:0);},0);
  return entries.map(({keys,...entry})=>({...entry,score:score(keys)})).filter(entry=>entry.score).sort((a,b)=>b.score-a.score).slice(0,limit).map(({score,...entry})=>entry);
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
export function planDuration(recipes,plan){
  let knownSeconds=0,unknownRecipes=0;
  for(const entry of plan){const recipe=recipes.find(r=>r.id===entry.recipeId);if(!recipe)throw new Error('A planned recipe no longer exists.');const time=calculate(recipe,entry.quantity).totalTimeSeconds;if(time===null)unknownRecipes++;else knownSeconds+=time;}
  return {knownSeconds,unknownRecipes,totalSeconds:unknownRecipes?null:knownSeconds};
}
