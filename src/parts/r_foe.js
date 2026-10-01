function bodyShape(c,th,r,t,type){
  c.beginPath();
  if(th===0){poly(c,0,0,r,3,t*0.2);c.fill();c.stroke();const m=3+(type==='boss'?2:0);for(let k=0;k<m;k++){const a=t*0.9+k*2*Math.PI/m;c.beginPath();poly(c,Math.cos(a)*r*1.45,Math.sin(a)*r*1.1,r*0.22,3,-t);c.fill();c.stroke();}}
  else if(th===1){const n=10;for(let k=0;k<n*2;k++){const a=k*Math.PI/n-Math.PI/2,rr=k%2?r*(0.62+0.08*Math.sin(t*9+k)):r*(1+0.06*Math.sin(t*7+k));k?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();}
  else if(th===2){for(let k=0;k<6;k++){const x0=(k-2.5)*r*0.32;c.beginPath();c.moveTo(x0,r*0.5);c.bezierCurveTo(x0+Math.sin(t*2+k)*r*0.3,r*1.0,x0-Math.sin(t*2+k)*r*0.3,r*1.3,x0+Math.sin(t*3+k)*r*0.2,r*1.55);c.stroke();}c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();}
  else if(th===3){poly(c,0,0,r,6,0);c.fill();c.stroke();const n=8;for(let k=0;k<n;k++){const a=t*0.7+k*2*Math.PI/n;c.beginPath();c.arc(Math.cos(a)*r*1.4,Math.sin(a)*r*1.4,r*0.08,0,7);c.fill();c.stroke();}}
  else{c.save();c.rotate(t*0.4);poly(c,0,0,r,6,0);c.fill();c.stroke();c.rotate(-t*0.8);c.beginPath();for(let k=0;k<12;k++){const a=k*Math.PI/6,rr=k%2?r*0.55:r*1.05;k?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();c.restore();}
  if(type==='mini'){for(const sgn of [-1,1]){c.beginPath();c.moveTo(sgn*r*0.55,-r*0.75);c.quadraticCurveTo(sgn*r*1.05,-r*1.05,sgn*r*0.85,-r*1.55);c.quadraticCurveTo(sgn*r*0.75,-r*1.0,sgn*r*0.3,-r*0.9);c.closePath();c.fill();c.stroke();}
    c.beginPath();for(let k=0;k<7;k++){const a=Math.PI*0.15+k*Math.PI*0.7/6,x=Math.cos(a)*r*1.15,y=Math.sin(a)*r*0.95;k?c.lineTo(x,y):c.moveTo(x,y);c.lineTo(Math.cos(a+0.05)*r*1.35,Math.sin(a+0.05)*r*1.15);}c.fill();c.stroke();}
  if(type==='boss'||type==='titan'){const n=type==='boss'?5:7,w=type==='boss'?1:1.25;
    c.beginPath();c.moveTo(-r*0.9*w,-r*0.85);for(let k=0;k<n;k++){const x=(-0.9+k*1.8/(n-1))*r*w,tall=k===(n-1)/2?1.75:1.35+0.15*(k%2);c.lineTo(x-r*0.12*w,-r*0.95);c.lineTo(x,-r*tall);c.lineTo(x+r*0.12*w,-r*0.95);}c.lineTo(r*0.9*w,-r*0.85);c.closePath();c.fill();c.stroke();
    for(let k=0;k<(type==='boss'?6:10);k++){const a=t*0.5+k*2*Math.PI/(type==='boss'?6:10),rr=r*(type==='boss'?1.75:2.0);c.save();c.translate(Math.cos(a)*rr,Math.sin(a)*rr*0.6);c.rotate(a);poly(c,0,0,r*0.16,4,0);c.fill();c.stroke();c.restore();}}
}
/* Dessine un ennemi à la position courante du contexte. st : {hit, rage, blink, shieldL} */
function drawFoe(c,th,type,h,r,t,st){
  const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,`hsl(${h} 80% ${st.hit>0.4?82:64}%)`);g.addColorStop(0.55,`hsl(${h} 70% 38%)`);g.addColorStop(1,`hsl(${h} 70% 16%)`);
  c.fillStyle=g;c.lineJoin='round';c.lineWidth=Math.max(2,r*0.07);c.strokeStyle=st.hit>0.4?'#fff':st.rage===2?'#ff5a6e':`hsl(${h} 95% 82%)`;
  bodyShape(c,th,r,t,type);
  c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.ellipse(-r*.35,-r*.42,r*.2,r*.08,-0.6,0,7);c.fill();
  const open=st.blink<0?0.15:1;
  c.fillStyle='#fff6e4';c.beginPath();c.ellipse(0,-r*0.02,r*0.36,r*0.24*open,0,0,7);c.fill();c.lineWidth=2;c.strokeStyle=`hsl(${h} 70% 16%)`;c.stroke();
  c.fillStyle=st.rage?'#ff5a6e':'#0d1530';c.beginPath();c.arc(Math.sin(t*1.3)*r*0.12,-r*0.02,r*0.12*open,0,7);c.fill();
  c.fillStyle='#fff';c.beginPath();c.arc(Math.sin(t*1.3)*r*0.12-r*0.04,-r*0.07,r*0.035*open,0,7);c.fill();
  if(st.shieldL){c.save();c.rotate(t*0.6);const hx=vtx(r*1.55,6,0);c.strokeStyle='rgba(127,226,255,.9)';c.lineWidth=3;c.beginPath();hx.forEach((p,k)=>k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.stroke();c.fillStyle='rgba(127,226,255,.10)';c.fill();c.restore();}
}
function drawEnemy(dt,t){
  const c=bxc,E=R.E;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,BW,BH);
  const h=enemyHue();
  bfx.hitT=Math.max(0,bfx.hitT-dt*5);bfx.recoil*=Math.pow(0.01,dt);bfx.phaseT=Math.max(0,bfx.phaseT-dt*0.7);bfx.blink-=dt;if(bfx.blink<-0.14)bfx.blink=rnd(2,5);
  const windup=R.state==='play'&&E.atkT<=CFG.enemy.windup?1-E.atkT/CFG.enemy.windup:0;
  const cy=BH*0.54,base={mob:0.24,mini:0.25,boss:0.26,titan:0.26}[E.type]*BH;
  let r=base*(1+Math.sin(t*2)*0.03)*(1-bfx.recoil*0.1)*(1+windup*0.1);
  if(R.state==='won'){bfx.dieT+=dt;r*=Math.max(0,1-bfx.dieT*2);}
  if(!bfx.shards.length)for(let k=0;k<9;k++)bfx.shards.push({x:Math.random(),y:Math.random(),s:rnd(4,9),v:rnd(4,9),r:rnd(0,6.28),n:3+Math.floor(rnd(0,4))});
  bfx.shards.forEach(sh=>{sh.y-=sh.v*dt/BH;if(sh.y<-0.1){sh.y=1.1;sh.x=Math.random();}sh.r+=dt*0.3;c.save();c.translate(sh.x*BW,sh.y*BH);c.rotate(sh.r);c.globalAlpha=0.22;poly(c,0,0,sh.s,sh.n,0);c.strokeStyle=`hsl(${h} 90% 80%)`;c.lineWidth=1.5;c.stroke();c.restore();});
  const halo=c.createRadialGradient(BW/2,BH*0.55,0,BW/2,BH*0.55,BH*0.75);halo.addColorStop(0,`hsla(${h},80%,55%,.22)`);halo.addColorStop(1,'transparent');c.fillStyle=halo;c.fillRect(0,0,BW,BH);
  const sp=c.createRadialGradient(BW/2,-BH*0.2,0,BW/2,-BH*0.2,BH*1.3);sp.addColorStop(0,'rgba(255,214,150,.20)');sp.addColorStop(1,'rgba(255,214,150,0)');c.fillStyle=sp;c.fillRect(0,0,BW,BH);
  c.fillStyle='rgba(6,3,22,.55)';c.beginPath();c.ellipse(BW/2,cy+base*1.55,base*1.25,base*0.2,0,0,7);c.fill();
  const prog=Math.min(1,Math.max(0,1-E.atkT/E.atkEvery)),ringR=base*1.72;
  c.lineWidth=5;c.strokeStyle='rgba(255,255,255,.08)';c.beginPath();c.arc(BW/2,cy,ringR,0,7);c.stroke();
  c.strokeStyle=windup?`rgba(255,90,110,${0.7+0.3*Math.sin(t*20)})`:'rgba(255,90,110,.55)';c.lineCap='round';c.beginPath();c.arc(BW/2,cy,ringR,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);c.stroke();c.lineCap='butt';
  const aura=Math.max(R.rage?0.3+0.15*Math.sin(t*6):0,windup*0.4,bfx.phaseT*0.5);
  if(aura>0){const g=c.createRadialGradient(BW/2,cy,r*0.4,BW/2,cy,r*2.2);g.addColorStop(0,`rgba(255,90,110,${aura})`);g.addColorStop(1,'rgba(255,90,110,0)');c.fillStyle=g;c.fillRect(0,0,BW,BH);}
  if(R.rage&&Math.random()<dt*20)bfx.embers.push({x:BW/2+rnd(-r,r),y:cy+r*0.6,vy:-rnd(30,70),t:0,life:rnd(.6,1.1)});
  if(r>0.5){c.save();c.translate(BW/2+(windup?rnd(-1,1)*windup*3:0),cy-bfx.recoil*6);drawFoe(c,E.th,E.type,h,r,t,{hit:bfx.hitT,rage:R.rage,blink:bfx.blink,shieldL:E.shieldL&&R.t>=R.breakUntil?E.shieldL:0});c.restore();}
  c.globalCompositeOperation='lighter';
  bfx.embers=bfx.embers.filter(e=>{e.t+=dt;if(e.t>e.life)return false;e.y+=e.vy*dt;const a=1-e.t/e.life;c.fillStyle=`rgba(255,120,90,${a})`;c.beginPath();c.arc(e.x,e.y,2,0,7);c.fill();return true;});
  bfx.parts=bfx.parts.filter(p=>{p.t+=dt;if(p.t>=p.life)return false;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.95;p.vy*=0.95;const a=1-p.t/p.life;c.fillStyle=p.col?`rgba(${p.col},${a})`:`hsla(${p.h},100%,68%,${a})`;c.beginPath();c.arc(p.x,p.y,p.sz*a+0.5,0,7);c.fill();return true;});
  c.globalCompositeOperation='source-over';
  bfx.nums=bfx.nums.filter(n=>{n.t+=dt;if(n.t>1)return false;const a=1-n.t,s=easeBack(Math.min(1,n.t/0.18));c.save();c.translate(n.x,n.y-n.t*30);c.scale(s,s);c.font=`${n.big?30:20}px "Lilita One",system-ui,sans-serif`;c.textAlign='center';c.lineJoin='round';c.lineWidth=5;c.strokeStyle=`rgba(13,21,48,${a})`;c.strokeText(n.txt,0,0);c.fillStyle=n.col.replace(')',` / ${a})`);c.fillText(n.txt,0,0);c.restore();return true;});
}
function enemyBurst(n,h,sp){for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,s=rnd(sp*0.3,sp);bfx.parts.push({x:BW/2,y:BH*0.52,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.4,1),t:0,h,col:h==null?SPEC[k%6]:null,sz:rnd(2,5)});}}
let lastHitT=0;
hooks.hit=(i,d,blocked,crit)=>{const [x,y]=i==null?[W/2,W]:fx.at(i);fx.shots.push({x,y,t:0,d,blocked,crit});};
function shotLanded(s){
  if(s.blocked){bfx.nums.push({txt:'Bloqué',t:0,x:BW/2+rnd(-30,30),y:BH*0.3,col:'hsl(192 100% 75%)'});sfx.tick();return;}
  bfx.hitT=1;bfx.recoil=Math.min(1,bfx.recoil+0.6);lastHitT=performance.now()/1000;
  const big=R.E.type==='titan'?s.d>=dmgOf(R.best):s.d>=R.E.max*0.08;
  bfx.nums.push({txt:(s.crit?'Critique ':'')+'−'+fmt(s.d),t:0,x:BW/2+rnd(-40,40),y:BH*0.36,col:big||s.crit?'hsl(44 100% 66%)':'hsl(40 100% 96%)',big:big||s.crit});
  for(let k=0;k<(big?16:6);k++){const a=Math.random()*Math.PI*2,sp=rnd(60,big?260:140);bfx.parts.push({x:BW/2,y:BH*0.52,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.3,.6),t:0,col:SPEC[k%6],sz:rnd(1.5,3.5)});}
  if(s.crit||big)kick('large');
  tone(110+Math.min(s.d,1e6)**0.1*20,0.12,'square',big?0.07:0.04);
}
hooks.attack=(kind,hit)=>{
  hit.forEach(i=>fx.beams.push({i,t:0}));kick('medium');sfx.low();
  bfx.nums.push({txt:'Il '+THEMES[R.E.th].atkT,t:0,x:BW/2,y:BH*0.92,col:'hsl(352 100% 76%)'});
};
hooks.windup=()=>{sfx.tick();};
hooks.phase=p=>{bfx.phaseT=1;if(p==='shield'){toast(`Bouclier : seules les gemmes niv. ${R.E.shieldL}+ lui font mal`);sfx.chord();kick('large');}else if(p==='rage'){toast('Rage : il attaque deux fois plus vite');kick('medium');}else{toast('Furie : achève-le vite');kick('large');}};
