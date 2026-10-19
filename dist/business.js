import {calculate,combinePlan,planDuration,formatDuration,MAX_QUANTITY} from './core.js';
let configured=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('en-AU');
export function configureBusiness(id,quantity){configured={id,quantity};}
export function renderBusiness(host,recipes,guide,onAdd){
  const item=id=>guide.items.find(i=>i.id===id)?.name||id;
  host.innerHTML=`<section class="business-stock"><div class="section-header"><h2>Your quota</h2><button id="business-clear">Clear</button></div><div class="stock-board">${recipes.map(r=>`<article class="stock-part"><h3>${esc(r.name)}</h3><p class="fine">${r.ingredients.map(i=>`${fmt(i.quantity)} ${esc(item(i.itemId))}`).join(' · ')} per craft</p><div class="stock-inputs"><label>Quantity to craft<input aria-label="${esc(r.name)} quantity to craft" type="number" min="0" max="${MAX_QUANTITY}" step="1" value="${configured?.id===r.id?configured.quantity:0}" data-quota="${esc(r.id)}"></label></div></article>`).join('')}</div><p class="fine">Al’s Mechanic recipes · 10s per craft assumed · Other mechanics unverified.</p></section><section class="business-order"><h2>Materials needed</h2><div id="business-result" aria-live="polite"></div><div class="editor-actions"><button id="business-copy" class="primary">Copy quota & materials</button><button id="business-add">Add to crafting plan</button></div><p id="business-status" class="fine" role="status"></p></section><details class="business-plan"><summary>Combined crafting plan (optional)</summary><div id="plan"></div></details>`;
  configured=null;
  let order=[],copyText='';
  const update=()=>{
    let invalid=false;
    order=[];
    host.querySelectorAll('[data-quota]').forEach(input=>{const value=Number(input.value),valid=input.value.trim()!==''&&Number.isSafeInteger(value)&&value>=0&&value<=MAX_QUANTITY;input.setAttribute('aria-invalid',String(!valid));invalid||=!valid;if(valid&&value>0)order.push({recipeId:input.dataset.quota,quantity:value});});
    host.querySelector('#business-status').textContent='';
    if(invalid){host.querySelector('#business-result').innerHTML='<p class="error">Enter whole numbers from 0 to 1,000,000.</p>';order=[];}
    else{
      const materials=combinePlan(recipes,order),time=planDuration(recipes,order),count=order.reduce((sum,e)=>sum+calculate(recipes.find(r=>r.id===e.recipeId),e.quantity).output,0);
      const duration=time.unknownRecipes?'Unknown':formatDuration(time.totalSeconds);
      host.querySelector('#business-result').innerHTML=order.length?`<div class="batch-summary"><div><strong>${fmt(count)}</strong>parts produced</div><div><strong>${duration}</strong>estimated crafting time</div></div><div class="totals">${materials.map(i=>`<div class="total-row"><span>${esc(item(i.itemId))}</span><b>${fmt(i.quantity)}</b></div>`).join('')}</div>`:'<p class="muted">Enter your quota to see materials and time.</p>';
      copyText='ZEPHYR RP — Mechanic quota\n'+order.map(e=>`${recipes.find(r=>r.id===e.recipeId).name}: ${e.quantity}`).join('\n')+'\n\n'+materials.map(i=>`${item(i.itemId)}: ${i.quantity}`).join('\n')+'\nEstimated time: '+duration+'\nAl’s Mechanic recipes; source assumes 10s per craft.';
    }
    host.querySelector('#business-add').disabled=invalid||!order.length;host.querySelector('#business-copy').disabled=invalid||!order.length;
  };
  host.querySelectorAll('[data-quota]').forEach(input=>input.oninput=update);
  host.querySelector('#business-clear').onclick=()=>{host.querySelectorAll('[data-quota]').forEach(input=>input.value=0);update();};
  host.querySelector('#business-add').onclick=()=>{try{onAdd(order.map(e=>({...e})));host.querySelector('.business-plan').open=true;host.querySelector('#business-status').textContent='Added to crafting plan. Adding again adds another copy.';}catch(error){host.querySelector('#business-status').textContent=error.message;}};
  host.querySelector('#business-copy').onclick=async()=>{try{await navigator.clipboard.writeText(copyText);host.querySelector('#business-status').textContent='Copied.';}catch{host.querySelector('#business-status').textContent='Clipboard unavailable. Select and copy the totals manually.';}};
  update();
}
