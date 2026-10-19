const canvas=document.querySelector('#confetti'),ctx=canvas.getContext('2d');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let particles=[],frame=0,previous=0;
function resize(){const scale=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*scale;canvas.height=innerHeight*scale;ctx?.setTransform(scale,0,0,scale,0,0);}
function tick(time){
  const step=Math.min((time-previous)/16.67||1,2);previous=time;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  particles=particles.filter(p=>p.life>0&&p.y<innerHeight+30);
  for(const p of particles){p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=.085*step;p.angle+=p.spin*step;p.life-=step;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(p.life/35,1);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.45);ctx.restore();}
  frame=particles.length?requestAnimationFrame(tick):0;
}
function celebrate(fireworks=false){
  if(!ctx||reducedMotion.matches)return;
  const colours=['#c2dc9d','#e7c97d','#edf3e4','#87aa83'];
  particles=Array.from({length:fireworks?320:130},(_,i)=>{const angle=Math.random()*Math.PI*2,speed=3+Math.random()*9;return {x:fireworks?innerWidth*(.2+(i%3)*.3):innerWidth/2,y:innerHeight*(fireworks?.25:.35),vx:fireworks?Math.cos(angle)*speed:(Math.random()-.5)*19,vy:fireworks?Math.sin(angle)*speed:-5-Math.random()*12,angle,spin:(Math.random()-.5)*.15,size:5+Math.random()*6,color:colours[Math.floor(Math.random()*colours.length)],life:190+Math.random()*70};});
  if(frame)cancelAnimationFrame(frame);previous=performance.now();frame=requestAnimationFrame(tick);
}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;particles=[];ctx?.clearRect(0,0,innerWidth,innerHeight);}
addEventListener('resize',resize);addEventListener('pagehide',stop);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)stop();});
let audioContext,soundEnabled=false,counterFrame=0,level=0;
document.addEventListener('zephyr-stop-party',()=>{stop();cancelAnimationFrame(counterFrame);counterFrame=0;document.querySelector('#reward-count').textContent='+0';document.querySelector('#reward-note').textContent='All rewards deducted as an administrative fee.';soundEnabled=false;audioContext?.suspend();document.querySelector('#sound').textContent='Sound: off';document.querySelector('#sound').setAttribute('aria-pressed','false');});
const ranks=['Certified Logo Enthusiast','Senior Button Botherer','Deputy Director of Nothing','Five-Star Fuck Ass','Supreme Minister of Wasted Time'];
const announcements=['The city has been notified. Nobody responded.','Your achievement has been forwarded to absolutely nobody.','A ceremony was planned. Everyone cancelled.','You are now wanted for excessive clicking.','Congratulations. You have completed the internet.'];
function fanfare(){
  if(!soundEnabled||!audioContext)return;
  const now=audioContext.currentTime;
  [523.25,659.25,783.99,1046.5].forEach((frequency,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=now+i*.11;oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.3);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(start);oscillator.stop(start+.32);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});
}
function rollReward(){
  cancelAnimationFrame(counterFrame);
  const counter=document.querySelector('#reward-count'),note=document.querySelector('#reward-note');
  if(reducedMotion.matches){counter.textContent='+0';note.textContent='All rewards deducted as an administrative fee.';return;}
  const start=performance.now();note.textContent='Calculating your completely legitimate reward…';
  const roll=time=>{const elapsed=time-start;if(elapsed<1500){counter.textContent='+'+Math.floor(elapsed/1500*99999).toLocaleString('en-AU');counterFrame=requestAnimationFrame(roll);}else{counter.textContent='+0';note.textContent='All rewards deducted as an administrative fee.';counterFrame=0;}};counterFrame=requestAnimationFrame(roll);
}
document.querySelector('#sound').addEventListener('click',async()=>{
  const button=document.querySelector('#sound');
  try{if(!soundEnabled){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error();audioContext??=new Audio();await audioContext.resume();soundEnabled=true;}else{soundEnabled=false;await audioContext?.suspend();}button.textContent='Sound: '+(soundEnabled?'on':'off');button.setAttribute('aria-pressed',String(soundEnabled));fanfare();}catch{soundEnabled=false;button.textContent='Sound unavailable';button.setAttribute('aria-pressed','false');}
});
document.querySelector('#celebrate').addEventListener('click',()=>{celebrate();rollReward();fanfare();});
document.querySelector('#chaos').addEventListener('click',()=>{level++;document.body.classList.add('overdrive');document.querySelector('#rank-name').textContent=ranks[Math.min(level,ranks.length-1)];document.querySelector('#party-status').textContent=announcements[Math.min(level,announcements.length-1)];celebrate(true);rollReward();fanfare();});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){cancelAnimationFrame(counterFrame);counterFrame=0;document.querySelector('#reward-count').textContent='+0';}});
addEventListener('pagehide',()=>{cancelAnimationFrame(counterFrame);audioContext?.suspend();});
resize();celebrate();
rollReward();
