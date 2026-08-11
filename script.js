/* ---------- LIVE SKY ---------- */
const c=document.getElementById('sky'),ctx=c.getContext('2d');
let W,H,dpr,clouds=[],stars=[];
function resize(){
 dpr=Math.min(devicePixelRatio||1,2); W=innerWidth; H=innerHeight;
 c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 clouds=Array.from({length:Math.max(9,Math.floor(W/150))},(_,i)=>({x:Math.random()*W,y:H*(.14+Math.random()*.52),s:.45+Math.random()*1.15,w:100+Math.random()*230,a:.06+Math.random()*.12}));
 stars=Array.from({length:90},()=>({x:Math.random()*W,y:Math.random()*H*.62,r:.3+Math.random()*1.2,p:Math.random()*6.28}));
}
addEventListener('resize',resize);resize();
let t=0;
function draw(){
 t+=.003;
 const now=new Date(), hour=now.getHours()+now.getMinutes()/60;
 const night=Math.max(0,Math.min(1,(hour<6?(6-hour)/4:(hour>18?(hour-18)/5:0))));
 const g=ctx.createLinearGradient(0,0,0,H);
 if(night>.5){g.addColorStop(0,'#071128');g.addColorStop(.55,'#14294c');g.addColorStop(1,'#17233c')}
 else {g.addColorStop(0,'#6f9fd2');g.addColorStop(.55,'#a9c9d6');g.addColorStop(1,'#f1caa4')}
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 stars.forEach(s=>{ctx.globalAlpha=night*(.25+.25*Math.sin(t*30+s.p));ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()});
 ctx.globalAlpha=1;
 // moon/sun
 const ang=((hour-6)/12)*Math.PI; const sx=W*(.5+.38*Math.cos(ang)), sy=H*(.34-.25*Math.sin(ang));
 ctx.fillStyle=night>.5?'rgba(235,243,255,.85)':'rgba(255,226,160,.85)';ctx.shadowBlur=35;ctx.shadowColor=ctx.fillStyle;
 ctx.beginPath();ctx.arc(sx,sy,night>.5?28:38,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 clouds.forEach((q,i)=>{
   q.x+=.08*q.s;if(q.x-q.w>W)q.x=-q.w;
   ctx.globalAlpha=q.a;ctx.fillStyle=night>.5?'#d8e2f0':'#fff';
   ctx.beginPath();ctx.ellipse(q.x,q.y,q.w*.55,24*q.s,0,0,Math.PI*2);
   ctx.ellipse(q.x-q.w*.28,q.y+3,q.w*.28,18*q.s,0,0,Math.PI*2);
   ctx.ellipse(q.x+q.w*.2,q.y-7,q.w*.32,25*q.s,0,0,Math.PI*2);ctx.fill();
 });
 ctx.globalAlpha=1;
 // distant hills / trees
 const horizon=H*.78;ctx.fillStyle=night>.5?'#0a1522':'#27463f';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,horizon);
 for(let x=0;x<=W;x+=45){ctx.lineTo(x,horizon-30-Math.sin(x*.014+t)*16);};ctx.lineTo(W,H);ctx.fill();
 for(let x=0;x<W;x+=34){let base=horizon+15,ht=35+((x*17)%50);ctx.fillStyle=night>.5?'#07131e':'#18342f';ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+17,base-ht);ctx.lineTo(x+34,base);ctx.fill();}
 requestAnimationFrame(draw);
}
draw();

/* ---------- LIVE CLOCK ---------- */
const clock=document.getElementById('clock'),date=document.getElementById('date');
function tick(){
 const d=new Date();
 clock.textContent=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
 date.textContent=d.toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'});
}
tick();setInterval(tick,1000);

/* ---------- PROCEDURAL CHILL MUSIC ---------- */
let audioCtx, master, timer=null, playing=false, step=0, track=0, nextNoteTime=0;
const tracks=[
 {name:'Cloud Drift',meta:'ambient loop · 01',root:196,tempo:72},
 {name:'Midnight Tea',meta:'lo-fi air · 02',root:174,tempo:68},
 {name:'Soft Neon',meta:'dream pulse · 03',root:220,tempo:76}
];
function initAudio(){
 if(audioCtx)return;
 audioCtx=new (window.AudioContext||window.webkitAudioContext)();
 master=audioCtx.createGain();master.gain.value=.12;master.connect(audioCtx.destination);
}
function tone(freq,dur,when,type='sine',gain=.035){
 const o=audioCtx.createOscillator(),g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();
 o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=1800;
 g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(gain,when+.04);g.gain.exponentialRampToValueAtTime(.0001,when+dur);
 o.connect(f).connect(g).connect(master);o.start(when);o.stop(when+dur+.05);
}
function schedule(){
 if(!playing)return;
 const tr=tracks[track], beat=60/tr.tempo;
 while(nextNoteTime<audioCtx.currentTime+.18){
   const s=step%8;
   const notes=[0,3,7,10,7,3,5,2];
   tone(tr.root*Math.pow(2,notes[s]/12),beat*1.7,nextNoteTime,'sine',.028);
   if(s===0||s===4) tone(tr.root/2,beat*.7,nextNoteTime,'triangle',.045);
   if(s===2||s===6) tone(tr.root*2,beat*.35,nextNoteTime,'sine',.012);
   nextNoteTime+=beat;step++;
 }
 timer=setTimeout(schedule,60);
}
function setTrack(i){track=(i+tracks.length)%tracks.length;document.getElementById('trackName').textContent=tracks[track].name;document.getElementById('trackMeta').textContent=tracks[track].meta}
async function play(){
 initAudio();await audioCtx.resume();playing=true;document.getElementById('player').classList.add('playing');
 document.getElementById('playIcon').textContent='Ⅱ';nextNoteTime=audioCtx.currentTime+.05;schedule();
}
function pause(){playing=false;clearTimeout(timer);document.getElementById('player').classList.remove('playing');document.getElementById('playIcon').textContent='▶'}
document.getElementById('play').onclick=()=>playing?pause():play();
document.getElementById('prev').onclick=()=>{setTrack(track-1);if(playing)play()};
document.getElementById('next').onclick=()=>{setTrack(track+1);if(playing)play()};
document.getElementById('back').onclick=()=>{step=Math.max(0,step-8)};
document.getElementById('forward').onclick=()=>{step+=8};
addEventListener('pointerdown',()=>{if(!audioCtx){}},{once:true});