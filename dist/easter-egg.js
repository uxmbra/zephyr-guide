// A short burst of seven logo clicks unlocks the hidden page.
const logo=document.querySelector('.brand-mark');
let clicks=[];
logo?.addEventListener('click',event=>{
  // Keep the current page and crafting plan while counting logo clicks.
  event.preventDefault();
  const now=performance.now();
  clicks=clicks.filter(time=>now-time<=5000);
  clicks.push(now);
  if(clicks.length===7)location.assign('easter-egg.html');
});
