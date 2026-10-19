const $=selector=>document.querySelector(selector),motion=matchMedia('(prefers-reduced-motion: reduce)');
let introTimer,partyTimer,endTimer,toastTimer,comboTimer,total=0,combo=0,lastClick=0,active=false;
const ceremony=$('#ceremony');
function finishIntro(){clearInterval(introTimer);if(ceremony.open)ceremony.close();}
$('#skip-intro').onclick=finishIntro;ceremony.addEventListener('cancel',finishIntro);
if(!motion.matches){let count=3;ceremony.showModal();introTimer=setInterval(()=>{count--;if(count<=0){finishIntro();return;}$('#countdown').textContent=count;$('#ceremony-caption').textContent=count===2?'Allocating a budget of zero dollars…':'Lowering everyone’s expectations…';},900);}
function announce(message){clearTimeout(toastTimer);$('#award-toast').textContent=message;$('#award-toast').classList.add('visible');toastTimer=setTimeout(()=>$('#award-toast').classList.remove('visible'),3200);}
function unlock(id,message){const card=$(id);if(!card.classList.contains('unlocked')){card.classList.add('unlocked');announce(message);}}
function record(){const now=performance.now();combo=now-lastClick<2500?combo+1:1;lastClick=now;total++;$('#combo').textContent='×'+combo;$('#ridiculousness').textContent=(100+total*37).toLocaleString()+'%';clearTimeout(comboTimer);comboTimer=setTimeout(()=>{combo=0;$('#combo').textContent='×0';},2500);if(total>=3)unlock('#award-3','ACHIEVEMENT: Repeat Offender. Still no prize.');if(combo>=5)unlock('#award-5','ACHIEVEMENT: Combo Catastrophe. Your mouse deserves better.');}
$('#celebrate').addEventListener('click',record);$('#chaos').addEventListener('click',record);
function stop(){clearInterval(partyTimer);clearTimeout(endTimer);active=false;document.body.classList.remove('unreasonable');$('#unreasonable').setAttribute('aria-pressed','false');$('#unreasonable').textContent='ENGAGE UNREASONABLE MODE';$('#mode-note').textContent='Dignity restoration failed. Celebration stopped.';document.dispatchEvent(new Event('zephyr-stop-party'));}
$('#unreasonable').onclick=()=>{if(active){stop();return;}active=true;document.body.classList.add('unreasonable');$('#unreasonable').setAttribute('aria-pressed','true');$('#unreasonable').textContent='DISENGAGE UNREASONABLE MODE';unlock('#award-mode','ACHIEVEMENT: Beyond Help. This is your legacy.');let remaining=15;$('#mode-note').textContent='15 seconds until the budget runs out.';$('#chaos').click();partyTimer=setInterval(()=>{remaining-=1;$('#mode-note').textContent=remaining+' seconds until the budget runs out.';if(remaining%2===0)$('#chaos').click();},1000);endTimer=setTimeout(stop,15000);};
$('#stop-party').onclick=()=>{finishIntro();stop();};
$('#print-certificate').onclick=()=>{finishIntro();stop();window.print();};
document.addEventListener('keydown',event=>{if(event.key==='Escape'){finishIntro();stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){finishIntro();stop();}});
motion.addEventListener('change',()=>{if(motion.matches){finishIntro();stop();}});
addEventListener('pagehide',()=>{finishIntro();stop();clearTimeout(toastTimer);clearTimeout(comboTimer);});
