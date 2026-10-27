export const MAX_QUANTITY=1000000;
export const SUBSTANCE_SECTIONS={meth:'Meth',cocaine:'Cocaine',weed:'Weed',lsd:'LSD'};
export const AMMO_METHODS={mainland:'Mainland',cayo:'Cayo'};
export function calculateAvailable(recipe,itemId,available){
  if(!Number.isSafeInteger(available)||available<0||available>MAX_QUANTITY)throw new Error('Enter a whole number from 0 to 1,000,000.');
  const input=recipe.ingredients.find(i=>i.itemId===itemId);
  if(!input)throw new Error('Choose an ingredient from this recipe.');
  const batches=Math.floor(available/input.quantity),output=batches*recipe.outputQuantity;
  return {batches,output,itemId,available,used:batches*input.quantity,leftover:available-batches*input.quantity,totalTimeSeconds:batches===0?0:recipe.craftTimeSeconds==null?null:batches*recipe.craftTimeSeconds,materials:recipe.ingredients.map(i=>({...i,quantity:i.quantity*batches}))};
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
export const GUIDE_TEXT_FIELDS=['overview','requirements','locations','steps','tips'];
const validGuideImages=value=>Array.isArray(value)&&!value.some(image=>!image||typeof image!=='object'||typeof image.src!=='string'||!image.src||!safeImage(image.src)||typeof (image.title??'')!=='string'||typeof (image.alt??'')!=='string'||typeof (image.detail??'')!=='string');
export function safeImage(value){return typeof value==='string'&&(value===''||/^https:\/\//i.test(value)||/^images\/[a-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..'));}
// Pass {links:false} to check guide.json on its own, before the recipe files are loaded.
export function validateData(guide,recipes,{links=true}={}){
  const fail=m=>{throw new Error(m);};
  if(guide.version!==1)fail('Unsupported guide version. Expected version 1.');
  if(guide.substanceGuides!==undefined){
    if(!guide.substanceGuides||typeof guide.substanceGuides!=='object'||Array.isArray(guide.substanceGuides))fail('Substance guides must be an object.');
    for(const [id,entry] of Object.entries(guide.substanceGuides)){
      if(!Object.hasOwn(SUBSTANCE_SECTIONS,id)||!entry||typeof entry!=='object'||Array.isArray(entry))fail('Invalid substance guide.');
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
  for(const l of guide.locations){if(typeof l.postcode!=='string')fail('Location postcode must be text.');if(!safeImage(l.mapImage))fail('Use an HTTPS URL or images/ path for map photos.');}
  for(const b of guide.benches){if(!ids.locations.has(b.locationId))fail('Bench references an unknown location.');if(!safeImage(b.image))fail('Use an HTTPS URL or images/ path for bench photos.');}
  if(!Array.isArray(recipes))fail('Recipes must be an array.');const seen=new Set();
  for(const r of recipes)if(r?.categoryId==='weapons'&&![1,2,3].includes(r.tier))fail('Weapon recipes require tier 1, 2 or 3.');
  for(const r of recipes)if(r?.categoryId==='ammo'&&!Object.hasOwn(AMMO_METHODS,r.method))fail('Ammo recipes require a crafting method: mainland or cayo.');
  for(const r of recipes)if(r?.categoryId==='substances'&&!Object.hasOwn(SUBSTANCE_SECTIONS,r.substance))fail('Substance recipes require a section: meth, cocaine, weed or lsd.');
  for(const r of recipes){if(!r||typeof r.id!=='string'||!/^[a-z0-9-]+$/.test(r.id)||seen.has(r.id)||typeof r.name!=='string'||!r.name.trim())fail('Recipes need unique IDs and names.');seen.add(r.id);if(r.craftTimeSeconds===null){if(!guide.pendingCraftTimeRecipeIds?.includes(r.id))fail('Craft time is required for '+r.name+'.');}else if(!Number.isSafeInteger(r.craftTimeSeconds)||r.craftTimeSeconds<1||r.craftTimeSeconds>86400)fail('Craft time must be a whole number of seconds from 1 to 86,400 for '+r.name+'.');if(!ids.categories.has(r.categoryId)||(r.benchId!==null&&!ids.benches.has(r.benchId)))fail('Recipe references an unknown category or bench.');if(!Number.isSafeInteger(r.outputQuantity)||r.outputQuantity<1||r.outputQuantity>MAX_QUANTITY)fail('Recipe output must be a positive whole number up to 1,000,000.');if(!Array.isArray(r.ingredients)||!r.ingredients.length)fail('Recipes need at least one ingredient.');const ing=new Set();for(const i of r.ingredients){if(!ids.items.has(i.itemId)||ing.has(i.itemId)||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>MAX_QUANTITY)fail('Ingredient IDs must exist, appear once, and have positive whole quantities up to 1,000,000.');ing.add(i.itemId);}}
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
