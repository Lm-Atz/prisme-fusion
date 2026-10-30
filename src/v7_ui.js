const VERSION='12.8 · charge';
/* ================= icônes et correspondances ================= */
const UPICON={st_cad:'hourglass',st_auto:'link',st_power:'swords',st_birth:'gem',st_spark:'spark',st_bank:'coin',au_merge:'link',au_buy:'bag',au_joker:'eye',au_boss:'crown',au_prestige:'prism',au_exped:'flag',au_titan:'flame',power:'swords',crit:'star',combo:'bolt',bossdmg:'crown',pierce:'breaker',lucky:'spark',chain:'link',gold:'coin',board:'grid',sursis:'clock',spark:'spark',loot:'bag',prod:'forge',cap:'box',off:'clock',killspark:'trophy',catal:'spark',cadence:'hourglass',rang:'star',eveil:'prism',brule:'flame',aura:'diamond'};
const JICON={chameleon:'eye',magnet:'magnet',surge:'bolt',frost:'snow',prism:'prism',meteor:'meteor',breaker:'breaker'};
const GICON={start:'flag',auto:'link',atk:'swords',grid:'grid',eco:'shard',jok:'spark',arm:'target'};
const upIcon=u=>u.joker?JICON[u.joker]:UPICON[u.id]||'spark';
const TYPE_LABEL={get mob(){return t('type_mob')},get mini(){return t('type_mini')},get boss(){return t('type_boss')},get titan(){return t('type_titan')}};
const RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const motionOK=()=>S.settings.fx&&!RM.matches;
const DX=10; // v12.3 : dégâts affichés ×10 (purement visuel : « −26 » plutôt que « −2,6 ») ; mêmes unités pour Titan et ligue
const easeBack=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};

/* ================= plateau ================= */
const cv=$('board'),cx=cv.getContext('2d');
let W=0,cell=0,dpr=1;
function resize(){
  if(!R)return;dpr=Math.min(window.devicePixelRatio||1,2);
  const bw=$('bw');cv.style.width=cv.style.height='0px';const size=Math.max(180,Math.min(bw.clientWidth,bw.clientHeight));
  cv.style.width=size+'px';cv.style.height=size+'px';cv.width=size*dpr;cv.height=size*dpr;W=size;cell=W/R.N;
  BW=bcv.clientWidth;BH=bcv.clientHeight;bcv.width=BW*dpr;bcv.height=BH*dpr;
}
const fx={pop:{},sq:{},parts:[],rings:[],floats:[],shots:[],beams:[],trauma:0,glow:0,flash:0,flashCol:'255,200,87',evolveT:0,stopUntil:0,back:null,
  at(i){return [(i%R.N+.5)*cell,(Math.floor(i/R.N)+.5)*cell];},
  burst(i,h,n,sp){const [x,y]=this.at(i);for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,s=rnd(sp*0.3,sp);this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.35,.8),t:0,col:h==null?SPEC[k%6]:null,h,sz:rnd(2,4.5)});}this.rings.push({x,y,t:0,h});}
};
/* Retours par importance (game-feel) : petit = pop + particules ; moyen = + secousse légère ;
   grand = + micro-pause + vibration ; énorme = tout, plus fort. Secousse = trauma² lissé, jamais aléatoire. */
const TIERS_FX={small:{tr:0,stop:0,vib:0},medium:{tr:.2,stop:0,vib:10},large:{tr:.45,stop:70,vib:[20,30,30]},huge:{tr:.7,stop:140,vib:[30,40,30,40,120]}};
/* Anti-cumul : une secousse par palier au plus toutes les 700 ms, et le tremblement total est plafonné à 0,6 (les critiques en rafale ne font plus trembler l'écran en continu). */
const kickT={};
function kick(tier){const T=TIERS_FX[tier];if(!T)return;const now=performance.now();if(tier!=='small'&&now-(kickT[tier]||0)<700)return;kickT[tier]=now;if(motionOK()){fx.trauma=Math.min(tier==='huge'?1:0.6,fx.trauma+T.tr);if(T.stop)fx.stopUntil=now+T.stop;}if(T.vib)vib(T.vib);}
hooks.merge=(i,l,gold,manual)=>{
  fx.sq[i]=0;fx.burst(i,gold?48:hueOf(l),(manual?10:5)+Math.min(l,12),manual?240:150);
  fx.glow=Math.min(1,fx.glow+(manual?0.16:0.05));
  if(manual&&R.combo>1){const [x,y]=fx.at(i);fx.floats.push({x,y:y-cell*.35,t:0,txt:'×'+R.combo,h:48});}
  if(gold){const [x,y]=fx.at(i);fx.floats.push({x,y:y-cell*.1,t:0,txt:'+'+Math.max(1,Math.round(l*lootMult())),h:190});}
  if(manual){kick(l>=spawnLevel()+4?'medium':'small');sfx.merge(R.combo);}else if(Math.random()<0.15)sfx.merge(1);
};
hooks.spawn=i=>{fx.pop[i]=0;};
hooks.unlock=i=>{fx.burst(i,240,12,180);sfx.tick();};
hooks.bomb=(i,hit)=>{hit.forEach(j=>fx.burst(j,352,8,200));};
hooks.full=()=>{};
hooks.evolve=()=>{fx.evolveT=1;};
hooks.grow=N=>{fx.pop={};fx.sq={};requestAnimationFrame(resize);fx.glow=1;kick('medium');};
let drag=null,tapStart=null;
function drawTray(c,wh){
  const g=c.createLinearGradient(0,0,0,W);g.addColorStop(0,'#1f2e5e');g.addColorStop(1,'#152045');
  c.fillStyle=g;c.beginPath();c.roundRect(0,0,W,W,20);c.fill();
  for(let i=0;i<R.N*R.N;i++){const x=(i%R.N)*cell,y=Math.floor(i/R.N)*cell,p=Math.max(2,cell*0.045);
    c.fillStyle='#0b1330';c.beginPath();c.roundRect(x+p,y+p,cell-2*p,cell-2*p,cell*0.2);c.fill();
    c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=2;c.beginPath();c.moveTo(x+p+cell*.18,y+p+1);c.lineTo(x+cell-p-cell*.18,y+p+1);c.stroke();
    c.strokeStyle=`hsla(${wh},70%,75%,.10)`;c.beginPath();c.moveTo(x+p+cell*.18,y+cell-p-1);c.lineTo(x+cell-p-cell*.18,y+cell-p-1);c.stroke();}
}
function drawBoard(dt,now){
  const c=cx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,W);
  const t2=fx.trauma*fx.trauma,ox=9*t2*Math.sin(now*47.3),oy=7*t2*Math.sin(now*61.7+1.3),rot=0.02*t2*Math.sin(now*37.1);
  fx.trauma=Math.max(0,fx.trauma-1.7*dt);
  c.save();c.translate(W/2+ox,W/2+oy);c.rotate(rot);c.translate(-W/2,-W/2);
  drawTray(c,enemyHue());
  const r=cell*0.42;
  const auraCells=new Set();for(let i=0;i<R.cells.length;i++){const C=R.cells[i];if(C&&C.l&&weaponOf(C.l).id==='dia')for(const j of nb(i))if(R.cells[j]&&R.cells[j].l)auraCells.add(j);}
  let snap=null;
  if(drag&&R.cells[drag.from]){snap=snapTarget(drag.from,drag.x,drag.y);
    if(snap!=null){const x=(snap%R.N)*cell,y=Math.floor(snap/R.N)*cell,pulse=0.7+0.3*Math.sin(now*12);c.strokeStyle=`rgba(125,240,176,${pulse})`;c.lineWidth=4;c.beginPath();c.roundRect(x+3,y+3,cell-6,cell-6,cell*0.2);c.stroke();}}
  for(let i=0;i<R.N*R.N;i++){
    const C=R.cells[i];if(!C||(drag&&drag.from===i))continue;
    let sx=1,sy=1;
    if(fx.pop[i]!=null){fx.pop[i]+=dt;const k=Math.min(1,fx.pop[i]/0.24);sx=sy=Math.max(0.01,easeBack(k));if(fx.pop[i]>0.3)delete fx.pop[i];}
    if(fx.sq[i]!=null){fx.sq[i]+=dt;const a=fx.sq[i],e=Math.exp(-a*9)*Math.cos(a*26);sx*=1+0.3*e;sy*=1-0.26*e;if(a>0.6)delete fx.sq[i];}
    let [x,y]=fx.at(i);
    if(fx.back&&fx.back.i===i){fx.back.t+=dt;const k=Math.min(1,fx.back.t/0.18),e=1-Math.pow(1-k,3);x=fx.back.x+(x-fx.back.x)*e;y=fx.back.y+(y-fx.back.y)*e;if(k>=1)fx.back=null;}
    if(C.l&&auraCells.has(i)){c.save();c.globalAlpha=0.35+0.15*Math.sin(now*4);c.strokeStyle='rgb(212,140,255)';c.lineWidth=3;c.beginPath();c.arc(x,y,r*1.08,0,7);c.stroke();c.restore();}
    if(C.l&&C.fog)drawSpecial(c,x,y,r,'fog',now,sx);else if(C.l)drawGem(c,x,y,r,C.l,sx,sy,C.k==='gold',now);else drawSpecial(c,x,y,r,C.k,now,sx);
  }
  if(drag&&R.cells[drag.from]){const C=R.cells[drag.from];let dx=drag.x,dy=drag.y-8;if(snap!=null){const [tx,ty]=fx.at(snap);dx=dx+(tx-dx)*0.45;dy=dy+(ty-dy)*0.45;}if(C.l)drawGem(c,dx,dy,r,C.l,1.15,1.15,C.k==='gold',now);else drawSpecial(c,dx,dy,r,C.k,now,1.15);}
  c.globalCompositeOperation='lighter';
  fx.rings=fx.rings.filter(o=>{o.t+=dt;const k=o.t/0.42;if(k>=1)return false;c.beginPath();c.arc(o.x,o.y,r+k*cell*0.9,0,7);c.strokeStyle=`hsla(${o.h},100%,70%,${(1-k)*0.8})`;c.lineWidth=3*(1-k)+0.5;c.stroke();return true;});
  fx.parts=fx.parts.filter(p=>{p.t+=dt;if(p.t>=p.life)return false;p.vx*=0.92;p.vy*=0.92;p.x+=p.vx*dt;p.y+=p.vy*dt;const a=1-p.t/p.life;c.fillStyle=p.col?`rgba(${p.col},${a})`:`hsla(${p.h},100%,68%,${a})`;c.beginPath();c.moveTo(p.x,p.y-p.sz*a*1.6);c.lineTo(p.x+p.sz*a*.6,p.y);c.lineTo(p.x,p.y+p.sz*a*1.6);c.lineTo(p.x-p.sz*a*.6,p.y);c.closePath();c.fill();return true;});
  fx.shots=fx.shots.filter(s=>{s.t+=dt;const k=Math.min(1,s.t/0.22),y=s.y-(s.y+30)*k*k;
    if(s.col){c.strokeStyle=s.blocked?'rgba(127,226,255,.5)':`rgba(${s.col},.85)`;c.lineWidth=3*(1-k*0.4);c.beginPath();c.moveTo(s.x,y);c.lineTo(s.x,Math.min(s.y,y+26));c.stroke();c.fillStyle=`rgba(${s.col},1)`;c.beginPath();c.arc(s.x,y,3.5,0,7);c.fill();}
    else{SPEC.forEach((col,j)=>{c.strokeStyle=`rgba(${col},.8)`;c.lineWidth=2.2*(1-k*0.4);c.beginPath();const o=(j-2.5)*1.6;c.moveTo(s.x+o,y);c.lineTo(s.x+o*0.4,Math.min(s.y,y+30));c.stroke();});c.fillStyle='#fff';c.beginPath();c.arc(s.x,y,4,0,7);c.fill();}if(k>=1){shotLanded(s);return false;}return true;});
  fx.beams=fx.beams.filter(b=>{b.t+=dt;if(b.t>0.5)return false;const [x,y]=fx.at(b.i),a=1-b.t/0.5;c.strokeStyle=`rgba(255,90,110,${a})`;c.lineWidth=5*a+1;c.beginPath();c.moveTo(W/2,-10);c.lineTo(x,y);c.stroke();c.fillStyle=`rgba(255,90,110,${a*0.35})`;c.beginPath();c.arc(x,y,cell*0.45,0,7);c.fill();return true;});
  if(fx.glow>0.02){const g=c.createLinearGradient(0,0,W,W);SPEC.forEach((col,j)=>g.addColorStop(j/5,`rgba(${col},${fx.glow*0.7})`));c.strokeStyle=g;c.lineWidth=2+fx.glow*5;c.beginPath();c.roundRect(1.5,1.5,W-3,W-3,19);c.stroke();fx.glow*=Math.pow(0.22,dt);}
  c.globalCompositeOperation='source-over';
  fx.floats=fx.floats.filter(f=>{f.t+=dt;if(f.t>0.9)return false;const a=1-f.t/0.9,s=easeBack(Math.min(1,f.t/0.2));c.save();c.translate(f.x,f.y-f.t*36);c.scale(s,s);c.font=(f.small?'15px':'24px')+' "Lilita One",system-ui,sans-serif';c.textAlign='center';c.lineJoin='round';c.lineWidth=f.small?3:5;c.strokeStyle=`rgba(13,21,48,${a})`;c.strokeText(f.txt,0,0);c.fillStyle=`hsla(${f.h},100%,72%,${a})`;c.fillText(f.txt,0,0);c.restore();return true;});
  if(fx.flash>0){c.fillStyle=`rgba(${fx.flashCol},${fx.flash*0.28})`;c.fillRect(-10,-10,W+20,W+20);fx.flash=Math.max(0,fx.flash-dt*1.5);}
  c.restore();
  if(tutoStep===1){const pair=findPair();if(pair){const [ax,ay]=fx.at(pair[0]),[bx,by]=fx.at(pair[1]);const k=(now*0.8)%1;c.save();c.setTransform(dpr,0,0,dpr,0,0);c.strokeStyle='#ffc857';c.lineWidth=4;c.setLineDash([10,9]);c.lineDashOffset=-now*30;c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();c.setLineDash([]);c.fillStyle='#fff6e4';c.beginPath();c.arc(ax+(bx-ax)*k,ay+(by-ay)*k,10,0,7);c.fill();c.restore();}}
}
function findPair(){const seen={};for(let i=0;i<R.cells.length;i++){const c=R.cells[i];if(c&&c.l){if(seen[c.l]!=null)return [seen[c.l],i];seen[c.l]=i;}}return null;}
function skinHue(t){const k=skinInfo(S.skin)||skinInfo('cyan');if(k.hue===-2)return 225+75*Math.sin(t*0.9);if(k.hue===-3)return 38+14*Math.sin(t*2.2);if(k.hue<0)return (t*50)%360;return k.x?(k.hue+25*Math.sin(t*2)+360)%360:k.hue;} // v12 : couleurs de saison (Éclat = reflets)
function skinColor(t){return `hsl(${skinHue(t)} 100% 70%)`;}

/* ================= ennemis de cristal ================= */
const bcv=$('bossCv'),bxc=bcv.getContext('2d');let BW=0,BH=0;
const bfx={hitT:0,recoil:0,nums:[],dieT:0,parts:[],phaseT:0,blink:2,embers:[],shards:[],popT:1};
function enemyHue(){return R.E.type==='titan'?WORLDS[R.E.th].h:worldInfo(worldOf(R.E.stage)).h;}
//__FOE__
function drawEnemy(dt,t){
  const c=bxc,E=R.E;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,BW,BH);
  const h=enemyHue();
  bfx.hitT=Math.max(0,bfx.hitT-dt*5);bfx.recoil*=Math.pow(0.01,dt);bfx.phaseT=Math.max(0,bfx.phaseT-dt*0.7);bfx.blink-=dt;if(bfx.blink<-0.14)bfx.blink=rnd(2,5);
  bfx.popT=Math.min(1,bfx.popT+dt*3.5);
  const boss=R.mode==='boss',windup=boss&&R.t>=R.frostUntil&&E.atkT<=CFG.enemy.windup?1-E.atkT/CFG.enemy.windup:0;
  const cy=BH*0.54,base={mob:0.26,mini:0.27,boss:0.27,titan:0.27}[E.type]*BH;
  let r=base*(1+Math.sin(t*2)*0.03)*(1-bfx.recoil*0.1)*(1+windup*0.1)*Math.max(0.01,easeBack(bfx.popT));
  if(!bfx.shards.length)for(let k=0;k<9;k++)bfx.shards.push({x:Math.random(),y:Math.random(),s:rnd(4,9),v:rnd(4,9),r:rnd(0,6.28),n:3+Math.floor(rnd(0,4))});
  bfx.shards.forEach(sh=>{sh.y-=sh.v*dt/BH;if(sh.y<-0.1){sh.y=1.1;sh.x=Math.random();}sh.r+=dt*0.3;c.save();c.translate(sh.x*BW,sh.y*BH);c.rotate(sh.r);c.globalAlpha=0.22;poly(c,0,0,sh.s,sh.n,0);c.strokeStyle=`hsl(${h} 90% 80%)`;c.lineWidth=1.5;c.stroke();c.restore();});
  const halo=c.createRadialGradient(BW/2,BH*0.55,0,BW/2,BH*0.55,BH*0.75);halo.addColorStop(0,`hsla(${h},80%,55%,.22)`);halo.addColorStop(1,'transparent');c.fillStyle=halo;c.fillRect(0,0,BW,BH);
  const sp=c.createRadialGradient(BW/2,-BH*0.2,0,BW/2,-BH*0.2,BH*1.3);sp.addColorStop(0,'rgba(255,214,150,.20)');sp.addColorStop(1,'rgba(255,214,150,0)');c.fillStyle=sp;c.fillRect(0,0,BW,BH);
  c.fillStyle='rgba(6,3,22,.55)';c.beginPath();c.ellipse(BW/2,cy+base*1.55,base*1.25,base*0.2,0,0,7);c.fill();
  if(boss){const prog=Math.min(1,Math.max(0,1-E.atkT/E.atkEvery)),ringR=base*1.72;
    c.lineWidth=5;c.strokeStyle='rgba(255,255,255,.08)';c.beginPath();c.arc(BW/2,cy,ringR,0,7);c.stroke();
    c.strokeStyle=windup?`rgba(255,90,110,${0.7+0.3*Math.sin(t*20)})`:'rgba(255,90,110,.55)';c.lineCap='round';c.beginPath();c.arc(BW/2,cy,ringR,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);c.stroke();c.lineCap='butt';}
  if(R.t<R.frostUntil){c.fillStyle='rgba(127,226,255,.12)';c.fillRect(0,0,BW,BH);}
  if(R.burn&&R.burn.until>R.t&&Math.random()<dt*25)bfx.embers.push({x:BW/2+rnd(-r*0.8,r*0.8),y:cy+r*0.5,vy:-rnd(30,70),t:0,life:rnd(.5,.9)});
  bfx.embers=bfx.embers.filter(e=>{e.t+=dt;if(e.t>e.life)return false;e.y+=e.vy*dt;const a=1-e.t/e.life;c.fillStyle=`rgba(255,120,90,${a})`;c.beginPath();c.arc(e.x,e.y,2.5,0,7);c.fill();return true;});
  const aura=Math.max(windup*0.4,bfx.phaseT*0.5);
  if(aura>0){const g=c.createRadialGradient(BW/2,cy,r*0.4,BW/2,cy,r*2.2);g.addColorStop(0,`rgba(255,90,110,${aura})`);g.addColorStop(1,'rgba(255,90,110,0)');c.fillStyle=g;c.fillRect(0,0,BW,BH);}
  if(r>0.5){c.save();c.translate(BW/2+(windup?rnd(-1,1)*windup*3:0),cy-bfx.recoil*6);drawFoe(c,E.th,E.type,h,r,t,{hit:bfx.hitT,rage:0,blink:bfx.blink,shieldL:E.shieldL&&R.t>=R.breakUntil?E.shieldL:0});c.restore();}
  c.globalCompositeOperation='lighter';
  bfx.parts=bfx.parts.filter(p=>{p.t+=dt;if(p.t>=p.life)return false;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.95;p.vy*=0.95;const a=1-p.t/p.life;c.fillStyle=p.col?`rgba(${p.col},${a})`:`hsla(${p.h},100%,68%,${a})`;c.beginPath();c.arc(p.x,p.y,p.sz*a+0.5,0,7);c.fill();return true;});
  c.globalCompositeOperation='source-over';
  bfx.nums=bfx.nums.filter(n=>{n.t+=dt;if(n.t>1)return false;const a=1-n.t,s=easeBack(Math.min(1,n.t/0.18));c.save();c.translate(n.x,n.y-n.t*30);c.scale(s,s);c.font=`${n.big?30:20}px "Lilita One",system-ui,sans-serif`;c.textAlign='center';c.lineJoin='round';c.lineWidth=5;c.strokeStyle=`rgba(13,21,48,${a})`;c.strokeText(n.txt,0,0);c.fillStyle=n.col.replace(')',` / ${a})`);c.fillText(n.txt,0,0);c.restore();return true;});
}
function enemyBurst(n,h,sp){for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,s=rnd(sp*0.3,sp);bfx.parts.push({x:BW/2,y:BH*0.52,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.4,1),t:0,h,col:h==null?SPEC[k%6]:null,sz:rnd(2,5)});}}
let lastHitT=0,numT=0;
hooks.hit=(i,d,blocked,crit,w)=>{const [x,y]=i==null?[W/2,W]:fx.at(i);fx.shots.push({x,y,t:0,d,blocked,crit,col:w?w.col:null});};
function shotLanded(s){
  if(s.blocked){if(performance.now()-numT>600){numT=performance.now();bfx.nums.push({txt:t('blocked'),t:0,x:BW/2+rnd(-30,30),y:BH*0.3,col:'hsl(192 100% 75%)'});}return;}
  bfx.hitT=1;bfx.recoil=Math.min(1,bfx.recoil+0.6);lastHitT=performance.now()/1000;
  const big=s.crit||(R.E.type!=='titan'&&s.d>=R.E.max*0.1);
  if(big||performance.now()-numT>350){numT=performance.now();bfx.nums.push({txt:(s.crit?t('crit'):'')+'−'+(s.d*DX<1?dec(s.d*DX,1):fmt(Math.round(s.d*DX))),t:0,x:BW/2+rnd(-40,40),y:BH*0.36,col:big?'hsl(44 100% 66%)':'hsl(40 100% 96%)',big});}
  for(let k=0;k<(big?14:4);k++){const a=Math.random()*Math.PI*2,sp=rnd(60,big?260:140);bfx.parts.push({x:BW/2,y:BH*0.52,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.3,.6),t:0,col:SPEC[k%6],sz:rnd(1.5,3.5)});}
  if(s.crit&&s.d>=R.E.max*0.1)kick('medium');
  if(big)tone(110+Math.min(s.d,1e6)**0.1*20,0.12,'square',0.06);
}
hooks.attack=(kind,hit)=>{hit.forEach(i=>fx.beams.push({i,t:0}));kick('medium');sfx.low();bfx.nums.push({txt:t('he',{a:THEMES[R.E.th].atkT}),t:0,x:BW/2,y:BH*0.92,col:'hsl(352 100% 76%)'});};
hooks.windup=()=>{sfx.tick();};
hooks.phase=p=>{bfx.phaseT=1;if(p==='shield'){banner(t('shield'),t('shield_p',{n:R.E.shieldL}),'boss',2600);sfx.chord();kick('large');}};
hooks.kill=(E,sp,sh)=>{if(sh>=1){bfx.nums.push({txt:'+'+fmt(Math.round(sh))+' ◆',t:0,x:BW/2,y:BH*0.78,col:'hsl(196 100% 78%)',big:E.type==='boss'});}enemyBurst(E.type==='mob'?18:40,null,E.type==='mob'?200:320);if(E.type!=='mob'){fx.flash=1;fx.flashCol='255,200,87';kick(E.type==='boss'?'huge':'large');sfx.win();}else{kick('small');sfx.pop();}bfx.popT=0;bfx.nums=[];
  bfx.nums.push({txt:'+'+fmt(sp),t:0,x:BW/2,y:BH*0.5,col:'hsl(44 100% 66%)',big:true});
  if(S.run.stage%10===1&&S.run.stage>1&&!S.run.fled)banner(worldInfo(worldOf(S.run.stage)).name,t('new_world'),'gold',2200);};
hooks.bossStart=E=>{banner(E.name,t('boss_banner',{n:CFG.enemy.bossTime}),'boss',2600);sfx.chord();kick('medium');Music.target=0.9;};
hooks.bossFled=v=>{banner(t(v?'boss_back':'boss_fled'),t('boss_fled_p'),'',2600);sfx.low();Music.target=0.3;renderActs();};
hooks.joker=id=>{const j=jokerById(id);sfx.chord();fx.glow=1;fx.flash=0.6;fx.flashCol='212,140,255';kick('medium');bfx.nums.push({txt:j.t,t:0,x:BW/2,y:BH*0.85,col:'hsl(282 100% 80%)',big:true});};
hooks.harvest=(i,sp)=>{if(Math.random()<0.5)return;const [x,y]=fx.at(i);fx.floats.push({x,y:y-cell*.2,t:0,txt:'+'+(sp<10?dec(sp,1):fmt(sp)),h:150,small:true});};
hooks.tb=k=>{sfx.buy();kick('small');fx.glow=Math.min(1,fx.glow+0.4);if(tutoStep===3)tutoNext();};
hooks.autoPrestige=()=>{act('prestige',{},()=>doPrestige()||false);};
hooks.prestige=g=>{track('refraction',{stage:S.run.stage,pts:g});boardCache=null;fx.flash=1;fx.flashCol='127,226,255';kick('huge');sfx.win();for(let i=0;i<R.N*R.N;i++)fx.burst(i,null,4,300);};
hooks.titanEnd=d=>{Music.target=0.3;boardCache=null;act('titan_end',{score:Math.floor(d)});modal(`<div class="mart" style="color:var(--s1)">${ic('flame')}</div><h2>${THEMES[weekTheme()].titan}</h2><div class="big">${fmt(d*DX)}</div><p>${d>=S.st.titanBest?t('titan_record'):t('titan_prev',{n:fmt(S.st.titanBest*DX)})}</p><div class="acts"><button class="b b-gold" data-close>${t('continue')}</button></div>`);};
//__ME__
/* ================= saisie (glisser, aimant, retour) ================= */
function cellAt(e){const r=cv.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;if(x<0||y<0||x>=r.width||y>=r.height)return null;return {i:Math.floor(y/cell)*R.N+Math.floor(x/cell),x,y};}
cv.addEventListener('pointerdown',e=>{
  audio();Music.start();if(!R||R.paused)return;const h=cellAt(e);if(!h)return;
  const C=R.cells[h.i];if(!C||C.k==='lock')return;
  cv.setPointerCapture(e.pointerId);drag={from:h.i,x:h.x,y:h.y,sx:h.x,sy:h.y,moved:false};
});
cv.addEventListener('pointermove',e=>{if(!drag)return;const r=cv.getBoundingClientRect();drag.x=e.clientX-r.left;drag.y=e.clientY-r.top;if(Math.hypot(drag.x-drag.sx,drag.y-drag.sy)>6)drag.moved=true;});
function dropDrag(){
  if(!drag)return;const from=drag.from;
  if(drag.moved&&R.cells[from]){
    const snap=snapTarget(from,drag.x,drag.y);
    if(snap!=null){const res=runMove(from,snap,true);if(res==='merge'&&tutoStep===1)tutoNext();}
    else{const h=cellAt({clientX:drag.x+cv.getBoundingClientRect().left,clientY:drag.y+cv.getBoundingClientRect().top});
      if(h&&!R.cells[h.i]){runMove(from,h.i,true);fx.back={i:h.i,x:drag.x,y:drag.y-8,t:0};}
      else fx.back={i:from,x:drag.x,y:drag.y-8,t:0};}
  }
  drag=null;
}
cv.addEventListener('pointerup',dropDrag);
cv.addEventListener('pointercancel',dropDrag);

/* ================= interface ================= */
let tab='home',toastT=null,bannerT=null,clanPane='league',guildList=null,guildBusy=false,gdErrMsg='';
const gdErr=e=>{const k='gd_err_'+String(e||'server');return I18N.fr[k]?t(k):t('srv_refused');};
function toast(m){const t=$('toast');t.hidden=true;void t.offsetWidth;t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2200);}
function banner(t,sub,cls,ms){const b=$('banner');b.hidden=true;void b.offsetWidth;b.className='banner '+(cls||'');b.innerHTML=esc(t)+(sub?`<small>${esc(sub)}</small>`:'');b.hidden=false;clearTimeout(bannerT);bannerT=setTimeout(()=>b.hidden=true,ms||2000);}
let modalOnClose=null;
function modal(html,onClose){$('modal').innerHTML=html;$('veil').hidden=false;modalOnClose=onClose||null;if(R)R.paused=true;const b=$('modal').querySelector('.b');if(b)b.focus({preventScroll:true});}
function closeModal(){$('veil').hidden=true;$('modal').innerHTML='';const f=modalOnClose;modalOnClose=null;if(R)R.paused=false;if(f)f();}
function showAd(done,label){
  let n=3;modal(`<div class="mart">${ic('tv','ie')}</div><p>${label||t('ad_sim')}</p><div class="ad" id="adn">3</div><p>${t('ad_real')}</p>`);
  const it=setInterval(()=>{n--;const el=$('adn');if(el)el.textContent=n;if(n<=0){clearInterval(it);closeModal();done();}},1000);
}
/* v11.6 : délai entre deux pubs du même type, identique au serveur (sinon il refusait et la récompense était retirée) */
const AD_GAP={shop:40,boost:40,build:15},adLast={};
function adWait(k){const g=AD_GAP[k];if(!g)return 0;return Math.max(0,Math.ceil((adLast[k]||0)+g*1000-Date.now())/1000);}
function adGate(k){const w=adWait(k);if(w>0){toast(t('ad_wait',{s:Math.ceil(w)}));return false;}adLast[k]=Date.now();return true;}
function rewarded(done){track('ad',{at:lastPlace});showAd(()=>{roll();S.day.ads++;done();save();refresh();});}
function maybeInterstitial(then){const n=+(lsGet('prisme-adc')||0);if(!S.noAds&&n>=CFG.interstitialEvery){lsSet('prisme-adc','0');showAd(then,t('ad_between'));}else then();} // v11.6 : compteur sur l'appareil (S.adCount était remis à 0 par le serveur)

/* v9.9 : onglets débloqués au fil de la progression (premières minutes plus lisibles) */
const NAV_AT={atelier:3,quests:5,shop:8,clan:10};
/* v11.5 : onglets déjà annoncés gardés sur l'appareil. S.st.nav n'était pas conservé par le serveur : à chaque synchronisation,
   la liste repartait à zéro et « Nouvel onglet » revenait en boucle. */
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}},lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
let NAVS=null,guildTry=0;const doneSeen=new Set();
function navSeen(){if(NAVS)return NAVS;try{NAVS=JSON.parse(localStorage.getItem('prisme-nav')||'null');}catch(e){}if(!Array.isArray(NAVS))NAVS=Object.keys(NAV_AT).filter(k=>S.bestStage>=NAV_AT[k]||S.prestiges>0);return NAVS;}
function navUnlock(){const seen=navSeen();for(const k in NAV_AT){const b=document.querySelector(`.nav [data-tab="${k}"]`);if(!b)continue;const on=S.bestStage>=NAV_AT[k]||S.prestiges>0;b.hidden=false; /* v11.1 : onglets verrouillés visibles (cadenas + étape), plus d'onglet « Jeu » seul */
    b.classList.toggle('lockd',!on);b.setAttribute('aria-disabled',String(!on));let lk=b.querySelector('.lk');if(!on&&!lk){lk=document.createElement('span');lk.className='lk';lk.innerHTML=ic('lock');b.appendChild(lk);}else if(on&&lk)lk.remove();
    if(on&&!seen.includes(k)){seen.push(k);try{localStorage.setItem('prisme-nav',JSON.stringify(seen));}catch(e){}if(S.bestStage>1&&S.bestStage<20){toast(t('nav_new',{t:t('nav_'+k)}));b.classList.add('newtab');setTimeout(()=>b.classList.remove('newtab'),2400);sfx.chord();}}}}
/* v12 : annonce de l'événement du week-end, une fois par jour, sur l'écran de jeu */
function evBanner(){const e=weekendEvent();if(!e||tab!=='home'||S.bestStage<5||!$('veil').hidden)return;if(lsGet('prisme-ev')===dayKey())return;lsSet('prisme-ev',dayKey());banner(t('ev_now')+' : '+t('ev_'+e),t('ev_'+e+'_d'),'ev',3800);}
/* v12.1 : texte des bonus (couleur portée, médaille) */
const nbsp=x=>String(x).replace(/ (%)/g,'\u00a0$1');
/* v12.4 : aide à la demande : icône + quelques mots par ligne */
function helpModal(icn,ttl,lines){modal(`<div class="mart" style="color:var(--beam)">${ic(icn)}</div><h2>${ttl}</h2><ul class="hlp">${lines.map(([i,k])=>`<li>${ic(i)}<span>${t(k)}</span></li>`).join('')}</ul><div class="acts"><button class="b" data-close>${t('close')}</button></div>`);}
const BNI={dmg:['swords','is1'],sp:['spark','ie'],cad:['hourglass','is5'],res:['anvil','ie'],jok:['star','ig'],off:['clock','is6']};
const bnChip=(k,v)=>`<span class="bnc">${ic(BNI[k][0],BNI[k][1])}+${v}\u00a0%</span>`; /* v12.4 : bonus en icône + chiffre, sans mots */
const bnText=bn=>{const e=Object.entries(bn||{});return e.length?e.map(([k,v])=>bnChip(k,Math.round(v*100))).join(''):'—';};
const hueAttr=k=>k.hue===-1?'prism':k.hue===-2?225:k.hue===-3?38:k.hue;
const MEDAL_COL=['#5d6b98','#d08a4e','#c8d4e6','#ffd23e','#7fe9ff'];
function medalsHtml(){return nbsp(medalsHtml0());}
function medalsHtml0(){const tot=['dmg','sp','cad','res','jok','off'].map(k=>[k,bonusMul(k)-1]).filter(x=>x[1]>0.0005);
  let h=`<h2 class="sec">${t('md_title')}${medalsReady()?RD:''}</h2>`;
  if(tot.length)h+=`<p class="mdtot">${tot.map(([k,v])=>bnChip(k,dec(v*100,v<0.1?1:0))).join('')}</p>`;
  h+=`<div class="medals">`+MEDALS.map(m=>{const l=medalLvl(m.id),rd=medalReady(m),v=m.v(),nx=m.th[Math.min(l,3)],cur=medalBonusOf(m,l),nb=l<4?medalBonusOf(m,l+1):cur;
    return `<div class="medal slab${rd?' rd':''}${l>=4?' mx':''}" style="--mc:${MEDAL_COL[l]}"><span class="mart2">${ic(m.ic)}${l?`<i>${'◆'.repeat(l)}</i>`:''}</span><div style="min-width:0" title="${t('md_'+m.id+'_d',{n:fmt(nx)})}"><b>${m.t}</b><small class="mrk">${l?t('md_r'+l):''}${cur?' '+bnChip(m.k,dec(cur*100,1)):''}</small>${l<4?`<div class="qbar"><i style="width:${Math.min(100,100*v/nx)}%"></i><span>${fmt(Math.min(v,nx))} / ${fmt(nx)}</span></div><small class="mnx">→ ${t('md_r'+(l+1))} ${bnChip(m.k,dec(nb*100,1))} ${ic('gem','ig')}${MEDAL_GEMS[l]}</small>`:''}</div>${rd?`<button class="b b-gold sm" data-medal="${m.id}">${t('md_claim')}</button>`:''}</div>`;}).join('')+`</div>`;
  return h;}
/* v12.2 : panneau Boosters : tout ce qui s'achète en étincelles pour la partie en cours, immédiat, remis à zéro à la Réfraction */
const RUNG=['atk','grid','eco'];
const runUpReady=()=>UPG.some(u=>RUNG.includes(u.g)&&!upLocked(u)&&isFinite(upCost(u))&&upCost(u)<=S.run.sparks);
function boostView(){const sp=S.run.sparks;
  let h=`<header class="phead"><div><h1 class="ttl">${t('bp_title')}</h1></div><button class="quit" data-tab="home" aria-label="${t('nav_home')}">${ic('close')}</button></header>`;
  h+=`<div class="bal">${ic('spark','ie')}<b id="balSp">${fmt(sp)}</b></div>`;
  h+=`<h2 class="sec subsec">${t('bp_main')}</h2><div class="list bplist">`+Object.keys(TBDEF).map(k=>{const d=TBDEF[k],l=tbLvl(k),c=tbCost(k),mx=!isFinite(c);
    return `<div class="bprow" style="--tc:var(--${d.c})"><span class="bpic">${ic(d.i)}</span><div style="min-width:0"><b>${d.t} <em>${t('lvl',{n:l})}</em></b><p>${d.n(l)}${mx?'':` → <span class="jnext">${d.n(l+1)}</span>`}</p></div>${mx?`<span class="d">${t('max')}</span>`:`<button class="b b-spark sm" data-bptb="${k}" ${sp<c?'disabled':''}>${ic('spark')}${fmt(c)}</button>`}</div>`;}).join('')+`</div>`;
  for(const g of RUNG){h+=`<h2 class="sec subsec">${GROUPS.find(x=>x.id===g).t}</h2><div class="list bplist">`+UPG.filter(u=>u.g===g).map(u=>{const l=lvlOf(u),c=upCost(u),lk=upLocked(u),mx=l>=u.max;
    return `<div class="bprow${lk?' lk':''}"><span class="bpic">${ic(upIcon(u))}</span><div style="min-width:0"><b>${u.t}${l?` <em>${t('lvl',{n:l})}</em>`:''}</b><p>${u.d(l)}</p></div>${lk?`<span class="d">${ic('lock')}${t('jk_st_lock',{n:upReq(u)})}</span>`:mx?`<span class="d">${t('max')}</span>`:`<button class="b b-spark sm" data-build="${u.id}" ${sp<c?'disabled':''}>${ic('spark')}${fmt(c)}</button>`}</div>`;}).join('')+`</div>`;}
  return h;}
/* v12.5 : pastille rouge = récompense à récupérer ; elle reste tant que rien n'est récupéré et remonte jusqu'au menu parent */
const RD='<span class="badge rd"></span>';
function passPageReady(a,b){const p=passState(),n=Math.min(passTier(),b);for(let i=a+1;i<=n;i++)if(!p.cf.includes(i)||(p.prem&&!p.cp.includes(i)))return true;return false;}
const loginReady=()=>!loginState().claimedToday;
const questsReward=()=>claimable()||loginReady()||passClaimable();
const shopReward=()=>!S.day.sgift||passClaimable();
function refresh(){
  roll();{const tbn=document.querySelectorAll('#tb .tbt[data-tb]').length;if(R&&(tbn!==Object.keys(TBDEF).filter(tbShown).length||!!$('boostBtn')!==moreShown()))renderTB();} /* v12.3 : nouveau booster révélé dès qu'il se débloque */evBanner();if(tab==='home'&&!S.prestiges&&S.bestStage>=25&&$('hint').hidden&&lsGet('prisme-hintr')!=='1'){lsSet('prisme-hintr','1');showHint(t('hint_refr',{n:CFG.prestige.minStage}),7000);} /* v12.3 : la Réfraction expliquée quand elle approche, plus à l'étape 3 */{const mb=$('meBtn');if(mb)mb.classList.toggle('dot',medalsReady());}
  gemCounter();const bs=$('balSp');if(bs)bs.textContent=fmt(S.run.sparks);const rm=$('rateMin');if(rm)rm.textContent=rateMin()>=1?t('rate_min',{n:fmt(Math.round(rateMin()))}):''; /* v9.9 : pas de « 0 / min » au démarrage */
  navUnlock();
  const rg=$('refrG');if(rg){const on=!S.prestiges&&S.bestStage>=10&&S.run.max<CFG.prestige.minStage;rg.hidden=!on;if(on)rg.textContent=t('refr_gauge',{n:S.run.max,m:CFG.prestige.minStage});}
  $('bQ').hidden=!questsReward();{const bS=$('bS');if(bS)bS.hidden=!shopReward();}$('bC').hidden=!(guildCache&&guildCache.guild&&guildClaimable());
  const done=tickBuild().filter(id=>{const k=id+':'+lvlOf(upById(id));if(doneSeen.has(k))return false;doneSeen.add(k);return true;});if(done.length){done.forEach(id=>toast(t('at_done',{t:upById(id).t})));sfx.chord();save();if(tab==='atelier')renderTab();if(R)renderTB();}
  const canBuild=ALLUP.some(canStart)||JOKERS.some(j=>jokerAvail(j)&&!S.jk[j.id]&&S.run.sparks>=j.sh);
  $('bA').hidden=!canBuild;document.querySelectorAll('.nav button.lockd .badge').forEach(x=>x.hidden=true); /* v12.6 : pas de pastille sur un onglet verrouillé */$('bA').classList.add('soft'); // v12.3 : achat possible = pastille discrète (le rouge est réservé aux récompenses)
  document.querySelectorAll('[data-until]').forEach(el=>{el.textContent=dur((+el.dataset.until-Date.now())/1000);});
  document.querySelectorAll('[data-ring]').forEach(el=>{const b=inBuild(el.dataset.ring);if(b)el.style.setProperty('--p',(100*Math.min(1,1-(b.until-Date.now())/1000/b.dur))+'%');});
  document.querySelectorAll('[data-rushg]').forEach(el=>{const b=inBuild(el.dataset.rushg);if(b)el.lastChild.textContent=rushGems(b);});
  if(R)renderActs();
}
/* ----- écran de jeu ----- */
function renderStage(){
  const E=R.E,w=worldInfo(worldOf(E.stage));document.documentElement.style.setProperty('--wh',E.type==='titan'?`hsl(${WORLDS[E.th].h} 100% 62%)`:w.col);
  $('stgN').textContent=E.type==='titan'?E.name:t('stage',{n:E.stage});
  $('stgW').textContent=E.type==='titan'?t('type_titan'):E.type==='boss'?E.name:w.name;
  $('hpWrap').classList.toggle('titan',E.type==='titan');
}
/* v12.3 : révélation progressive : 2 boosters au départ, les autres en avançant, « Plus » à l'étape 4 */
const TB_AT={cad:1,power:1,spark:3,auto:5,birth:8};
const tbShown=k=>S.prestiges>0||S.bestStage>=(TB_AT[k]||1)||tbLvl(k)>0;
const moreShown=()=>S.prestiges>0||S.bestStage>=4;
function tbNewCheck(ks){let seen;try{seen=JSON.parse(localStorage.getItem('prisme-tbseen')||'null');}catch(e){seen=null;}if(!seen){seen=ks.slice();try{localStorage.setItem('prisme-tbseen',JSON.stringify(seen));}catch(e){}return;}
  const nw=ks.filter(k=>!seen.includes(k));if(!nw.length)return;nw.forEach(k=>seen.push(k));try{localStorage.setItem('prisme-tbseen',JSON.stringify(seen));}catch(e){}
  if(S.bestStage>1&&!S.prestiges){toast(t('tb_new',{t:TBDEF[nw[0]].t}));setTimeout(()=>{const b=document.querySelector(`.tbt[data-tb="${nw[0]}"]`);if(b)b.classList.add('newtab');},30);}}
function renderTB(){
  const sp=S.run.sparks;
  const ks=Object.keys(TBDEF).filter(tbShown),more=moreShown();$('tb').style.gridTemplateColumns=`repeat(${ks.length},minmax(0,1fr))${more?' 46px':''}`;tbNewCheck(ks);
  $('tb').innerHTML=ks.map(k=>{const c=tbCost(k),l=tbLvl(k),ok=isFinite(c)&&sp>=c,max=!isFinite(c);
    return `<button class="tbt ${ok?'ok':''} ${ok&&tutoStep===3?'hot':''}" data-tb="${k}" style="--tc:var(--${TBDEF[k].c})" ${max?'disabled':''} aria-label="${max?t('tb_aria_max',{t:TBDEF[k].t,l,d:TBDEF[k].d}):t('tb_aria',{t:TBDEF[k].t,l,c:fmt(c),d:TBDEF[k].d})}"><span class="lv">${l}</span><span class="ico">${ic(TBDEF[k].i)}</span><span class="lbl">${TBDEF[k].t}</span><b>${max?t('max'):ic('spark')+fmt(c)}</b></button>`;}).join('')+(more?`<button class="tbt more${runUpReady()?' ok':''}" id="boostBtn" aria-label="${t('bp_title')}"><span class="ico">${ic('plus')}</span><span class="lbl">${t('bp_more')}</span>${runUpReady()?'<i class="bdot"></i>':''}</button>`:'');
  renderJok();
}
function updTB(){const sp=S.run.sparks;document.querySelectorAll('[data-tb]').forEach(b=>{const c=tbCost(b.dataset.tb);b.classList.toggle('ok',isFinite(c)&&sp>=c);});}
function renderActs(){
  const a=$('acts');let h='';
  const g=prestigeGain(),canP=S.run.max>=CFG.prestige.minStage;
  if(R.mode==='boss'&&R.E.type==='boss')h+=`<button class="qb" id="retreat" aria-label="${t('retreat_aria',{n:S.run.stage-1})}"><span>${ic('flag')}</span></button>`;
  if(S.run.fled)h+=`<button class="qb hot" id="chal" aria-label="${t('chal_aria',{n:S.run.stage})}"><span>${ic('crown')}</span></button>`;
  if(S.bestStage>=CFG.prestige.minStage||canP)h+=`<button class="qb ${canP?'on':''}" id="prest" ${canP?'':'disabled'} aria-label="${canP?t('pre_aria',{m:dec(1+CFG.prestige.mult*(S.prestiges+1),1)}):t('pre_locked',{n:CFG.prestige.minStage})}"><span>${ic('prism')}</span>${canP?'<i></i>':''}</button>`;
  if(S.bestStage>=CFG.titan.stage&&isTitanDay()){const rd=titanReady();h+=`<button class="qb ${rd?'on':''}" id="titan" ${R.mode!=='farm'?'disabled':''} aria-label="${t('titan_aria',{n:titanTickets()})}"><span>${ic('flame')}</span>${rd?'<i></i>':''}</button>`;}
  if(h!==a.dataset.h){a.dataset.h=h;a.innerHTML=h;}
  a.hidden=!h;
}
function renderJok(){
  const ids=Object.keys(R.jk);$('jok').hidden=!ids.length;
  $('jok').innerHTML=ids.map(id=>`<button class="tool jtool" data-jk="${id}" aria-label="${jokerById(id).t}"><span class="oc">${ic(JICON[id])}</span><small>${jokerById(id).t}</small></button>`).join('');
  updJok();
}
function updJok(){for(const id in R.jk){const need=jokerNeed(id),v=R.jk[id],b=document.querySelector(`[data-jk="${id}"]`);if(!b)continue;const ready=v>=need;b.classList.toggle('ready',ready);b.querySelector('.oc').style.setProperty('--p',(100*Math.min(1,v/need))+'%');b.querySelector('small').textContent=ready?t('j_ready'):jokerById(id).t;b.setAttribute('aria-label',`${jokerById(id).t} : ${ready?t('j_ready'):Math.floor(v)+' / '+need}`);}}
$('jok').addEventListener('click',e=>{const b=e.target.closest('[data-jk]');if(!b||!R||R.paused)return;audio();if(useJoker(b.dataset.jk)){save();}else toast(t('j_notready'));updJok();});
let tbHold=null,tbHeld=false;
$('tb').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-tb]');if(!b)return;tbHeld=false;clearTimeout(tbHold);tbHold=setTimeout(()=>{tbHeld=true;tbDetail(b.dataset.tb);},450);});
['pointerup','pointercancel','pointerleave'].forEach(ev=>$('tb').addEventListener(ev,()=>clearTimeout(tbHold)));
$('tb').addEventListener('click',e=>{if(e.target.closest('#boostBtn')){goTab('boost');return;}const b=e.target.closest('[data-tb]');if(!b||!R||tbHeld)return;audio();Music.start();if(buyTB(b.dataset.tb)){renderTB();save();}else{const c=tbCost(b.dataset.tb);if(isFinite(c)){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}}});
function tbDetail(k){const d=TBDEF[k],l=tbLvl(k),c=tbCost(k);modal(`<div class="mart" style="color:var(--${d.c})">${ic(d.i)}</div><h2>${d.t}</h2><p style="color:var(--light)">${d.d}.</p><p>${t('tb_lvl',{n:l,v:d.n(l)})}${isFinite(c)?'<br>'+t('tb_lvl',{n:l+1,v:d.n(l+1)}):''}</p><p style="color:var(--mist);font-size:13px">${t('tb_note',{t:d.t})}</p><div class="acts">${isFinite(c)?`<button class="b b-gold" data-buytb="${k}" ${S.run.sparks>=c?'':'disabled'}>${ic('spark')}${t('tb_buy',{c:fmt(c)})}</button>`:''}<button class="b" data-close>${t('close')}</button></div>`);}
$('acts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!R)return;audio();
  if(b.id==='chal'){if(challengeBoss()){renderStage();renderActs();}}
  else if(b.id==='retreat'){if(retreat()){renderStage();renderActs();save();}}
  else if(b.id==='prest')prestigeModal();
  else if(b.id==='titan')titanModal();
});
function prestigeModal(){const g=prestigeGain(),pp=ppGain(S.run.max)+(S.prestiges?0:CFG.prestige.first),m0=refMult(),m1=1+CFG.prestige.mult*(S.prestiges+1); /* v12.4 : chiffres et icônes, plus de paragraphes */
  modal(`<div class="mart" style="color:var(--shard)">${ic('prism')}</div><h2>${t('pre_title')}</h2><div class="prg"><span>${ic('spark','ie')}×${dec(m0,1)} → <b>×${dec(m1,1)}</b></span><span>${ic('prism')}<b>+${pp}</b></span><span>${ic('coin','ig')}<b>+${fmt(g)}</b></span></div><div class="prek"><div class="keep"><b>${ic('shield')}${t('pre_keep')}</b><p>${ic('anvil')}${ic('link')}${ic('star')}${ic('gem','ig')}${ic('crown','ig')}</p></div><div class="cyc"><b>${ic('flag')}${t('pre_lose')}</b><p>${ic('spark','ie')}${ic('bolt','ie')}${ic('swords')}${ic('grid')}</p></div></div><div class="acts"><button class="b b-spark" id="doPrest">${t('pre_go')}</button><button class="b" data-close>${t('pre_not')}</button></div>`);}
function titanModal(){const ts=titanState(),n=titanTickets();modal(`<div class="mart" style="color:var(--s1)">${ic('flame')}</div><h2>${THEMES[weekTheme()].titan}</h2><p>${t('titan_p',{n:CFG.titan.time})}</p><div class="big" style="color:var(--beam)">${t('titan_tickets',{n})}</div><div class="acts"><button class="b b-gold" id="titanGo" ${n>0?'':'disabled'}>${t('fight')}</button><div class="row"><button class="b" id="titanAd" ${ts.ad>=1?'disabled':''}>${ic('tv')}${t('titan_ad')}</button><button class="b b-gem" id="titanGem" ${ts.gem>=1||S.gems<CFG.titan.ticketGems?'disabled':''}>${ic('gem')}${t('titan_gem',{n:CFG.titan.ticketGems})}</button></div><button class="b" data-close>${t('later')}</button></div>`);}
function launchTitan(){if(act('titan_start',{},()=>startTitan())){renderStage();renderActs();banner(R.E.name,t('titan_go',{n:CFG.titan.time}),'gold',2400);Music.target=1;save();}}
/* ----- cadeau publicitaire ----- */
let giftT=0,giftNext=0,gift=null,giftShown=0;
let giftAsk=false;
function giftTick(dt){
  giftT+=dt;
  if(gift){if(giftT-giftShown>CFG.gift.show){gift=null;$('gift').hidden=true;}return;}
  if(!giftNext)giftNext=giftT+rnd(CFG.gift.every[0],CFG.gift.every[1]);
  if(giftT>=giftNext&&!giftAsk&&$('veil').hidden&&tab==='home'){giftAsk=true;giftNext=0;
    const show=gf=>{gift=gf;giftShown=giftT;const g=$('gift');g.innerHTML=ic(gift.k==='sp'?'spark':gift.k==='g'?'gem':'bolt',gift.k==='g'?'ig':'ie');g.hidden=false;g.classList.remove('pop');void g.offsetWidth;g.classList.add('pop');sfx.tick();};
    if(!NET.on){show(giftRoll());giftAsk=false;return;}if(!netReady){giftAsk=false;return;} /* v11.6 : en ligne, seul le serveur crée les cadeaux */
    actAsync('gift_offer').then(d=>{giftAsk=false;if(d&&d.ok&&d.result&&d.result.ok&&d.result.gift)show(d.result.gift);else if(d&&d.result&&d.result.wait)giftNext=giftT+d.result.wait;else giftNext=giftT+60;}).catch(()=>{giftAsk=false;giftNext=giftT+60;});}
}
function giftLabel(gf){return gf.k==='sp'?'+'+fmt(gf.v)+' '+t('sparks'):gf.k==='g'?'+'+gf.v+' '+t('gems'):t('gift_boost',{n:30});}
$('gift').addEventListener('click',()=>{if(!gift)return;audio();const gf=gift;modal(`<div class="mart" style="color:var(--beam)">${ic('box')}</div><h2>${t('gift_title')}</h2><div class="loot" style="color:var(--beam)">${giftLabel(gf)}</div><p>${t('gift_p')}</p><div class="acts"><button class="b b-gold" id="giftGo">${ic('tv')}${t('gift_go')}</button><button class="b" data-close>${t('close')}</button></div>`,()=>{if(gift){gift=null;$('gift').hidden=true;giftNext=0;}});});
/* ----- tutoriel ----- */
let tutoStep=0,hpLagV=1,hintT=null;
function showHint(txt,ms){const h=$('hint');if(!txt){h.hidden=true;return;}h.textContent=txt;h.hidden=false;clearTimeout(hintT);if(ms)hintT=setTimeout(()=>h.hidden=true,ms);}
function tutoNext(){
  if(tutoStep===1){tutoStep=2;S.st.tuto=1;track('tuto',{s:2,sec:Math.round((Date.now()-sessStart)/1000)});showHint(t('hint2'),4500);}
  else if(tutoStep===3){tutoStep=4;S.st.tuto=3;track('tuto',{s:4,sec:Math.round((Date.now()-sessStart)/1000)});$('hint').hidden=true;showHint(t('hint4',{n:CFG.prestige.minStage}),5000);document.querySelectorAll('.tbt.hot').forEach(b=>b.classList.remove('hot'));}
  save();
}
function tutoTick(){if(tutoStep===2&&S.run.sparks>=tbCost('cad')){tutoStep=3;S.st.tuto=2;track('tuto',{s:3,sec:Math.round((Date.now()-sessStart)/1000)});showHint(t('hint3'));renderTB();}}
/* ----- onglets ----- */
let atGroup='start',atPane='res',lastView='',passFrom='shop';
const refrReady=()=>(S.pp||0)>0&&(UPG.some(u=>isPP(u)&&!upLocked(u)&&isFinite(upCost(u))&&upCost(u)<=S.pp)||WEAPONS.some((w,i)=>wpCost(i)<=S.pp));
const canStart=u=>!upLocked(u)&&!inBuild(u.id)&&isFinite(upCost(u))&&upAfford(u)&&(upTime(u)<=0||S.build.length<slotsN());
/* v11.2 : pastille de famille = recherche nouvellement débloquée et pas encore vue (plus « tu peux acheter », qui allumait tout) */
let SEEN=null;
function seenSave(){try{localStorage.setItem('prisme-seen',JSON.stringify(SEEN));}catch(e){}}
function seenGet(){if(SEEN)return SEEN;try{SEEN=JSON.parse(localStorage.getItem('prisme-seen')||'null');}catch(e){}if(!Array.isArray(SEEN)){SEEN=ALLUP.filter(u=>!upLocked(u)).map(u=>u.id).concat(JOKERS.filter(j=>jokerAvail(j)).map(j=>'j:'+j.id));seenSave();}return SEEN;}
const grpNew=g=>{const sn=seenGet();return ALLUP.some(u=>u.g===g&&!upLocked(u)&&!sn.includes(u.id))||(g==='jok'&&JOKERS.some(j=>jokerAvail(j)&&!S.jk[j.id]&&!sn.includes('j:'+j.id)));};
function seenGroup(g){const sn=seenGet();let ch=false;ALLUP.filter(u=>u.g===g&&!upLocked(u)).forEach(u=>{if(!sn.includes(u.id)){sn.push(u.id);ch=true;}});if(g==='jok')JOKERS.filter(j=>jokerAvail(j)).forEach(j=>{if(!sn.includes('j:'+j.id)){sn.push('j:'+j.id);ch=true;}});if(ch)seenSave();}
const grpReady=g=>ALLUP.some(u=>u.g===g&&canStart(u))||(g==='jok'&&JOKERS.some(j=>jokerAvail(j)&&!S.jk[j.id]&&S.run.sparks>=j.sh));
/* bouton d'achat d'une recherche : étincelles + durée, mémoire (instantané, moitié prix) ou points de réfraction */
function buyBtn(u,free,big){const c=upCost(u),pp=isPP(u),mem=inMem(u),off=!upAfford(u)||(!pp&&!mem&&free<1);
  if(pp)return `<button class="b b-gold ${big?'':'sm'}" data-build="${u.id}" ${off?'disabled':''}><span style="display:inline-flex;align-items:center;gap:4px">${ic('prism')}${big?t('at_pp',{c}):c}</span>${big?'':`<small>${t('at_now')}</small>`}</button>`;
  return `<button class="b b-spark ${big?'':'sm'} ${mem?'mem':''}" data-build="${u.id}" ${off?'disabled':''}><span style="display:inline-flex;align-items:center;gap:4px">${ic('spark')}${big?t('at_buy',{c:fmt(c)}):fmt(c)}</span>${big?'':`<small>${mem?ic('bolt')+t('at_mem'):ic('clock')+durS(upTime(u))}</small>`}</button>`;}
const durS=s=>{if(s<86400)return dur(s);const U=(I18N[LANG]._dur||I18N.fr._dur);return dec(s/86400,1)+'\u00a0'+U[3];}; // v12.2 : durée courte dans les boutons (« 1,5 j »)
function buildRow(b){const u=upById(b.id),p=100*Math.min(1,1-(b.until-Date.now())/1000/b.dur);
  return `<div class="slot slab item run"><span class="ring" data-ring="${b.id}" style="--p:${p}%">${ic(upIcon(u),'ie')}</span><div style="min-width:0"><b>${u.t}</b><span class="tm">${ic('clock')}<span data-until="${b.until}">${dur((b.until-Date.now())/1000)}</span></span><div class="note" style="margin:2px 0 0">${t('at_to',{n:lvlOf(u)+1})}</div></div><div class="slot-acts"><button class="b b-gem sm" data-rush="${b.id}" data-rushg="${b.id}" aria-label="${t('at_rush')}">${ic('gem')}<span>${rushGems(b)}</span></button><button class="b sm" data-adb="${b.id}" ${adLeft('build')?'':'disabled'}>${ic('tv')}${t('at_ad')}</button></div></div>`;}
function tileHtml(u,free){
  const k=lvlOf(u),c=upCost(u),max=k>=u.max,lock=upLocked(u),b=inBuild(u.id);
  let foot;
  if(lock)foot=`<div class="tstate">${ic('lock')}${t('at_lock',{n:upReq(u)})}</div>`;
  else if(b)foot=`<div class="tstate run">${ic('clock')}<span data-until="${b.until}">${dur((b.until-Date.now())/1000)}</span></div>`;
  else if(max)foot=`<div class="tstate">${ic('check')}${t('at_maxed')}</div>`;
  else foot=buyBtn(u,free);
  const ml=memLvl(u.id);
  const cy=CFG.refr.reset.includes(u.g);
  return `<div class="tile slab ${lock?'locked':''} ${inMem(u)?'inmem':''}" data-g="${u.g}"><span class="ttag ${cy?'cyc':'keep'}" role="img" aria-label="${t(cy?'at_tag_cycle':'at_tag_keep')}" title="${t(cy?'at_tag_cycle':'at_tag_keep')}">${ic(cy?'prism':'shield')}</span><button class="tile-top" data-updetail="${u.id}" aria-label="${t('at_detail',{t:u.t})}"><span class="tico">${ic(upIcon(u))}</span><span class="tname">${u.t}</span><span class="tlvl">${isFinite(u.max)?t('at_k',{k,m:u.max}):t('lvl',{n:k})}${ml>k?` <em class="tmem">${ic('bolt')}${ml}</em>`:''}</span></button>${isFinite(u.max)?`<div class="pips"><i style="width:${100*k/u.max}%"></i></div>`:'<div class="pips inf"></div>'}${foot}</div>`;
}
function upDetail(id){
  const u=upById(id),k=lvlOf(u),c=upCost(u),max=k>=u.max,lock=upLocked(u),b=inBuild(u.id),free=slotsN()-S.build.length;
  let act='';
  if(lock)act=`<p>${t('at_locked',{n:upReq(u)})}</p>`;
  else if(b)act=`<p>${t('at_inprog',{t:`<b data-until="${b.until}">${dur((b.until-Date.now())/1000)}</b>`})}</p>`;
  else if(max)act=`<p>${t('at_ismax')}</p>`;
  else if(isPP(u))act=`<p>${t('at_pp_p')}</p><div class="acts">${buyBtn(u,free,true)}</div>`;
  else if(inMem(u))act=`<p>${ic('bolt')} ${t('at_mem_p',{n:memLvl(u.id)})}</p><div class="acts">${buyBtn(u,free,true)}</div>`;
  else act=`<p>${ic('clock')} ${t('at_dur',{t:dur(upTime(u))})}</p>${CFG.refr.reset.includes(u.g)?`<p class="note cycn">${ic('prism')} ${t('at_reset_p')}</p>`:`<p class="note keepn">${ic('shield')} ${t('at_tag_keep')}</p>`}<div class="acts">${buyBtn(u,free,true)}${free<1?'<p>'+t('at_full')+'</p>':''}</div>`;
  modal(`<div class="mart" style="color:var(--beam)">${ic(upIcon(u))}</div><h2>${u.t}</h2><p>${isFinite(u.max)?t('at_lvl',{k,m:u.max}):t('lvl',{n:k})}</p><p style="color:var(--light)">${max?'':t('at_next',{d:u.d(k)})}</p>${act}<div class="acts"><button class="b" data-close>${t('close')}</button></div>`);
}
/* ----- volet Guilde : jauge hebdomadaire, paliers, quêtes du jour, membres ----- */
function guildHtml(){
  if(!netReady)return `<p class="note">${t('gd_offline')}</p>`;
  const g=guildCache;
  if(!g){if(Date.now()-guildTry<8000)return `<p class="note">${t('gd_offline')}</p>`;netGuild().then(r=>{if(r){if(tab==='clan'&&clanPane==='guild')renderTab();}else guildTry=Date.now();});return `<p class="note">${t('loading')}</p>`;} /* v11.6 : plus de requêtes en boucle si la guilde ne répond pas */
  const C=CFG.guild;let h='';
  if(!g.guild){
    h+=`<p class="note">${t('gd_none_p',{n:C.size})}</p>`;
    h+=`<h2 class="sec">${t('gd_create')}</h2><div class="gform"><input id="gdName" class="xin" maxlength="20" placeholder="${t('gd_name_ph')}" autocomplete="off"><button class="b b-gem" id="gdCreate" ${S.gems<C.create||guildBusy?'disabled':''}>${ic('gem')}${C.create}</button></div><p id="gdErr" class="note" style="color:var(--danger);min-height:1.2em">${esc(gdErrMsg)}</p>`;
    h+=`<h2 class="sec">${t('gd_join')}</h2><div class="gform"><input id="gdCode" class="xin" maxlength="8" placeholder="${t('gd_code_ph')}" autocapitalize="characters" autocomplete="off"><button class="b b-gold" id="gdJoin" ${guildBusy?'disabled':''}>${t('gd_join_btn')}</button></div>`;
    h+=`<h2 class="sec">${t('gd_open_list')}</h2>`;
    if(!guildList){netGuildList().then(r=>{guildList=r.ok?r.data.rows:[];if(tab==='clan'&&clanPane==='guild')renderTab();});h+=`<p class="note">${t('loading')}</p>`;}
    else if(!guildList.length)h+=`<p class="note">${t('gd_empty_list')}</p>`;
    else h+=`<div class="list" style="gap:4px">${guildList.map(r=>`<div class="lg lgg"><span class="nm">${esc(r.name)}</span><span class="sc">${r.n}/${C.size}</span><span class="sc">${fmt(r.pts)} ${t('gd_pts_short')}</span><button class="b b-gold sm" data-gjoin="${esc(r.code)}" ${guildBusy?'disabled':''}>${t('gd_join_btn')}</button><button class="rep" data-greport="${esc(r.id)}" aria-label="${t('gd_report',{n:esc(r.name)})}">${ic('flag')}</button></div>`).join('')}</div>`;
    return h;
  }
  const G=g.guild,total=g.total|0,tiers=g.tiers||C.tiers,maxT=tiers[tiers.length-1],me=g.members.find(m=>m.me)||{},isLeader=G.leader===(DEV&&DEV.id),recent=(g.now-g.since)<86400e3;
  const mon=new Date();mon.setHours(0,0,0,0);mon.setDate(mon.getDate()+((8-mon.getDay())%7||7));
  h+=`<div class="gcard slab"><div><b class="gname">${esc(G.name)}</b><p class="note">${t('gd_members',{n:G.n,m:C.size})} · ${G.open?t('gd_open'):t('gd_closed')}</p></div><button class="b sm" id="gdCode" data-code="${esc(G.code)}" aria-label="${t('gd_code')}">${ic('link')}${esc(G.code)}</button></div>`;
  h+=`<h2 class="sec">${t('gd_gauge')}<small>${t('gd_week_reset',{t:dur((mon-Date.now())/1000)})}</small></h2>`;
  h+=`<div class="gauge"><i style="width:${Math.min(100,100*total/maxT)}%"></i>${tiers.map((v,i)=>`<em style="left:${100*v/maxT}%" class="${total>=v?'on':''}"></em>`).join('')}<span>${fmt(total)} / ${fmt(maxT)} ${t('gd_pts_short')}</span></div>`;
  h+=`<p class="note">${t('gd_per_member')}</p><div class="list" style="gap:4px">`;
  tiers.forEach((v,i)=>{const n=i+1,r=guildReward(n),got=(g.claims||[]).includes(n),reached=total>=v;let btn;
    if(got)btn=`<span class="note">${t('quests_got')}</span>`;else if(!reached)btn=`<span class="note">${fmt(v-total)} ${t('gd_pts_short')}</span>`;else if(recent)btn=`<span class="note">${ic('clock')}24 h</span>`;else btn=`<button class="b b-gold sm" data-gclaim="${n}" ${guildBusy?'disabled':''}>${t('claim')}</button>`;
    h+=`<div class="lg lgt ${reached&&!got&&!recent?'me':''}"><span class="rk">${fmt(v)}</span><span class="sc">${ic('gem','ig')}${r.g}</span><span class="sc">${ic('spark','ie')}${dur(r.min*60)}${r.b?` + ${ic('bolt','ie')}${r.b} h`:''}</span>${btn}</div>`;});
  h+='</div>';
  if(recent)h+=`<p class="note">${t('gd_locked_recent')}</p>`;
  const qs=guildQuests();
  h+=`<h2 class="sec">${t('gd_quests')}<small>${t('gd_quests_sub')}</small></h2><div class="list">${qs.map(q=>{const ready=q.p>=q.n&&!q.done;return `<div class="quest slab item ${ready?'hl':''} ${q.done?'done':''}" ${ready?`data-gquest="${q.i}" role="button" tabindex="0"`:''}><span class="qic">${ic(q.done?'check':ready?'star':'target')}</span><div class="qbody" style="min-width:0"><b>${q.t}</b><div class="qbar"><i style="width:${100*q.p/q.n}%"></i><span>${fmt(q.p)} / ${fmt(q.n)}</span></div><span class="rew"><span>${ic('shield','ie')}+${q.pts} ${t('gd_pts_short')}</span></span></div>${ready?`<span class="b b-gold sm">${t('gd_validate')}</span>`:q.done?`<span class="note">${t('quests_got')}</span>`:'<span></span>'}</div>`;}).join('')}</div>`;
  h+=`<h2 class="sec">${t('gd_members_t')}<small>${t('gd_members',{n:G.n,m:C.size})}</small></h2><div class="list" style="gap:4px">${g.members.map((m,i)=>`<div class="lg lgm ${m.me?'me':''}"><span class="rk">${i+1}</span><canvas width="52" height="52" data-mini="${tierOf(m.best||1).sides}" data-hue="${m.me?'me':idHue(m.id)}"></canvas><span class="nm">${m.leader?ic('crown','ig'):''}${esc(m.name)}</span><span class="sc">${fmt(m.pts)} ${t('gd_pts_short')}</span>${isLeader&&!m.me?`<button class="rep" data-gkick="${m.id}" data-name="${esc(m.name)}" aria-label="${t('gd_kick',{n:esc(m.name)})}">${ic('close')}</button>`:'<span></span>'}</div>`).join('')}</div>`;
  h+=`<div class="acts" style="margin-top:14px">${isLeader?`<button class="b sm" id="gdToggle" data-open="${G.open?0:1}">${G.open?t('gd_set_closed'):t('gd_set_open')}</button>`:''}<button class="b b-red sm" id="gdLeave">${t('gd_leave')}</button></div>`;
  return h;
}
/* ----- compte (Google / Apple) : lier la partie, la retrouver ailleurs ----- */
let acct=null,acctBusy=false,acctErr='';
const acctMsg=c=>{const k='pr_acct_err_'+String(c||'server');return I18N.fr[k]?t(k):t('pr_acct_err_server');};
function accountHtml(){
  let h=`<h2 class="sec">${t('pr_acct')}</h2>`;
  if(!AUTH){
    const pv=authProviders();
    h+=`<p class="sub" style="margin:-4px 0 8px">${t('pr_acct_p')}</p>`;
    if(!pv.length){h+=`<p class="note">${t('pr_acct_soon')}</p>`;return h;}
    h+=`<div class="list" style="gap:8px">${pv.map(p=>`<button class="b ${p==='google'?'b-gold':''}" data-oauth="${p}" ${acctBusy?'disabled':''}>${t('pr_with_'+p)}</button>`).join('')}</div><p class="err" id="acErr" style="min-height:1.2em">${esc(acctErr)}</p>`;
    return h;
  }
  if(!acct){if(netReady)netAccount().then(a=>{acct=a;if(tab==='profile')renderTab();}).catch(e=>{if(e.code==='login'){authLogout();if(tab==='profile')renderTab();}});h+=`<p class="note">${t('loading')}</p>`;return h;}
  if(acct.mine)h+=`<div class="slab" style="padding:12px 14px"><b>${ic('check','ig')} ${t('pr_linked')}</b><p class="note" style="margin:4px 0 0">${esc(authEmail())}</p></div>`;
  else if(acct.linked)h+=`<div class="slab" style="padding:12px 14px"><b>${esc(authEmail())}</b><p class="note" style="margin:4px 0 0">${t('pr_acct_other',{n:esc(acct.other.name),s:acct.other.best})}</p><div class="acts" style="margin-top:8px"><button class="b b-gold" id="acRecover">${t('pr_recover')}</button></div></div>`;
  else h+=`<div class="slab" style="padding:12px 14px"><b>${esc(authEmail())}</b><p class="note" style="margin:4px 0 0">${t('pr_acct_unlinked')}</p><div class="acts" style="margin-top:8px"><button class="b b-gold" id="acLink">${t('pr_link')}</button></div></div>`;
  h+=`<p class="err" id="acErr" style="min-height:1.2em">${esc(acctErr)}</p><div class="row"><button class="b" style="flex:1" id="acLogout">${t('pr_logout')}</button></div>`;
  return h;
}
/* après connexion ou création : lier la partie, ou proposer de récupérer celle du compte */
async function afterLogin(){
  acctErr='';acct=null;
  try{const a=await netAccount();acct=a;
    if(!a.linked){const r=await netLink();if(r.ok){acct=Object.assign(a,{linked:true,mine:true});toast(t('pr_acct_done'));track('account_link',{});}else if(r.err==='linked_other'){acct=Object.assign(a,{linked:true,mine:false,other:r.other});}}
  }catch(e){acctErr=acctMsg(e.code);}
  acctBusy=false;renderTab();
}
function recoverModal(){modal(`<h2>${t('pr_recover')}</h2><p>${t('pr_acct_other',{n:esc(acct.other.name),s:acct.other.best})}</p><p>${t('pr_recover_p')}</p><div class="acts"><button class="b b-gold" id="acRecoverOk">${t('pr_recover')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
/* v11.3 : identité visuelle des onglets. Le prisme décompose la lumière : chaque onglet est une bande du spectre
   (Atelier or, Quêtes vert, Clan cyan, Boutique et pass violet). Un seul élément mis en avant par écran, taillé comme une facette. */
const HERO={atelier:['.slot:not(.empty)','hero_run'],quests:['.quest.hl','hero_claim'],shop:['.offer.feat','hero_welcome'],pass:['.pr:not(:disabled):not(.lock)','hero_claim'],clan:['.lg.me','hero_you']};
function markHero(){const pn=$('panel');pn.dataset.acc=tab;const hdef=HERO[tab];if(!hdef)return;let e=pn.querySelector(hdef[0]);if(tab==='pass'&&e)e=e.closest('.pt');if(!e)return;e.classList.add('hero');
  if(tab!=='pass'&&tab!=='clan'){const l=document.createElement('span');l.className='herol';l.textContent=t(hdef[1]);const host=e.querySelector('b,.qbody b')||e;if(host.parentNode)host.parentNode.insertBefore(l,host);}}
/* v11.9 : effet du niveau suivant montré dans la phrase (« 3 → 4 niveaux ») au lieu de répéter toute la description */
function jDiff(a,b,n){const A=a.split(' '),B=b.split(' ');if(A.length!==B.length)return esc(a)+` <span class="jnext">${esc(t('jk_next',{n,d:b}))}</span>`;let o=[],i=0;while(i<A.length){if(A[i]===B[i]){o.push(esc(A[i]));i++;continue;}let k=i;while(k<A.length&&A[k]!==B[k])k++;o.push(`<span class="jnext" title="${esc(t('j_lvlbtn',{n}))}">${esc(A.slice(i,k).join(' '))} → ${esc(B.slice(i,k).join(' '))}</span>`);i=k;}return o.join(' ');}
function renderTab(){
  const home=tab==='home';$('panel').hidden=home;
  document.querySelectorAll('.nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===(tab==='pass'?passFrom:tab==='boost'?'home':tab)));
  if(home){lastView='';requestAnimationFrame(resize);return;}
  const p=$('tabPanel');let h='';
  const head=(ttl,sub,help)=>`<header class="phead"><div><h1 class="ttl">${ttl}${help?` <button class="qhelp hh" id="${help}" aria-label="?">?</button>`:''}</h1></div><button class="quit" data-tab="home" aria-label="${t('nav_home')}">${ic('close')}</button></header>`;
  if(tab==='atelier'){ /* v12.2 : deux vues, une monnaie chacune : Recherches (étincelles + minuteurs, définitives) et Réfraction (points) */
    const free=slotsN()-S.build.length,nextSlot=CFG.build.slotGems[S.slots-1];
    if(!['start','jok','arm'].includes(atGroup))atGroup='start';const refrOpen=S.prestiges>0||(S.pp|0)>0;if(!refrOpen)atPane='res'; /* v12.6 : vue Réfraction verrouillée tant qu'aucune Réfraction n'a été faite */
    h+=head(t('at_title'),'',atPane==='refr'?'wpHelp':'atHelp');
    h+=`<div class="grp seg atseg" role="tablist"><button data-atpane="res" aria-pressed="${atPane!=='refr'}">${ic('anvil')}${t('at_res')}</button><button data-atpane="refr" aria-pressed="${atPane==='refr'}" ${refrOpen?'':'class="lockd" aria-disabled="true"'}>${refrOpen?ic('prism'):ic('lock')}${t('at_refr')}${refrOpen?'':` <small>${CFG.prestige.minStage}</small>`}${refrReady()?'<span class="badge soft"></span>':''}</button></div>`;
    if(atPane==='refr'){
      const spent=Object.keys(S.wp||{}).length;
      h+=`<div class="slotbuy ppbal"><span class="ppn">${ic('prism')}<b>${S.pp||0}</b></span></div>`;
      h+=`<h2 class="sec subsec">${t('at_auto_h')}</h2><div class="tiles">${UPG.filter(u=>u.g==='auto'||u.g==='refr').map(u=>tileHtml(u,free)).join('')}</div>`;
      h+=`<h2 class="sec subsec">${t('at_forms')}</h2>`;
      h+=`<div class="list" style="gap:6px;margin-bottom:8px">${WEAPONS.map((w,i)=>{const k=wpLvl(i),c=wpCost(i);return `<div class="wpn"><canvas width="88" height="88" data-wpn="${i+1}"></canvas><div><b>${w.t} <span>· ${w.fx}</span></b>${k?`<p class="wlv on">${t('lvl',{n:k})} · ${t('bn_dmg',{n:8*k})}</p>`:''}</div><button class="b ${S.pp>=c?'b-gold':''} sm wbtn" data-wp="${i}" ${S.pp>=c?'':'disabled'} aria-label="${t('pp_up',{t:w.t,n:c})}">${ic('prism')}<span>${c}</span></button></div>`;}).join('')}</div>`;
      if(spent)h+=`<div class="wreset"><button class="b sm" id="wpReset" ${S.gems<CFG.wpReset?'disabled':''}>${t('pp_reset')} ${ic('gem')}${CFG.wpReset}</button></div>`;
      if(spent)h+=`<div class="wreset"><button class="b sm" id="wpReset" ${S.gems<CFG.wpReset?'disabled':''}>${t('pp_reset')} ${ic('gem')}${CFG.wpReset}</button></div>`;
    }else{
      seenGroup(atGroup);h+=`<div class="bal">${ic('spark','ie')}<b id="balSp">${fmt(S.run.sparks)}</b></div><div class="list">${S.build.map(buildRow).join('')}${Array.from({length:free},()=>`<div class="slot empty">${ic('plus')}${t('at_free')}</div>`).join('')}</div>`;
      h+=`<div class="slotbuy"><span class="ppn">${ic('clock')}<b>${S.slots} / ${CFG.build.slotGems.length+1}</b>${premOn()?` <small class="pslot">${ic('crown','ig')}${t('at_slots_pass')}</small>`:''}</span>${nextSlot!=null?`<button class="b b-gem sm" id="buySlot" ${S.gems<nextSlot?'disabled':''}>${ic('plus')}${t('at_slot')} ${ic('gem')}${nextSlot}</button>`:''}</div>`;
      h+=`<div class="grp atgrp" role="group" aria-label="${t('at_res')}">${['start','jok','arm'].map(id=>GROUPS.find(g=>g.id===id)).map(g=>`<button data-grp="${g.id}" aria-pressed="${atGroup===g.id}">${ic(GICON[g.id])}${g.t}${grpNew(g.id)?'<span class="badge soft"></span>':''}</button>`).join('')}</div>`;
    if(atGroup==='jok'){ /* v11.9 : mode d'emploi, statut de chaque joker, prix étiquetés, niveau suivant visible */
      const nj=CFG.build.jslotGems[S.jslots-1];
      h+=`<div class="slotbuy"><span class="ppn">${ic('star')}<b>${S.equip.length} / ${S.jslots}</b></span>${nj!=null?`<button class="b b-gem sm" id="buyJSlot" ${S.gems<nj?'disabled':''}>${ic('plus')}${t('at_slot')} ${ic('gem')}${nj}</button>`:''}</div><div class="list" style="margin-top:10px">`;
      JOKERS.forEach(j=>{const l=S.jk[j.id]||0,on=S.equip.includes(j.id),av=jokerAvail(j);let btns='',st;
        if(on)st=`<span class="jst eq">${t('jk_st_eq')}</span>`;else if(l)st=`<span class="jst own">${t('jk_st_own')}</span>`;else if(av)st=`<span class="jst new">${t('jk_st_new')}</span>`;else st=`<span class="jst lock">${ic('lock')}${t('jk_st_lock',{n:j.lvl})}</span>`;
        if(!l&&av)btns=`<button class="b b-spark sm" data-unlock="${j.id}:s" ${S.run.sparks<j.sh?'disabled':''}>${ic('spark')}${fmt(j.sh)}</button><button class="b b-gem sm" data-unlock="${j.id}:g" ${S.gems<j.gm?'disabled':''}>${ic('gem')}${j.gm}</button>`;
        else if(l){const u=upById('j_'+j.id),b=inBuild(u.id),c=upCost(u);btns=`<button class="b sm ${on?'':'b-gold'}" data-equip="${j.id}" ${!on&&S.equip.length>=S.jslots?'disabled':''}>${on?t('j_unequip'):t('j_equip')}</button>`+(l<5?(b?`<span class="d">${ic('clock')}<span data-until="${b.until}">${dur((b.until-Date.now())/1000)}</span></span>`:`<button class="b b-spark sm" data-build="${u.id}" ${free<1||S.run.sparks<c?'disabled':''}>${t('j_lvlbtn',{n:l+1})} ${ic('spark')}${fmt(c)}</button>`):'<span class="d">'+t('j_max')+'</span>');}
        const meta=l?`<p class="jmeta">${ic('bolt')}${jokerNeed(j.id)}</p>`:`<p class="jmeta">${ic('bolt')}${jokerNeed(j.id)}</p>`;
        h+=`<div class="jcard slab ${on?'on':''} ${!av&&!l?'locked':''}"><span class="jart">${ic(JICON[j.id])}</span><div style="min-width:0"><div class="jhead"><b>${j.t}</b>${l?`<span class="jl">${t('j_lvl',{n:l})}</span>`:''}${st}</div><p>${l&&l<5?jDiff(j.d(l),j.d(l+1),l+1):j.d(Math.max(1,l))}</p>${meta}${btns?`<div class="jbtns">${btns}</div>`:''}</div></div>`;});
      h+=`</div><h2 class="sec subsec">${t('jk_research')}</h2>`;
    }
      h+=`<div class="tiles">${UPG.filter(u=>u.g===atGroup).map(u=>tileHtml(u,free)).join('')}</div>`;
    }
  }else if(tab==='boost'){h+=boostView();
  }else if(tab==='quests'){
    const v=questView();
    const qrow=q=>{const ready=q.p>=q.n&&!q.done;return `<div class="quest slab item ${ready?'hl':''} ${q.done?'done':''}" ${ready?`data-claim="${q.kind}:${q.i}" role="button" tabindex="0"`:''}><span class="qic">${ic(q.done?'check':ready?'star':'target')}</span><div class="qbody" style="min-width:0"><b>${q.t}</b><div class="qbar"><i style="width:${100*q.p/q.n}%"></i><span>${fmt(q.p)} / ${fmt(q.n)}</span></div>${rewardHtml(q.r)}</div>${ready?`<span class="b b-gold sm">${t('quests_claim')}</span>`:q.done?`<span class="note">${t('quests_got')}</span>`:'<span></span>'}</div>`;};
    h+=head(t('quests_title'))+evCard()+passCard(); // v11 : les quêtes font avancer le pass
    const done=ONB.length-v.onbLeft;
    if(v.onb.length)h+=`<h2 class="sec">${t('quests_onb')}${v.onb.some(q=>!q.done&&q.p>=q.n)?RD:''}<small>${done} / ${ONB.length}</small></h2><div class="chap"><i style="width:${100*done/ONB.length}%"></i></div><div class="list">${v.onb.map(qrow).join('')}</div>`;
    const mid=new Date();mid.setHours(24,0,0,0);
    h+=`<h2 class="sec">${t('quests_today')}${v.d.some(q=>!q.done&&q.p>=q.n)?RD:''}<small>${ic('clock')} ${dur((mid-Date.now())/1000)}</small></h2><div class="list">${v.d.map(qrow).join('')}</div>`;
    h+=`<h2 class="sec">${t('quests_week')}${v.w.some(q=>!q.done&&q.p>=q.n)?RD:''}</h2><div class="list">${v.w.map(qrow).join('')}</div>`;
    h+=`<h2 class="sec">${t('quests_cal')}${loginState().claimedToday?'':RD}</h2>`+loginHtml();
  }else if(tab==='clan'){
    h+=head(t('cl_title'))+`<div class="grp seg" role="tablist"><button data-pane="league" aria-pressed="${clanPane==='league'}">${ic('trophy')}${t('cl_league')}</button><button data-pane="guild" aria-pressed="${clanPane==='guild'}">${ic('shield')}${t('cl_guild')}${guildClaimable()&&guildCache&&guildCache.guild?'<span class="badge"></span>':''}</button></div>`;
    if(clanPane==='guild')h+=guildHtml();
    else{
    const live=netReady&&boardCache&&boardCache.joined&&boardCache.rows.length>0;
    const rows=live?boardCache.rows.map(r=>r.bot?{bot:true,name:t('lg_bot',{n:r.k}),score:+r.score,sides:tierOf(r.best||1).sides,hue:idHue('bot-'+r.k)}:{id:r.id,name:r.name,score:+r.score,sides:tierOf(r.best||1).sides,hue:idHue(r.id),me:r.me}):standings().map(r=>r.me?r:Object.assign({},r,{bot:true}));
    const DIVS=['div_bronze','div_silver','div_gold','div_plat','div_diam'];
    if(netReady&&!boardCache)netBoard().then(b=>{if(b&&tab==='clan')renderTab();});
    h+=`<h2 class="sec">${t('lg_title',{d:t(DIVS[live&&boardCache.tier?Math.min(4,boardCache.tier|0):0])})}<small>${t('lg_range_'+(live&&boardCache.tier?Math.min(4,boardCache.tier|0):0))}</small></h2><div class="lgsub"><p class="lgday">${ic('flame')}${isTitanDay()?t('lg_today'):t('lg_next',{d:nextTitanDay()})}</p><button class="qhelp" id="lgHelp" aria-label="${t('lg_help_t')}">?</button></div>`; /* v11.2 : une phrase, le détail derrière « ? » */
    const pod=rows.slice(0,3);while(pod.length<3)pod.push({name:'—',score:0,sides:3,hue:200});
    h+=`<div class="podium">${[1,0,2].map(i=>{const r=pod[i];return `<div class="pod p${i+1}"><canvas width="80" height="80" data-mini="${r.sides}" data-hue="${r.me?'me':r.hue}"></canvas><span class="nm">${esc(r.name)}</span><div class="blk">${i+1}</div></div>`;}).join('')}</div><div class="list" style="gap:4px">`;
    const allSim=!live&&rows.every(r=>r.me||r.bot); /* tout est simulé (avant le premier Titan) : une seule mention au lieu d'une étiquette par ligne */
    if(allSim)h=h.replace(/(<div class="list" style="gap:4px">)$/,`<p class="simall">${t('lg_allsim')}</p>$1`);
    rows.forEach((r,i)=>{ /* v11.2 : plus de zones de montée/descente (la division dépend de l'étape) */
      const cls=(r.me?' me':'')+(r.bot?' bot':'')+(i<3?' up':'');h+=`<div class="lg${cls}"><span class="rk">${i+1}</span><canvas width="52" height="52" data-mini="${r.sides}" data-hue="${r.me?'me':r.hue}"></canvas><span class="nm">${r.bot&&!allSim?`<span class="simtag">${t('lg_sim')}</span>`:''}${esc(r.name)}</span><span class="sc">${fmt(r.score*DX)}</span>${r.me||r.bot?'<span></span>':`<button class="rep" data-report="${r.id||i}" aria-label="${t('lg_report',{n:esc(r.name)})}">${ic('flag')}</button>`}</div>`;});
    h+='</div>';
    h+=`<h2 class="sec">${t('lg_rewards')}</h2><div class="list" style="gap:4px">${CFG.league.tiers.map(([a,b])=>`<div class="lg lgr"><span class="rk">${a===b?a:a+'–'+b}</span><span class="sc">${ic('gem','ig')}${CFG.league.gems(a)}</span><span class="sc">${ic('spark','ie')}${dur(CFG.league.minutes(a)*60)}</span></div>`).join('')}</div>`;
    }
  }else if(tab==='pass'){h+=passView();
  }else if(tab==='shop'){
    h+=head(t('sh_title'))+`<p class="demo">${ic('tv')}${t('sh_demo_s')}</p>`;
    const OART={starter:['box','ie'],loot:['shard','is'],chest:['box','ig'],noads:['tv','ie']};const PKART={g100:['gem'],g600:['gem','gem'],g1300:['gem','gem','gem'],g2800:['box'],g7500:['box','gem'],g16000:['crown']};
    const best=OFFERS.filter(o=>/^g\d/.test(o.id)).reduce((m,o)=>packBonus(o)>packBonus(m)?o:m);
    const art=o=>PKART[o.id]?`<span class="oart pk pk${PKART[o.id].length}">${PKART[o.id].map(n=>ic(n,'ig')).join('')}</span>`:`<span class="oart">${ic(OART[o.id][0],OART[o.id][1])}</span>`;
    const offerRow=o=>{const own=o.once&&o.once(),pk=/^g\d/.test(o.id),bn=pk?packBonus(o):0,pop=o.id==='g600',ch=o.id==='chest',chOk=ch&&o.avail();return `<div class="offer slab${o.id==='starter'&&!own?' feat':''}${pk&&o===best?' best':''}${pop?' pop':''}${chOk?' feat chok':''}">${pk&&o===best?`<span class="ribbon">${t('sh_best')}</span>`:''}${pop?`<span class="ribbon rpop">${t('sh_pop')}</span>`:''}${chOk?`<span class="ribbon rpop">${t('ch_ready')}</span>`:''}${art(o)}<div style="min-width:0"><b>${o.t}${bn>0?` <span class="bon">+${bn} %</span>`:''}</b>${pk?'':ch?`<div class="chbar"><i style="width:${Math.min(100,100*chestG()/CFG.chest.cap)}%"></i><b style="left:${100*CFG.chest.open/CFG.chest.cap}%"></b></div><p class="chn">${ic('gem','ig')}${grp(chestG())} / ${grp(CFG.chest.cap)}${chOk?'':' · '+ic('lock')+grp(CFG.chest.open)}</p>`:o.id==='starter'?`<p class="pnow">${ic('gem','ig')}300 + ${ic('bolt','ie')}×2 6 h</p>`:''}</div><button class="b b-gold sm" data-offer="${o.id}" ${own||(o.avail&&!o.avail())?'disabled':''}>${own?t('sh_own'):ch&&!chOk?ic('lock')+priceOf(o):priceOf(o)}</button></div>`;}; /* v12.3 : tirelire avec jauge, « Prête ! » dès qu'elle s'ouvre */
    const st=OFFERS.find(o=>o.id==='starter'),stTop=!(st.once&&st.once());
    h+=evCard()+shopGiftHtml()+weekOfferHtml()+(stTop?`<div class="list">${offerRow(st)}</div>`:'')+passCard(); /* v11.2 : le pack de départ remonte tant qu'il n'est pas pris */
    h+=`<h2 class="sec">${t('sh_gems')}</h2>${!S.firstX2?`<div class="x2bar">${ic('star','ig')}${t('sh_x2_p')}</div>`:''}<div class="list">${OFFERS.filter(o=>/^g\d/.test(o.id)).map(offerRow).join('')}</div>`;
    h+=`<h2 class="sec">${t('sh_offers')}</h2><div class="list">${OFFERS.filter(o=>!/^g\d/.test(o.id)&&o.id!=='pass'&&!(o.id==='starter'&&stTop)).map(offerRow).join('')}</div>`;
    const bl=S.boostUntil-Date.now();
    h+=`<h2 class="sec">${t('sh_boost')}<small>${bl>0?t('sh_active',{t:dur(bl/1000)}):t('sh_inactive')}</small></h2><div class="gitems"><div class="gitem slab"><span class="oart">${ic('tv','ie')}</span><b>${t('sh_adboost',{n:CFG.boost.adH})}</b><button class="b b-gold sm stk" id="adBoost" ${adLeft('boost')?'':'disabled'}>${ic('tv')}${t('sh_watch')}<small class="eur">${t('ad_left',{n:adLeft('boost')})}</small></button></div>`;
    h+=`<div class="gitem slab"><span class="oart">${ic('bolt','ie')}</span><b>${t('sh_gemboost',{n:CFG.boost.gemsH})}</b><button class="b b-gem sm" data-gem="boost" ${S.gems<CFG.boost.gemsPrice?'disabled':''}>${ic('gem')}${CFG.boost.gemsPrice}</button></div></div>`;
    const capLeft=CFG.sparkShop.capMin-(S.day.spMin||0);
    h+=`<h2 class="sec">${t('sh_sparks')}<small>${t('rate_min',{n:fmt(Math.round(rateMin()))})}</small></h2><div class="gitems"><div class="gitem slab"><span class="oart">${ic('tv','ie')}</span><b>${t('sh_adsparks',{t:dur(CFG.ads.shopMin*60)})}</b><p class="pnow">≈ ${ic('spark','ie')}${fmt(adSparks('shop'))}</p><button class="b b-gold sm stk" id="adSparks" ${adLeft('shop')?'':'disabled'}>${ic('tv')}${t('sh_watch')}<small class="eur">${t('ad_left',{n:adLeft('shop')})}</small></button></div>`;
    h+=CFG.sparkShop.packs.map((p,i)=>`<div class="gitem slab"><span class="oart">${ic('spark','ie')}</span><b>${t('sh_pack',{t:dur(p.min*60)})}</b><p class="pnow">≈ ${ic('spark','ie')}${fmt(packSparks(p))}</p><button class="b b-gem sm" data-pack="${i}" ${S.gems<p.g||capLeft<p.min?'disabled':''}>${ic('gem')}${p.g}</button></div>`).join('')+`</div>`;
    if(capLeft<CFG.sparkShop.packs[0].min)h+=`<p class="sub">${t('sh_cap',{h:CFG.sparkShop.capMin/60})}</p>`;
    h+=`<h2 class="sec">${t('sh_skin')}<small>${ic('spark','ie')}+${Math.max(0,S.skins.length-1)} %</small></h2><div class="skins">`;
    SKINS.filter(k=>!k.pass||S.skins.includes(k.id)).forEach(k=>{const has=S.skins.includes(k.id),i=skinInfo(k.id);h+=`<button class="skin" data-skin="${k.id}" aria-pressed="${S.skin===k.id}"><canvas width="80" height="80" data-mini="6" data-hue="${hueAttr(i)}"></canvas>${k.label}<em class="skbn">${bnText(i.bn)}</em><span>${has?(S.skin===k.id?t('sh_worn'):t('sh_wear')):k.pass?t('ps_title'):ic('gem','ig')+k.price}</span></button>`;});
    h+='</div>';
    /* v12 : couleurs de saison : celles de la saison en cours (à gagner dans le pass) + celles déjà collectionnées */
    {const k=seasonKey(),cur=['s'+k,'s'+k+'x'],ids=[...cur,...S.skins.filter(id=>isSeasonSkin(id)&&!cur.includes(id)).sort((a,b)=>parseInt(b.slice(1))-parseInt(a.slice(1)))];
     h+=`<h2 class="sec">${t('sh_coll')}<small>${t('ps_season',{n:seasonName(k)})}</small></h2><div class="skins">`+ids.map(id=>{const i=skinInfo(id),has=S.skins.includes(id);return `<button class="skin${has?'':' slock'}${i.x?' sx':''}" data-skin="${id}" aria-pressed="${S.skin===id}"><canvas width="80" height="80" data-mini="6" data-hue="${i.hue}"></canvas>${esc(i.label)}<em class="skbn">${bnText(i.bn)}</em><span>${has?(S.skin===id?t('sh_worn'):t('sh_wear')):ic('lock')+ic('crown','ig')+(i.x?100:50)}</span></button>`;}).join('')+'</div>';}
  }else if(tab==='profile'){
    const tr=tierOf(S.bestStage),L=layers();
    h+=head(t('pr_title'))+`<div class="stage"><canvas id="me" width="380" height="380" aria-hidden="true"></canvas><div class="ptier">${t('pr_tier',{t:tr.name,n:S.bestStage})}${L?t('pr_worlds',{n:L}):''}</div></div>`;
    h+=`<h2 class="sec">${t('pr_name')}</h2><div class="field"><input id="nameIn" maxlength="16" value="${esc(S.name)}" aria-label="${t('pr_newname')}"><button class="b b-gold sm" id="nameBtn">${S.nameChanges===0?t('pr_change'):t('pr_change')+' '+ic('gem')+RENAME}</button></div><p class="err" id="nameErr"></p>`;
    h+=medalsHtml();
    h+=`<h2 class="sec">${t('pr_settings')}</h2><div class="list">`;
    h+=`<button class="switch slab langbtn" id="langBtn">${t('pr_lang')}<span class="lv2">${I18N[LANG]._name} ›</span></button>`;
    h+=`<label class="switch slab">${t('pr_music')}<input type="checkbox" id="setMusic" ${S.settings.music?'checked':''}></label>`;
    h+=`<label class="switch slab">${t('pr_sound')}<input type="checkbox" id="setSound" ${S.settings.sound?'checked':''}></label>`;
    h+=`<label class="switch slab">${t('pr_fx')}<input type="checkbox" id="setFx" ${S.settings.fx?'checked':''}></label><label class="switch slab">${t('pr_stats')}<input type="checkbox" id="setStats" ${S.settings.stats!==false?'checked':''}></label>${LN()?`<label class="switch slab">${t('pr_notif')}<input type="checkbox" id="setNotif" ${S.settings.notif?'checked':''}></label><button class="b sm ntest" id="notifTest">${ic('clock')}${t('nt_test')}</button>`:''}</div>`;
    h+=`<button class="b" style="width:100%;margin-bottom:8px" id="privBtn">${ic('shield')}${t('pv_title')}</button>`;
    h+=`<h2 class="sec">${t('pr_stats')}</h2><div class="stats st2">${[['flag',S.bestStage],['prism',S.prestiges],['link',fmt(S.st.merges)],['swords',fmt(S.st.kills)],['crown',fmt(S.st.bosses)],['flame',fmt(S.st.titanBest*DX)],['anvil',S.st.bought]].map(([i,v])=>`<div class="stat slab">${ic(i)}<b>${v}</b></div>`).join('')}</div>`; // v12.4 : icône + nombre
    const bk=Object.keys(S.bestiary).map(Number).sort((a,b)=>a-b);
    h+=`<h2 class="sec">${t('pr_bestiary')}<small>${t('pr_beaten',{n:bk.length})}</small></h2><div class="list" style="gap:4px">${bk.length?bk.map(n=>{const e=enemyFor(n);return `<div class="best"><canvas width="88" height="88" style="width:44px;height:44px" data-foe="${n}"></canvas><span>${t('pr_stage',{n:e.name,s:n})}</span><span>${e.type==='boss'?t('pr_in',{n:S.bestiary[n]}):t('pr_guard')}</span></div>`;}).join(''):'<p class="note">'+ic('lock')+' 5</p>'}</div>`;
    h+=accountHtml();
    h+=`<h2 class="sec">${t('pr_xfer')}</h2><div class="row"><button class="b" style="flex:1" id="xferShow">${t('pr_xfer_show')}</button><button class="b" style="flex:1" id="xferEnter">${t('pr_xfer_enter')}</button></div>`;
    h+=`<h2 class="sec">${t('pr_demo')}<small>${t('pr_version',{v:VERSION})}</small></h2><button class="b b-red" style="width:100%" id="resetBtn">${t('pr_reset')}</button>`;
  }
  /* v12.5 : même écran redessiné (quête validée, achat, médaille…) → on garde la position ; nouvel écran ou sous-onglet → retour en haut */
  const vkey=tab+'|'+atPane+'|'+atGroup+'|'+clanPane+'|'+passPage,same=vkey===lastView,sy=$('panel').scrollTop,gx=(p.querySelector('.grp')||{}).scrollLeft|0;lastView=vkey;
  p.innerHTML=h;markHero();
  if(same){$('panel').scrollTop=sy;const g2=p.querySelector('.grp');if(g2)g2.scrollLeft=gx;}
  else{window.scrollTo(0,0);$('panel').scrollTop=0;const gsel=p.querySelector('.grp [aria-pressed="true"]');if(gsel&&gsel.scrollIntoView)gsel.scrollIntoView({inline:'center',block:'nearest'});}
  p.querySelectorAll('canvas[data-wpn]').forEach(m=>{const c=m.getContext('2d');c.clearRect(0,0,88,88);drawGem(c,44,44,30,+m.dataset.wpn,1,1,false,0);});
  p.querySelectorAll('canvas[data-foe]').forEach(m=>{drawFoeAt(m.getContext('2d'),88,0,enemyFor(+m.dataset.foe));});
  p.querySelectorAll('canvas[data-mini]').forEach(m=>{const hv=m.dataset.hue;drawMini(m,+m.dataset.mini,hv==='me'?skinHue(0):hv==='prism'?300:+hv);});
}
function loginHtml(){
  const st=loginState();
  return `<div class="login">${LOGIN.map((r,i)=>{const d=i+1,cls=d<st.day?'past':d===st.day?'today':'';return `<div class="ltile ${cls}"><small>${d}</small>${r.joker?`<span>${ic('eye','ig')}${t('login_joker')}</span>`:rewardHtml(r).replace('class="rew"','class="rew" style="justify-content:center"')}</div>`;}).join('')}</div>${st.claimedToday?`<p class="note">${t('login_done',{n:st.day%7+1})}</p>`:`<button class="b b-gold" style="width:100%;margin-top:10px" id="loginGo">${t('login_go',{n:st.day})}</button>`}`;
}
function loginModal(){
  const st=loginState();if(st.claimedToday)return;
  modal(`<h2>${t('login_title',{n:st.day})}</h2><p>${t('login_sub')}</p>${loginHtml()}`);
}
function goTab(t){audio();Music.start();if(t==='pass'&&tab!=='pass')passFrom=tab==='quests'?'quests':'shop';tab=t;if(t!=='home')track('tab',{t});renderTab();if(t==='clan')homeMoments();}
document.querySelector('.nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;if(b.classList.contains('lockd')){const k=b.dataset.tab;toast(t('nav_lock',{t:t('nav_'+k),n:NAV_AT[k]}));b.classList.remove('nope');void b.offsetWidth;b.classList.add('nope');sfx.low&&kick('small');return;}goTab(b.dataset.tab);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('veil').hidden&&$('modal').querySelector('[data-close]'))closeModal();}); // v11.1 : Échap ferme la fenêtre (clavier, web)
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&!b.closest('#board')){audio();sfx.click();}},true);
$('meBtn').addEventListener('click',()=>goTab('profile'));
$('pillG').addEventListener('click',()=>goTab('shop'));
function doBuild(id){const inst=upTime(upById(id))<=0;const r=act('build',{id},()=>startBuild(id));if(r==='ok'){if(RUNG.includes(upById(id).g)){sfx.buy();if(R)renderTB();}else if(inst){sfx.chord();toast(t('at_done',{t:upById(id).t}));if(R)renderTB();}else{sfx.buy();toast(t('at_started',{t:upById(id).t}));if(LN()&&S.settings.notif==null)setTimeout(notifPrompt,900);}}else if(r==='slots'){if(S.slots-1<CFG.build.slotGems.length&&ctxOnce('slots'))ctxSlots();else toast(t('at_busy'));}save();refresh();renderTab();return r;}
$('panel').addEventListener('click',e=>{
  const el=e.target.closest('button,[data-claim],[data-gquest]');if(!el)return;audio();Music.start();
  if(el.dataset.tab)goTab(el.dataset.tab);
  else if(el.dataset.wp){const i=+el.dataset.wp;if(act('wp',{i},()=>buyWP(i))){sfx.buy();save();renderTab();}}
  else if(el.id==='wpReset'){if(act('wpreset',{},()=>resetWP())){sfx.chord();toast(t('pp_back'));save();refresh();renderTab();}}
  else if(el.dataset.build)doBuild(el.dataset.build);
  else if(el.dataset.updetail)upDetail(el.dataset.updetail);
  else if(el.dataset.rush){const id=el.dataset.rush;if(act('rush',{id},()=>rushBuild(id))){sfx.chord();}else toast(t('no_gems'));save();refresh();renderTab();}
  else if(el.dataset.adb){const id=el.dataset.adb;if(adGate('build'))rewarded(()=>{act('adbuild',{id},()=>{adUse('build');return adBuild(id);});toast(t('at_rushed'));renderTab();});}
  else if(el.id==='restoreAll'){const n=act('restore',{},()=>restoreAll()||false);if(n){sfx.chord();toast(t('at_restored',{n}));if(R)renderTB();}save();refresh();renderTab();}
  else if(el.id==='buySlot'){if(act('slot',{},()=>buySlot())){sfx.chord();toast(t('at_newslot'));}save();refresh();renderTab();}
  else if(el.id==='buyJSlot'){if(act('jslot',{},()=>buyJSlot())){sfx.chord();toast(t('at_newjslot'));}save();refresh();renderTab();}
  else if(el.dataset.grp){atGroup=el.dataset.grp;renderTab();}
  else if(el.dataset.atpane){if(el.getAttribute('aria-disabled')==='true'){toast(t('nav_lock',{t:t('at_refr'),n:CFG.prestige.minStage}));return;}atPane=el.dataset.atpane;renderTab();}
  else if(el.dataset.bptb){if(buyTB(el.dataset.bptb)){sfx.buy();renderTB();save();renderTab();}else toast(t('bp_poor'));}
  else if(el.dataset.unlock){const [id,c]=el.dataset.unlock.split(':');if(act('joker',{id,cur:c},()=>unlockJoker(id,c))){sfx.win();toast(t('j_unlocked',{n:jokerById(id).t}));renderJok();}save();refresh();renderTab();}
  else if(el.dataset.equip){const id=el.dataset.equip;if(!act('equip',{id},()=>toggleEquip(id)))toast(t('j_full'));else renderJok();save();renderTab();}
  else if(el.dataset.claim){const [k,i]=el.dataset.claim.split(':');track('quest',{k,i:+i});if(gainFx(el,()=>act('claim',{kind:k,i:+i},()=>claim(k,+i)))){sfx.chord();toast(t('quests_reward'));save();refresh();renderTab();}}
  else if(el.id==='loginGo'){const r=act('login',{},()=>claimLogin());if(r){toast(t('login_got'));sfx.win();}save();refresh();renderTab();}
  else if(el.dataset.pane){clanPane=el.dataset.pane;gdErrMsg='';renderTab();}
  else if(el.id==='gdCreate'){const nm=$('gdName').value.trim();guildBusy=true;renderTab();gdErrMsg='';actAsync('guild_create',{name:nm}).then(d=>{guildBusy=false;if(d&&d.ok){guildCache=null;guildList=null;sfx.win();toast(t('gd_created'));track('guild_create',{});}else gdErrMsg=gdErr(d&&d.err);renderTab();refresh();});}
  else if(el.id==='gdJoin'||el.dataset.gjoin){const code=el.dataset.gjoin||$('gdCode').value;guildBusy=true;renderTab();netGuildJoin(code).then(r=>{guildBusy=false;guildList=null;if(r.ok){sfx.chord();toast(t('gd_joined',{n:r.data.name}));track('guild_join',{});}else toast(gdErr(r.err));renderTab();});}
  else if(el.dataset.gclaim){const tier=+el.dataset.gclaim;guildBusy=true;renderTab();actAsync('guild_claim',{tier}).then(d=>{guildBusy=false;guildCache=null;if(d&&d.ok&&d.result&&d.result.reward){const r=d.result.reward;sfx.win();toast(t('gd_reward_got',{g:r.g,s:fmt(r.sparks)}));}else toast(gdErr(d&&d.err));save();refresh();if(R)renderTB();renderTab();});}
  else if(el.dataset.gquest){const i=+el.dataset.gquest;guildBusy=true;renderTab();actAsync('gquest',{i}).then(d=>{guildBusy=false;guildCache=null;if(d&&d.ok&&d.result&&d.result.ok!==false){sfx.chord();toast(t('gd_pts_added',{n:d.result.pts}));}else toast(gdErr(d&&(d.err||(d.result&&d.result.err))));renderTab();});}
  else if(el.id==='gdCode'){const c=el.dataset.code;if(navigator.clipboard)navigator.clipboard.writeText(c).then(()=>toast(t('copied')),()=>toast(c));else toast(c);}
  else if(el.id==='gdToggle'){netGuildOpen(el.dataset.open==='1').then(()=>renderTab());}
  else if(el.dataset.gkick){const id=el.dataset.gkick,nm=el.dataset.name;modal(`<h2>${t('gd_kick_q',{n:esc(nm)})}</h2><div class="acts"><button class="b b-red" data-gkickok="${id}">${t('gd_kick_ok')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
  else if(el.id==='gdLeave'){modal(`<h2>${t('gd_leave_q')}</h2><p>${t('gd_leave_p')}</p><div class="acts"><button class="b b-red" id="gdLeaveOk">${t('gd_leave')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
  else if(el.dataset.ppage!=null){passPage=+el.dataset.ppage;renderTab();}
  else if(el.dataset.passtier){const k=+el.dataset.passtier;if(act('pass_buy',{k},()=>passBuy(k))){sfx.buy();toast(t('ps_bought',{n:k}));passPage=-1;}else toast(t('no_gems'));save();refresh();renderTab();}
  else if(el.id==='passAll'){const c=gainFx(el,()=>act('pass_all',{},()=>passClaimAll()||false));if(c){sfx.chord();toast(t('ps_got_n',{n:c}));}save();refresh();renderTab();}
  else if(el.dataset.medal){const id=el.dataset.medal,m=MEDALS.find(x=>x.id===id),l=medalLvl(id);if(gainFx(el,()=>act('medal',{id},()=>claimMedal(id)))){sfx.win();toast(t('md_got',{t:m.t,r:t('md_r'+(l+1))}));}save();refresh();renderTab();}
  else if(el.id==='weekOffer'){if(gainFx(el,()=>act('week_offer',{},()=>buyWeekOffer()))){sfx.buy();}else toast(t('no_gems'));save();refresh();renderTab();}
  else if(el.id==='shopGift'){if(gainFx(el,()=>act('shop_gift',{},()=>shopGift()))){sfx.chord();}save();refresh();renderTab();}
  else if(el.dataset.pass){const n=+el.dataset.pass,tr=el.dataset.track;if(tr==='p'&&!passState().prem){el.blur();const o=OFFERS.find(x=>x.id==='pass');track('offer_view',{id:'pass',ctx:'track'});modal(`<div class="mart">${ic('crown','ig')}</div><h2>${o.t}</h2><p>${o.d}</p><div class="big" style="color:var(--beam)">${priceOf(o)}</div><div class="acts"><button class="b b-gold" data-confirm="pass">${t('sh_confirm')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}else if(gainFx(el,()=>act('pass_claim',{n,track:tr},()=>passClaim(n,tr)))){sfx.chord();save();refresh();renderTab();}}
  else if(el.dataset.passbuy){const o=OFFERS.find(x=>x.id==='pass');track('offer_view',{id:'pass'});modal(`<div class="mart">${ic('crown','ig')}</div><h2>${o.t}</h2><p>${o.d}</p><div class="big" style="color:var(--beam)">${priceOf(o)}</div><div class="acts"><button class="b b-gold" data-confirm="pass">${t('sh_confirm')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
  else if(el.id==='privBtn')privacyModal();
  else if(el.id==='notifTest'){el.disabled=true;notifTest().then(o=>{el.disabled=false;const msg=o.ok?t('nt_test_ok'):o.perm==='denied'?t('nt_test_denied'):t('nt_test_err',{e:o.err||o.perm});modal(`<div class="mart">${ic('clock','ie')}</div><h2>${t('nt_test')}</h2><p>${msg}</p><p class="sub">${t('nt_test_diag',{p:o.perm,x:o.exact})}${notifErr?' · '+esc(notifErr):''}</p><div class="acts"><button class="b" data-close>${t('close')}</button></div>`);});}
  else if(el.id==='langBtn')modal(`<h2>${t('pr_lang')}</h2><div class="langs">${LANG_LIST().map(l=>`<button class="b${l===LANG?' b-gold':''}" data-setlang="${l}">${I18N[l]._name}</button>`).join('')}</div><div class="acts"><button class="b" data-close>${t('close')}</button></div>`);
  else if(el.id==='wpHelp')helpModal('prism',t('at_refr'),[['prism','hp_pp1'],['link','hp_pp2'],['target','hp_pp3']]);
  else if(el.id==='atHelp')helpModal('anvil',t('at_res'),[['clock','hp_at1'],['plus','hp_at2'],['star','hp_at3']]);
  else if(el.id==='passHelp')helpModal('crown',t('ps_title'),[['star','hp_ps1'],['crown','hp_ps2'],['gem','hp_ps3'],['clock','hp_ps4']]);
  else if(el.id==='lgHelp')helpModal('trophy',t('lg_help_t'),[['flame','hp_lg1'],['trophy','hp_lg2'],['gem','hp_lg3'],['eye','hp_lg4']]);
  else if(el.dataset.greport){const id=el.dataset.greport;el.disabled=true;netGuildReport(id).then(r=>toast(r.ok?t('lg_reported'):gdErr(r.err)));}
  else if(el.dataset.report){toast(t('lg_reported'));el.disabled=true;if(/-/.test(el.dataset.report))act('report',{target:el.dataset.report});}
  else if(el.dataset.offer){const o=OFFERS.find(x=>x.id===el.dataset.offer);track('offer_view',{id:o.id});modal(`<div class="mart">${ic('bag','ie')}</div><h2>${o.t}</h2><p>${o.d}</p><div class="big" style="color:var(--beam)">${priceOf(o)}</div><p>${t('sh_sim')}</p><div class="acts"><button class="b b-gold" data-confirm="${o.id}">${t('sh_confirm')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
  else if(el.dataset.gem){const id=el.dataset.gem;if(act('gemitem',{id},()=>buyGemItem(id))){sfx.buy();save();refresh();renderTab();}}
  else if(el.id==='adSparks'){if(adGate('shop'))rewarded(()=>{const v=adSparks('shop');act('ad',{kind:'shop'},()=>{adUse('shop');S.run.sparks+=v;return true;});toast('+'+fmt(v)+' '+t('sparks'));sfx.win();if(R)renderTB();renderTab();});}
  else if(el.dataset.pack){const i=+el.dataset.pack;const r=act('pack',{i},()=>buyPack(i));if(r===true){sfx.buy();save();refresh();if(R)renderTB();renderTab();}else if(r==='cap')toast(t('sh_cap',{h:CFG.sparkShop.capMin/60}));}
  else if(el.id==='adBoost'){if(adGate('boost'))rewarded(()=>{act('ad',{kind:'boost'},()=>{adUse('boost');give({b:CFG.boost.adH});return true;});toast(t('sh_boosted',{n:CFG.boost.adH}));renderTab();});}
  else if(el.dataset.skin){const id=el.dataset.skin;const sk=skinInfo(id);if(sk&&(sk.pass||isSeasonSkin(id))&&!S.skins.includes(id)){toast(t('ps_skin'));return;}if(!act('skin',{id},()=>buySkin(id)))toast(t('no_gems'));else sfx.buy();save();refresh();renderTab();}
  else if(el.id==='nameBtn'){const nm=$('nameIn').value;let x=null;const r=act('rename',{name:nm},()=>{x=rename(nm);return x.ok?x:false;});if(r&&r.ok){toast(t('name_updated'));save();refresh();renderTab();}else $('nameErr').textContent=(x&&x.msg)||t('srv_refused');}
  else if(el.dataset.oauth){acctBusy=true;acctErr='';renderTab();authWith(el.dataset.oauth).then(afterLogin).catch(e=>{acctBusy=false;acctErr=e.code==='cancel'?'':acctMsg(e.code);renderTab();});}
  else if(el.id==='acLink'){acctBusy=true;renderTab();afterLogin();}
  else if(el.id==='acRecover')recoverModal();
  else if(el.id==='acLogout'){authLogout();acct=null;acctErr='';renderTab();}
  else if(el.id==='xferShow'){const code=xferCode();modal(`<h2>${t('pr_xfer_show')}</h2><p>${t('pr_xfer_show_p')}</p><div class="code" id="xferCode">${code}</div><div class="acts"><button class="b b-gold" id="xferCopy">${t('copy')}</button><button class="b" data-close>${t('close')}</button></div>`);}
  else if(el.id==='xferEnter'){modal(`<h2>${t('pr_xfer_enter')}</h2><p>${t('pr_xfer_enter_p')}</p><input id="xferIn" class="xin" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="PF1-…"><p id="xferErr" style="color:var(--danger);min-height:1.2em"></p><div class="acts"><button class="b b-gold" id="xferGo">${t('pr_xfer_go')}</button><button class="b" data-close>${t('cancel')}</button></div>`);setTimeout(()=>$('xferIn').focus(),50);}
  else if(el.id==='resetBtn'){modal(`<h2>${t('pr_reset_q')}</h2><p>${t('pr_reset_p')}</p><div class="acts"><button class="b b-red" data-doreset>${t('pr_reset_ok')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
});
$('panel').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&(e.target.dataset.claim||e.target.dataset.gquest))e.target.click();});
$('panel').addEventListener('change',e=>{
  if(e.target.id==='setMusic'){S.settings.music=e.target.checked;if(S.settings.music)Music.start();else Music.stop();}
  if(e.target.id==='setSound')S.settings.sound=e.target.checked;
  if(e.target.id==='setFx')S.settings.fx=e.target.checked;
  if(e.target.id==='setStats'){S.settings.stats=e.target.checked;if(!S.settings.stats)EVQ.length=0;}
  if(e.target.id==='setNotif'){if(e.target.checked)notifAsk(true);else{S.settings.notif=false;notifCancel();}}
  if(e.target.id==='setLang'){setLang(e.target.value);applyStatic();renderTab();if(R){renderStage();renderTB();renderActs();}}save();
});
$('modal').addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;audio();
  if(el.hasAttribute('data-close'))closeModal();
  else if(el.dataset.buytb){if(buyTB(el.dataset.buytb)){renderTB();save();closeModal();}}
  else if(el.dataset.build){doBuild(el.dataset.build);closeModal();}
  else if(el.dataset.confirm&&!payGate(el.dataset.confirm,!!el.dataset.over)){}
  else if(el.dataset.confirm){const id=el.dataset.confirm;track('purchase',{id,demo:true});act('purchase',{id},()=>purchase(id));closeModal();sfx.chord();toast(t('sh_bought'));save();refresh();renderTab();}
  else if(el.dataset.setlang){closeModal();setLang(el.dataset.setlang);applyStatic();renderTab();if(R){renderStage();renderTB();renderActs();}save();}
  else if(el.id==='notifYes'){closeModal();notifAsk(true);}
  else if(el.id==='notifNo'){S.settings.notif=false;save();closeModal();}
  else if(el.id==='ctxSlot'){closeModal();if(act('slot',{},()=>buySlot())){sfx.chord();toast(t('at_newslot'));}save();refresh();renderTab();}
  else if(el.dataset.go){closeModal();goTab(el.dataset.go);}
  else if(el.id==='xferCopy'){const c=$('xferCode').textContent;if(navigator.clipboard)navigator.clipboard.writeText(c).then(()=>toast(t('copied')),()=>{});else toast(c);}
  else if(el.id==='acRecoverOk'){closeModal();netRecover().then(d=>{toast(t('pr_recovered'));setTimeout(()=>adoptIdentity(d),300);}).catch(e=>{acctErr=acctMsg(e.code);renderTab();});}
  else if(el.id==='xferGo'){const d=xferParse($('xferIn').value);if(!d){$('xferErr').textContent=t('pr_xfer_bad');return;}if(d.id===DEV.id){closeModal();toast(t('pr_xfer_same'));return;}try{localStorage.setItem('prisme-dev',JSON.stringify(d));localStorage.removeItem(KEY);}catch(e){}location.reload();}
  else if(el.dataset.gkickok){const id=el.dataset.gkickok;closeModal();netGuildKick(id).then(r=>{toast(r.ok?t('gd_kicked'):gdErr(r.err));renderTab();});}
  else if(el.id==='gdLeaveOk'){closeModal();netGuildLeave().then(r=>{guildList=null;toast(r.ok?t('gd_left'):gdErr(r.err));renderTab();});}
  else if(el.id==='lgClaim'){closeModal();sfx.win();save();refresh();if(R)renderTB();toast('+'+el.dataset.gems+' '+t('gems'));}
  else if(el.hasAttribute('data-doreset')){const keep={name:S.name,nameChanges:S.nameChanges};act('reset',{},()=>{S=fresh();Object.assign(S,keep);return true;});closeModal();save();tab='home';startRun();renderTab();refresh();}
  else if(el.id==='nameGo'){const v=$('nameIn').value;if(v.trim()===S.name){closeModal();return;}let x=null;const r=act('rename',{name:v},()=>{x=rename(v);return x.ok?x:false;});if(r&&r.ok){closeModal();toast(t('name_saved'));save();refresh();}else $('nameErr').textContent=(x&&x.msg)||t('srv_refused');}
  else if(el.id==='loginGo'){const r=act('login',{},()=>claimLogin());closeModal();if(r){toast(t('login_got'));sfx.win();}save();refresh();renderTab();}
  else if(el.id==='doPrest'){closeModal();lsSet('prisme-adc',String(+(lsGet('prisme-adc')||0)+1));const g=act('prestige',{},()=>doPrestige()||false)||0;renderStage();renderTB();renderActs();save();refresh();toast(t('pre_done',{m:dec(refMult(),1),n:fmt(g)}));maybeInterstitial(()=>{if(!S.starter&&!lsGet('prisme-offer')&&S.prestiges>=1){lsSet('prisme-offer','1');starterModal();} /* v11.5 : une seule fois par appareil (S.offerAt n'était pas gardé par le serveur → proposé à chaque Réfraction) */else if(S.prestiges===1)toast(t('pre_tip'));});}
  else if(el.id==='titanGo'){closeModal();launchTitan();}
  else if(el.id==='giftGo'){const gf=gift;gift=null;$('gift').hidden=true;giftNext=0;closeModal();showAd(()=>{act('ad',{kind:'gift'},()=>{giftTake(gf);return true;});toast(giftLabel(gf));sfx.win();save();refresh();if(R)renderTB();},t('ad_sim'));}
  else if(el.id==='titanAd'){closeModal();rewarded(()=>{act('ad',{kind:'titan'},()=>titanAdTicket());toast(t('titan_got'));titanModal();});}
  else if(el.id==='titanGem'){if(act('titan_gem',{},()=>titanGemTicket())){sfx.buy();save();refresh();titanModal();}}
  else if(el.id==='offOk'){closeModal();}
  else if(el.id==='offAd'){const o=pendingOff;closeModal();showAd(()=>{act('ad',{kind:'offline'},()=>{roll();S.day.ads++;S.run.sparks+=o.sparks;return true;});toast(t('off_more',{n:fmt(o.sparks)}));save();refresh();renderTB();});}
});
let pendingOff=null;
function offlineModal(o){
  pendingOff=o;renderStage();renderTB();
  modal(`<div class="mart" style="color:var(--beam)">${ic('hourglass')}</div><h2>${t('off_title')}</h2><p>${t('off_p',{t:dur(o.elapsed)})}${o.elapsed>o.sec+60?t('off_counted',{t:dur(o.sec)}):''}.</p><div class="loot" style="color:var(--beam)">${ic('spark')}+${fmt(o.sparks)}</div>${o.stages?`<p>${t('off_exped',{n:o.stages})}</p>`:''}<div class="acts">${o.sparks>0?`<button class="b b-gold" id="offAd">${ic('tv')}${t('off_x2')}</button>`:''}<button class="b" id="offOk">${t('ok')}</button></div>`);
}
function countUp(el,from,to,ms=900){const t0=performance.now();const step=now=>{const k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
function flyShards(fromEl,toEl,n,onEach){
  if(!fromEl||!toEl||!motionOK()){if(onEach)for(let i=0;i<n;i++)onEach();return;}
  const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2,bx=b.left+b.width/2,by=b.top+b.height/2;
  for(let i=0;i<n;i++){const el=document.createElement('div');el.className='fly';el.innerHTML=ic('shard','is');document.body.appendChild(el);
    const sx=ax+rnd(-40,40),sy=ay+rnd(-30,30),cx=(sx+bx)/2+rnd(-80,80),cy2=Math.min(sy,by)-rnd(40,120),t0=performance.now()+i*45,D=520;
    const step=now=>{const k=Math.max(0,Math.min(1,(now-t0)/D));if(k<=0){requestAnimationFrame(step);return;}const u=1-k,x=u*u*sx+2*u*k*cx+k*k*bx,y=u*u*sy+2*u*k*cy2+k*k*by;el.style.transform=`translate(${x-12}px,${y-12}px) scale(${1.2-0.5*k})`;el.style.opacity=k>0.9?String((1-k)*10):'1';if(k<1)requestAnimationFrame(step);else{el.remove();if(onEach)onEach();}};
    requestAnimationFrame(step);}
}
function starterModal(){
  track('offer_view',{id:'starter',auto:true});
  const left=0; /* v9.5 : pas d'échéance fictive */
  const so=OFFERS[0];modal(`<div class="mart">${ic('box','ie')}</div><h2>${so.t}</h2><p>${t('starter_p',{p:priceOf(so)})}</p>${left>0?`<p class="tm" style="color:var(--beam);font-weight:800">${t('starter_left',{t:dur(left/1000)})}</p>`:''}<div class="acts"><button class="b b-gold" data-confirm="starter">${t('starter_btn',{p:priceOf(so)})}</button><button class="b" data-close>${t('starter_no')}</button></div>`);
}
function homeMoments(){
  if(tab==='clan'&&S.nameChanges===0&&!S.st.namePrompted&&$('veil').hidden){S.st.namePrompted=true;save(); // v9.9 : proposé à l'ouverture de la ligue, plus en plein combat
    modal(`<div class="mart" style="color:var(--gem)">${ic('gem')}</div><h2>${t('name_league')}</h2><p>${t('name_first_p')}</p><div class="field"><input id="nameIn" maxlength="16" value="${esc(S.name)}" aria-label="${t('name_your')}"></div><p class="err" id="nameErr"></p><div class="acts"><button class="b b-gold" id="nameGo">${t('name_keep')}</button><button class="b" data-close>${t('later')}</button></div>`);
    $('nameIn').select();}
}
/* ================= v10 : boutique (cadeau du jour, pass de saison), achats encadrés, offres contextuelles ================= */
const rwHtml=r=>r.skin?`<span class="sdot" style="--sh:${seasonHue(passState().k)}"></span>${esc(skinInfo(r.skin==='S'?'s'+passState().k:r.skin==='SX'?'s'+passState().k+'x':r.skin).label)}${r.g?` ${ic('gem','ig')}${r.g}`:''}`:r.chest?`${ic('box','ig')}${t('ps_chest')}`:r.g?`${ic('gem','ig')}${r.g}`:r.m?`${ic('spark','ie')}${dur(r.m*60)}`:'';
function passCard(){const p=passState(),n=passTier(),X=CFG.pass.xp,ready=passClaimable();
  return `<button class="pass slab pcard" data-tab="pass"><span class="oart">${ic('crown','ig')}</span><div style="min-width:0;text-align:left"><b>${t('ps_title')}${ready?'<span class="badge"></span>':''}</b><div class="pbar"><i style="width:${Math.min(100,100*p.xp/(CFG.pass.tiers*X))}%"></i></div><p class="sub">${n} / ${CFG.pass.tiers} · ${ic('clock')} ${t('ps_left_s',{d:seasonLeft()})}</p></div><span class="b b-gold sm">›</span></button>`;}
function shopTop(){return shopGiftHtml()+passCard();}
/* v12 : événement du week-end (en cours, ou annoncé à partir du jeudi) */
function evCard(){const now=Date.now(),e=weekendEvent(now),dw=dparts(now)[3];const nextMid=()=>{const [y,m,d]=dparts(now);return Date.UTC(y,m,d+1)-(TZOFF==null?-new Date(now).getTimezoneOffset():TZOFF)*60000;};
  if(e){const end=nextMid()+(dw===6?864e5:0);return `<div class="evcard slab on"><span class="oart">${ic(EVICON[e],'ie')}</span><div style="min-width:0"><b>${t('ev_'+e)}</b></div><span class="evt">${t('ev_ends',{t:dur((end-now)/1000)})}</span></div>`;}
  if(dw===4||dw===5){const n=nextEvent(now),st=nextMid()+(dw===4?864e5:0);return `<div class="evcard slab"><span class="oart">${ic(EVICON[n],'ie')}</span><div style="min-width:0"><b>${t('ev_'+n)}</b></div><span class="evt">${t('ev_soon',{t:dur((st-now)/1000)})}</span></div>`;}
  return '';}
const EVICON={spark:'spark',joker:'star',build:'clock',gift:'box'};
/* v12 : offre de la semaine, renouvelée chaque lundi */
function weekOfferHtml(){const o=weekOffer(),got=!!S.week.wo,now=Date.now();const [y,m,d,dw]=dparts(now);const mon=Date.UTC(y,m,d+((8-dw)%7||7))-(TZOFF==null?-new Date(now).getTimezoneOffset():TZOFF)*60000;
  const parts=[o.m?`${ic('spark','ie')}${t('sh_pack',{t:dur(o.m*60)})}`:'',o.b?`${ic('bolt','ie')}${t('sh_gemboost',{n:o.b})}`:''].filter(Boolean).join(' + ');
  return `<div class="offer slab wo"><span class="oart">${ic('star','ig')}</span><div style="min-width:0"><b>${t('wo_title')}</b><p>${parts}</p><p class="sub">${got?ic('check'):ic('clock')+' '+dur((mon-now)/1000)}</p></div><button class="b b-gem sm stk" id="weekOffer" ${got||S.gems<o.g?'disabled':''}>${got?ic('check'):`${woRef(o)>o.g?`<s class="was">${woRef(o)}</s>`:''}<span>${ic('gem')}${o.g}</span>`}</button></div>`;}
/* prix habituel de l'offre : production au tarif du pack de 4 h, boost au tarif du boost en gemmes */
const woRef=o=>{const pk=CFG.sparkShop.packs.find(p=>p.min===240)||CFG.sparkShop.packs[0];return Math.round((o.m||0)*pk.g/pk.min+(o.b||0)*CFG.boost.gemsPrice/CFG.boost.gemsH);};
function shopGiftHtml(){
  let h=`<div class="offer slab sgift"><span class="oart">${ic('box','ig')}</span><div style="min-width:0"><b>${t('sg_title')}${S.day.sgift?'':RD}</b></div><button class="b b-gem sm" id="shopGift" ${S.day.sgift?'disabled':''}>${S.day.sgift?ic('check'):ic('gem')+shopGiftG()}</button></div>`;
  return h;
}
let passPage=-1;
/* v11 : écran dédié au pass de saison (100 paliers, pages de 10, achat de paliers, tout récupérer) */
function passView(){
  const p=passState(),n=passTier(),X=CFG.pass.xp,T=CFG.pass.tiers,o=OFFERS.find(x=>x.id==='pass'),P=Math.ceil(T/10);
  if(passPage<0||passPage>=P)passPage=Math.min(P-1,Math.floor(Math.min(n,T-1)/10));
  let h=`<header class="phead"><div><h1 class="ttl">${t('ps_title')}</h1><p class="sub"><b class="sname" style="--sh:${seasonHue(p.k)}">${esc(seasonName(p.k))}</b> · ${ic('clock')} ${t('ps_left_s',{d:seasonLeft()})} <button class="qhelp hh" id="passHelp" aria-label="?">?</button></p></div><button class="quit" data-tab="${passFrom}" aria-label="${t('nav_'+passFrom)}">${ic('close')}</button></header>`;
  h+=`<div class="pass slab"><div class="pbar"><i style="width:${Math.min(100,100*p.xp/(T*X))}%"></i></div><p class="sub plvl"><b>${n}</b> / ${T} · ${ic('star','ig')}${n>=T?X:p.xp%X} / ${X}</p>`;
  if(!p.prem)h+=`<button class="b b-gold" style="width:100%" data-passbuy="1">${ic('crown')}${t('ps_buy',{p:priceOf(o)})}</button>`;
  if(n<T){const k10=Math.min(10,T-n);h+=`<div class="row pbuy"><button class="b b-gem sm" data-passtier="1" ${S.gems<passTierCost(1)?'disabled':''}>${t('ps_plus',{n:1})} ${ic('gem')}${passTierCost(1)}</button><button class="b b-gem sm" data-passtier="${k10}" ${S.gems<passTierCost(k10)?'disabled':''}>${t('ps_plus',{n:k10})} ${ic('gem')}${passTierCost(k10)}</button></div>`;}
  {const nb=PASS.findIndex((r,i)=>i>=n&&(r.p.skin||r.p.g>=50||r.p.chest));if(nb>=0){const r=PASS[nb].p;h+=`<p class="pnext">${ic('star','ig')}${nb+1} → <b>${rwHtml(r)}${r.b?` ${ic('bolt','ie')}${r.b} h`:''}</b>${p.prem?'':` <small>${ic('crown','ig')}${t('ps_prem')}</small>`}</p>`;}} /* v12.3 : prochaine grosse récompense */
  if(passClaimable())h+=`<button class="b b-gold" style="width:100%" id="passAll">${ic('check')}${t('ps_all')}</button>`;
  h+=`</div>`;
  /* v12 : avantages du premium, visibles avant l'achat et marqués « Actif » ensuite */
  {const P=CFG.pass.perks,on=premOn();h+=`<div class="perks slab${on?' on':''}"><div class="pchips">${ic('crown','ig')}<span>${ic('star','ig')}×2</span><span>${ic('clock','ie')}+1</span><span>${ic('bolt','ie')}+${P.offH} h</span><span><i class="sdot" style="--sh:${seasonHue(p.k)}"></i>×2</span>${on?ic('check'):''}</div></div>`;}
  h+=`<div class="ppager" role="group" aria-label="${t('ps_title')}"><button class="b sm" data-ppage="${passPage-1}" ${passPage<=0?'disabled':''} aria-label="${t('ps_prev')}">‹${passPageReady(0,passPage*10)?RD:''}</button><span>${t('ps_range',{a:passPage*10+1,b:Math.min(T,passPage*10+10)})}</span><button class="b sm" data-ppage="${passPage+1}" ${passPage>=P-1?'disabled':''} aria-label="${t('ps_next')}">›${passPageReady(passPage*10+10,T)?RD:''}</button></div>`;
  h+=`<div class="ptrack"><div class="pt ph"><span></span><span>${t('ps_free')}</span><span>${ic('crown','ig')}${t('ps_prem')}</span></div>`;
  for(let k=passPage*10+1;k<=Math.min(T,passPage*10+10);k++){const r=PASS[k-1],ok=n>=k,cf=p.cf.includes(k),cp=p.cp.includes(k);
    const btn=(tr,rw,done,lock)=>`<button class="pr${done?' done':''}${lock?' lock':''}${k%10===0?' big':''}" data-pass="${k}" data-track="${tr}" ${!ok||done?'disabled':''} aria-label="${t('ps_tier',{n:k})}">${rwHtml(rw)}${rw.b?` ${ic('bolt','ie')}${rw.b} h`:''}${done?' ✓':lock?' '+ic('lock'):''}</button>`;
    h+=`<div class="pt${ok?' ok':''}"><span class="rk">${k}</span>${btn('f',r.f,cf,false)}${btn('p',r.p,cp,!p.prem)}</div>`;}
  h+=`</div>`;
  return h;
}
function payGate(id,over){const o=OFFERS.find(x=>x.id===id);if(!o)return false;
  return true;}
let bossFails=0;
function ctxOnce(k){const key='prisme-ctx-'+k;try{if(localStorage.getItem(key)===dayKey())return false;localStorage.setItem(key,dayKey());}catch(e){}return true;}
function ctxBoss(){if(!$('veil').hidden)return;track('offer_view',{id:'ctx_boss'});
  modal(`<div class="mart">${ic('bolt','ie')}</div><h2>${t('cx_boss')}</h2><p>${t('cx_boss_p',{g:CFG.boost.gemsPrice,h:CFG.boost.gemsH})}</p><div class="acts"><button class="b b-gold" data-go="atelier">${t('cx_atelier')}</button><button class="b" data-go="shop">${t('cx_shop')}</button><button class="b" data-close>${t('later')}</button></div>`);}
function ctxSlots(){const g=CFG.build.slotGems[S.slots-1];track('offer_view',{id:'ctx_slot'});
  modal(`<div class="mart">${ic('clock','ie')}</div><h2>${t('cx_slots')}</h2><p>${t('cx_slots_p',{g})}</p><div class="acts"><button class="b b-gem" id="ctxSlot" ${S.gems<g?'disabled':''}>${ic('gem')}${g}</button><button class="b" data-close>${t('later')}</button></div>`);}
function privacyModal(){modal(`<h2>${t('pv_title')}</h2><div class="priv">${t('pv_body').split('\n').map(p=>`<p>${p}</p>`).join('')}</div><div class="acts"><button class="b" data-close>${t('close')}</button></div>`);}
/* ================= v10 : notifications locales (au plus 2 par 24 h, annulées au retour dans le jeu) ================= */
const LN=()=>window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications;
const NOTIF={max:2,quiet:[22,9],ids:[101,102],rids:[201,202,203,204,205,206]}; // v10.8 : rappels limités à 2 par 24 h et jamais la nuit ; fins de recherche toujours signalées, à toute heure
function notifLog(){try{return JSON.parse(localStorage.getItem('prisme-nlog')||'[]');}catch(e){return [];}}
function notifLogSet(a){try{localStorage.setItem('prisme-nlog',JSON.stringify(a));}catch(e){}}
function notifShift(at){const d=new Date(at),h=d.getHours();if(h>=NOTIF.quiet[0]){d.setDate(d.getDate()+1);d.setHours(NOTIF.quiet[1],0,0,0);}else if(h<NOTIF.quiet[1])d.setHours(NOTIF.quiet[1],0,0,0);return d.getTime();}
function notifPlan(now=Date.now()){
  const H=3600e3,c=[],out=[];
  /* fins de recherche : une notification par recherche (regroupées si elles tombent à moins de 10 min), sans plafond */
  const rs=S.build.map(b=>({at:Math.max(b.until,now+60e3),t:upById(b.id).t})) /* v10.8 : à toute heure, nuit comprise */.filter(r=>r.at<now+7*24*H).sort((a,b)=>a.at-b.at);
  const grp=[];rs.forEach(r=>{const g=grp[grp.length-1];if(g&&r.at-g.at<10*60e3)g.ts.push(r.t);else grp.push({at:r.at,ts:[r.t]});});
  grp.slice(0,NOTIF.rids.length).forEach(g=>out.push(g.ts.length>1?{k:'n_res2',at:g.at,r:true,v:{n:g.ts.length,t:g.ts.join(', ')}}:{k:'n_res',at:g.at,r:true,v:{t:g.ts[0]}}));
  /* rappels : au plus 2 par 24 h glissantes, 3 h d'écart */
  c.push({k:'n_full',at:now+(2+S.up.off)*H});
  for(let d=0;d<=1;d++){const x=new Date(now);x.setDate(x.getDate()+d);x.setHours(18,0,0,0);const at=x.getTime();if(at<=now+15*60e3)continue;
    if(isTitanDay(at)&&S.bestStage>=10)c.push({k:'n_titan',at});
    if(x.getDay()===0&&S.bestStage>=10)c.push({k:'n_league',at});}
  const sent=notifLog().filter(t=>t>now-24*H&&t<=now).length;
  let left=Math.max(0,NOTIF.max-sent);const rem=[];
  c.map(n=>Object.assign(n,{at:notifShift(n.at)})).filter(n=>n.at>now+15*60e3&&n.at<now+24*H).sort((a,b)=>a.at-b.at).forEach(n=>{if(left>0&&!rem.some(o=>Math.abs(o.at-n.at)<3*H)){rem.push(n);left--;}});
  return out.concat(rem).sort((a,b)=>a.at-b.at);
}
/* v11.4 : CORRECTIF. Sans isExactNotification:false, Android 12+ ouvre l'écran « Alarmes et rappels » au moment de programmer
   (permission d'alarme exacte refusée par défaut) : appelé pendant la mise en arrière-plan, l'appel restait bloqué et rien n'était programmé.
   Les notifications sont donc « inexactes » (quelques minutes de décalage possibles), sans permission spéciale.
   Appels en file (le passage en arrière-plan déclenche plusieurs événements), dernière erreur gardée pour le diagnostic */
let notifQ=Promise.resolve(),notifErr='';
function notifSchedule(){const p=notifQ.then(notifScheduleNow);notifQ=p.catch(()=>{});return p;}
async function notifScheduleNow(){const P=LN();if(!P||!S.settings.notif)return [];
  const plan=notifPlan();try{await P.cancel({notifications:NOTIF.ids.concat(NOTIF.rids).map(id=>({id}))});}catch(e){}
  if(!plan.length)return plan;
  let ri=0,mi=0;
  try{await P.schedule({notifications:plan.map(n=>({id:n.r?NOTIF.rids[ri++]:NOTIF.ids[mi++],title:'Prisme Fusion',body:t(n.k,n.v||{}),schedule:{at:new Date(n.at),allowWhileIdle:true},isExactNotification:false}))});
    notifLogSet(notifLog().filter(t=>t>Date.now()-24*3600e3).concat(plan.filter(n=>!n.r).map(n=>n.at)));notifErr='';}catch(e){notifErr=String(e&&e.message||e).slice(0,120);}
  return plan;}
/* v11.4 : test depuis Profil : une notification dans 10 s, état de la permission et des alarmes exactes */
async function notifTest(){const P=LN();const out={perm:'?',exact:'?',ok:false,err:''};if(!P){out.err='plugin';return out;}
  try{let r=await P.checkPermissions();if(r.display!=='granted')r=await P.requestPermissions();out.perm=r.display;if(r.display==='granted'&&!S.settings.notif){S.settings.notif=true;save();}}catch(e){out.err=String(e&&e.message||e).slice(0,120);}
  try{if(P.checkExactNotificationSetting){const x=await P.checkExactNotificationSetting();out.exact=x.exact_alarm||'?';}}catch(e){}
  if(out.perm==='granted'){try{await P.schedule({notifications:[{id:299,title:'Prisme Fusion',body:t('nt_test_body'),schedule:{at:new Date(Date.now()+10000),allowWhileIdle:true},isExactNotification:false}]});out.ok=true;}catch(e){out.err=String(e&&e.message||e).slice(0,120);}}
  return out;}
async function notifCancel(){const P=LN();if(!P)return;try{await P.cancel({notifications:NOTIF.ids.concat(NOTIF.rids).map(id=>({id}))});}catch(e){}const now=Date.now();notifLogSet(notifLog().filter(t=>t<=now&&t>now-24*3600e3));}
function notifPrompt(){if(!$('veil').hidden||S.settings.notif!=null)return;track('notif_ask',{});
  modal(`<div class="mart">${ic('clock','ie')}</div><h2>${t('nt_title')}</h2><p>${t('nt_p')}</p><div class="acts"><button class="b b-gold" id="notifYes">${t('nt_yes')}</button><button class="b" id="notifNo">${t('nt_no')}</button></div>`);}
async function notifAsk(){const P=LN();if(!P)return false;let ok=false;try{const r=await P.requestPermissions();ok=r&&r.display==='granted';}catch(e){}S.settings.notif=ok;track('notif',{on:ok});save();if(!ok)toast(t('nt_denied'));if(tab==='profile')renderTab();return ok;}
/* ================= v11.1 : gains visibles (game feel) ================= */
/* Toute récompense récupérée dans un menu jaillit du bouton (+10 gemmes, +étincelles), le bouton rebondit, petite vibration.
   Transitoire (900 ms), proportionné, désactivé avec « Effets » ou « réduire les animations ». */
function gainFx(el,fn){const g0=S.gems,s0=S.run.sparks,b0=S.boostUntil;const r=fn();if(r){const dg=S.gems-g0,ds=S.run.sparks-s0,db=S.boostUntil>b0+60e3;rewardFx(el,dg,ds,db);}return r;}
function rewardFx(el,dg,ds,db){const parts=[];if(dg>0)parts.push(`+${grp(dg)}${ic('gem','ig')}`);if(ds>=1)parts.push(`+${fmt(ds)}${ic('spark','ie')}`);if(db)parts.push(ic('bolt','ie')+'×2');if(!parts.length)return;
  const R=el&&el.getBoundingClientRect?el.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  const d=document.createElement('div');d.className='rwpop'+(motionOK()?'':' still');d.innerHTML=parts.join(' ');d.style.left=(R.left+R.width/2)+'px';d.style.top=(R.top+R.height/2)+'px';d.setAttribute('aria-hidden','true');document.body.appendChild(d);setTimeout(()=>d.remove(),1000);
  if(el&&el.classList&&motionOK()){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
  if(S.settings.fx)try{navigator.vibrate&&navigator.vibrate(12);}catch(e){}}
/* compteur de gemmes : il défile vers la nouvelle valeur et la pastille rebondit quand le total monte */
let gemShown=null,gemTw=0;
function gemCounter(){const el=$('cG');if(!el)return;const v=S.gems;if(gemShown==null||!motionOK()||tab!=='home'||Math.abs(v-gemShown)>100000){gemShown=v;el.textContent=grp(v);return;}if(v===gemShown)return;
  const from=gemShown,up=v>from,t0=performance.now(),D=450,id=++gemTw;gemShown=v;if(up){const p=$('pillG');p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump');}
  const step=now=>{if(id!==gemTw)return;const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);el.textContent=grp(Math.round(from+(v-from)*e));if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
/* ----- textes statiques (nav, aria, hors-ligne) ----- */
function applyStatic(){document.querySelectorAll('[data-i18n]').forEach(el=>{el.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=t(el.dataset.i18n);});});document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));document.title='Prisme Fusion';}
/* ----- lancement de la partie continue ----- */
function startRun(){
  newRun();fx.trauma=0;fx.pop={};fx.sq={};bfx.nums=[];bfx.parts=[];hpLagV=1;
  renderStage();renderTB();renderActs();requestAnimationFrame(resize);
  if(!S.st.tuto){tutoStep=1;track('tuto',{s:1});showHint(t('hint1'));}
  else if(S.st.tuto<3)tutoStep=2;else tutoStep=0;
}
/* ================= boucle ================= */
let last=performance.now(),uiT=0,saveT=0,lastStage=0,lastMode='';

function frame(now){
  let dt=Math.min((now-last)/1000,0.1);last=now;const t=now/1000;
  if(now<fx.stopUntil)dt*=0.05;
  if(R){
    runTick(dt);
    if(R.E.stage!==lastStage||R.mode!==lastMode){lastStage=R.E.stage;lastMode=R.mode;renderStage();renderActs();}
    if(tab==='home'){
      drawBoard(dt,t);drawEnemy(dt,t);
      const E=R.E;
      if(E.type==='titan'){$('hpBar').style.width='100%';$('hpLag').style.width='0';}
      else{const v=Math.max(0,E.hp)/E.max;if(v>hpLagV)hpLagV=v;else if(t-lastHitT>0.35)hpLagV+=(v-hpLagV)*Math.min(1,dt*5);$('hpBar').style.width=(100*v)+'%';$('hpLag').style.width=(100*hpLagV)+'%';}
      $('hpWrap').classList.toggle('shield',!!E.shieldL&&R.t>=R.breakUntil);
      const tm=$('tmr');if(R.mode==='boss'){tm.hidden=false;tm.className='tmr'+(R.bossT<10?' late':'');tm.innerHTML=ic('clock')+Math.ceil(R.bossT)+' '+(I18N[LANG]._dur||I18N.fr._dur)[0];}else if(R.mode==='titan'){tm.hidden=false;tm.className='tmr';tm.innerHTML=fmt(R.titanDmg*DX)+' · '+Math.ceil(R.titanT)+' '+(I18N[LANG]._dur||I18N.fr._dur)[0];}else tm.hidden=true;
      $('cSp').textContent=fmt(S.run.sparks);
      updTB();updJok();tutoTick();giftTick(dt);
      const fill=R.cells.filter(Boolean).length/R.cells.length;
      if(R.mode==='farm')Music.target=Math.min(1,Math.max(fill*0.9,R.combo/6,0.25));
    }
  }
  if(tab==='profile'&&$('me'))drawMe($('me').getContext('2d'),380,t,dt); // v12.3 : rattaché par erreur au bloc de jeu en v11.8 (gemme du profil invisible)
  uiT+=dt;if(uiT>0.5){uiT=0;refresh();if(tab==='home')homeMoments();}
  saveT+=dt;if(saveT>5){saveT=0;save();}
  syncT+=dt;if(syncT>180){syncT=0;if(netReady){act('sync');}} // v12.8 : 180 s (avant 90 s) : les actions passent déjà par le serveur, la synchro ne fait qu'enregistrer la partie
  netT+=dt;if(netT>30){netT=0;probeNet();}
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
/* ----- connexion obligatoire ----- */
let netOK=true,netT=0,syncT=0;
function setOnline(v){if(v===netOK)return;netOK=v;$('offline').hidden=v;if(R)R.hold=!v;if(v){last=performance.now();toast(t('net_back'));}else save();}
async function probeNet(){if(!navigator.onLine){setOnline(false);return;}if(!/^https?:/.test(location.protocol)){setOnline(true);return;}if(NET.on){const ok=await netTime();if(!ok){try{const r=await fetch(location.href,{method:'HEAD',cache:'no-store'});if(r.ok)$('netMsg').textContent=t('net_server');}catch(e){$('netMsg').textContent=t('net_p');}}else $('netMsg').textContent=t('net_p');setOnline(ok);if(ok&&!netReady)netBoot();return;}try{const r=await fetch(location.href,{method:'HEAD',cache:'no-store'});setOnline(r.ok||r.status<500);}catch(e){setOnline(false);}}
window.addEventListener('online',probeNet);window.addEventListener('offline',()=>setOnline(false));
$('retryNet').addEventListener('click',probeNet);
probeNet();
if(window.ResizeObserver){let rsz=0;new ResizeObserver(()=>{const bw=$('bw');const h=bw.clientHeight;if(h!==rsz){rsz=h;resize();}}).observe($('bw'));const navH=()=>document.documentElement.style.setProperty('--navh',document.querySelector('.nav').offsetHeight+'px');new ResizeObserver(navH).observe(document.querySelector('.nav'),{box:'border-box'});window.addEventListener('resize',navH);navH();setTimeout(navH,300);setTimeout(navH,1500);}
/* v10.2 : couper tout le son quand le jeu passe en arrière-plan (bouton accueil, autre appli, écran éteint), le reprendre au retour */
function soundBg(hidden){if(hidden){Music.stop();try{if(AC&&AC.state==='running')AC.suspend();}catch(e){}}else if(S.settings.music)Music.start();else if(S.settings.sound)audio();}
document.addEventListener('visibilitychange',()=>soundBg(document.hidden));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&R&&R.mode==='titan'){try{endTitan();}catch(e){}}}); // v11.6 : Titan terminé (et score envoyé) quand on quitte le jeu, sinon le serveur le refusait après la pause
window.addEventListener('pagehide',()=>soundBg(true));
try{const CA=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(CA&&CA.addListener){CA.addListener('pause',()=>soundBg(true));CA.addListener('resume',()=>soundBg(false));CA.addListener('appStateChange',s=>soundBg(!s.isActive));}}catch(e){}
document.addEventListener('visibilitychange',()=>{if(document.hidden)notifSchedule();else notifQ=notifQ.then(notifCancel).catch(()=>{});});
try{const CA=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(CA&&CA.addListener){CA.addListener('pause',()=>notifSchedule());}}catch(e){} // v11.4 : l'événement natif « pause » est plus fiable que la visibilité de la page
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();track('session_end',{sec:Math.round((Date.now()-sessStart)/1000),stage:S.run.stage});if(netReady){act('sync',{bye:true});flushEv(true);}}else{sessStart=Date.now();track('session',{stage:S.run.stage,best:S.bestStage});last=performance.now();if(netReady)wake();}});
document.addEventListener('pointerdown',()=>{audio();Music.start();},{once:true});

/* ================= mesure (v9.6) : étapes atteintes, boss ratés, Titan, emplacement des pubs ================= */
const MILESTONES=[2,3,5,6,10,15,20,25,30,35,40,50,60,75,100];
let sessStart=Date.now(),lastPlace='';
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[id],[data-adb]');if(el)lastPlace=el.dataset.adb?'adbuild':el.id;},true);
{const f=hooks.evolve;hooks.evolve=(...a)=>{f&&f(...a);if(MILESTONES.includes(S.bestStage))track('stage',{n:S.bestStage,min:Math.round((Date.now()-sessStart)/60000)});};}
{const f=hooks.bossFled;hooks.bossFled=v=>{f&&f(v);track('boss_fail',{stage:S.run.stage});if(!v){bossFails++;if(bossFails>=3&&ctxOnce('boss')){bossFails=0;setTimeout(ctxBoss,2800);}}};}
{const f=hooks.titanEnd;hooks.titanEnd=d=>{track('titan',{score:Math.floor(d)});f&&f(d);};}
try{if(!localStorage.getItem('prisme-installed')){localStorage.setItem('prisme-installed','1');track('install',{lang:LANG});}}catch(e){}
track('session',{stage:S.run.stage,best:S.bestStage});
window.__G={MEDALS,claimMedal,medalReady,medalsReady,medalLvl,bonusMul,powerMult,spawnInterval,weekendEvent,nextEvent,premOn,slotsN,seasonName,seasonHue,skinInfo,buyWeekOffer,weekOffer,passTierCost,shopGiftG,evCard,PASS,WFAM,get WEEKLY(){return WEEKLY;},jokerNeed,upTime,sparkMult,offlineGains,seasonKey,adWait,get adLast(){return adLast;},navReset(){NAVS=[];},notifTest,get notifErr(){return notifErr;},seenReset(){SEEN=[];seenSave();},grpNew,seenGroup,get SEEN(){return seenGet();},gainFx,rewardFx,navUnlock,get gemShown(){return gemShown;},get PEND(){return PEND;},passBuy,passClaimAll,passView,get passPage(){return passPage;},sfx,soundBg,get AC(){return AC;},Music,notifPlan,notifSchedule,notifCancel,notifPrompt,notifShift,passState,passClaim,passTier,passXP,PASS,shopGift,spendNow,canPay,payGate,seasonLeft,seasonKey,ctxOnce,privacyModal,SKINS,get bossFails(){return bossFails;},chestG,chestFill,get EVQ(){return EVQ;},flushEv,OFFERS,eurOf,adLeft,adUse,GEM_REF,restoreAll,memTotal,memList,inMem,isPP,memLvl,migrate,isTitanDay,nextTitanDay,titanState,titanTickets,titanAdTicket,titanGemTicket,TITAN_DAYS,WEAPONS,weaponOf,rankOf,effectPow,fireRate,ppGain,wpLvl,wpCost,buyWP,resetWP,LOGIN,loginState,claimLogin,loginModal,homeMoments,countUp,flyShards,ALLUP,UPG,JOKERS,GROUPS,startBuild,tickBuild,rushBuild,rushGems,adBuild,buySlot,unlockJoker,toggleEquip,buyJSlot,useJoker,jokerNeed,upById,lvlOf,upTime,upCost,enemyFor,dmgOf,THEMES,WORLDS,worldOf,worldInfo,weekTheme,get S(){return S;},set S(v){S=v;},get DAILY(){return DAILY;},DPOOL,get R(){return R;},CFG,ONB,WEEKLY,fresh,save,load,newRun,startRun,runTick,runMove,snapTarget,buyTB,tbCost,tbLvl,spawnInterval,autoRate,powerMult,sparkMult,prestigeGain,doPrestige,challengeBoss,retreat,startTitan,endTitan,titanReady,offlineGains,applyOffline,offlineModal,claim,questView,standings,myRank,rename,reportMe,purchase,buyGemItem,buySkin,checkName,tierOf,fmt,refresh,renderTab,renderTB,renderActs,hooks,Music,fx,bfx,
  setTab(t){tab=t;renderTab();},get tab(){return tab;},get tutoStep(){return tutoStep;},set tutoStep(v){tutoStep=v;},tutoNext,get cell(){return cell;},setOnline,get netOK(){return netOK;},get LANG(){return LANG;},setLang,t,I18N,giftRoll,giftTake,giftOK,get gift(){return gift;},forceGift(){giftNext=1;giftT=1e9;giftTick(0);},rateMin,adSparks,packSparks,buyPack,refMult,sparkMult,snapBoard,growBoard,tickBuild,startBuild,NET,DEV,act,actAsync,simSnap,applyServer,wake,netTime,netBoard,track,get netReady(){return netReady;},get boardCache(){return boardCache;},set boardCache(v){boardCache=v;},get clockOff(){return clockOff;},netBoot,idHue,probeNet,leagueModal,xferCode,xferParse,authWith,authProviders,authLogout,authEmail,get OAUTH(){return OAUTH;},netAccount,netLink,netRecover,get AUTH(){return AUTH;},get acct(){return acct;},set acct(v){acct=v;},guildQuests,guildQuestDone,guildReward,netGuild,get guildCache(){return guildCache;},set guildCache(v){guildCache=v;},get clanPane(){return clanPane;},set clanPane(v){clanPane=v;},set guildList(v){guildList=v;}};
setLang(pickLang());load();roll();applyStatic();
{startRun();renderTab();refresh();S.lastSeen=Date.now();}
requestAnimationFrame(frame);
/* réveil (ouverture ou retour au premier plan) : le serveur fait foi, calcule le hors-ligne et les résultats de ligue */
let booted=false;
async function wake(){const d=await actAsync('hello').catch(()=>null);if(!d||!d.ok){if(!booted&&S.st.kills>0)setTimeout(()=>{if($('veil').hidden)loginModal();},400);booted=true;return;}
  renderJok();renderTab();refresh();if(R)renderTB();renderActs();
  const o=d.result&&d.result.offline;if(o&&(o.sparks>0||o.stages>0)){if(R&&o.stages)R.E=enemyFor(S.run.stage);if($('veil').hidden)offlineModal(o);}
  if(d.league&&d.league.rank)leagueModal(d.league);
  netGuild(true).then(()=>{refresh();if(tab==='clan')renderTab();});
  if(!booted){booted=true;track('open',{lang:LANG,stage:S.run.stage,best:S.bestStage});if(S.st.kills>0)setTimeout(()=>{if($('veil').hidden)loginModal();},600);}
}
function netBoot(){wake();}
function leagueModal(r){const show=()=>modal(`<div class="mart" style="color:var(--beam)">${ic('trophy')}</div><h2>${t('lg_res_title')}</h2><p>${t('lg_res_p',{r:r.rank,n:r.size})}</p><div class="loot">${ic('gem','ig')}+${r.gems} · ${ic('spark','ie')}+${fmt(r.sparks||0)}</div><p class="sub">${t('lg_res_sub',{t:dur(CFG.league.minutes(r.rank)*60)})}</p><div class="acts"><button class="b b-gold" id="lgClaim" data-gems="${r.gems}">${t('claim')}</button></div>`);if($('veil').hidden)show();else{const prev=modalOnClose;modalOnClose=()=>{if(prev)prev();setTimeout(show,200);};}}
/* retours du serveur : refus → l'état officiel a déjà remplacé le nôtre, on prévient ; anomalies → rien à dire au joueur honnête */
onServer=({action,d,fail})=>{
  if(fail){if(fail==='auth'){if(AUTH&&!window.__recovering){window.__recovering=true;netRecover().then(d=>adoptIdentity(d)).catch(()=>{toast(t('srv_auth'));});}else toast(t('srv_auth'));}else if(fail==='banned'){$('netMsg').textContent=t('srv_banned');setOnline(false);}return;}
  if(d&&d.result&&d.result.ok===false&&action!=='sync'&&action!=='hello'&&action!=='gift_offer'){toast(t('srv_refused'));}
  if(R&&boardN()!==R.N)growBoard();
  if(R)for(const id of S.equip)if(S.jk[id]&&R.jk[id]==null)R.jk[id]=0;
  refresh();if(R)renderTB();renderActs();if(tab!=='home'&&action!=='sync')renderTab();
};
netBoot();
/* ----- bouton Retour Android (Capacitor) ----- */
try{const CA=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(CA&&CA.addListener)CA.addListener('backButton',()=>{if(!$('veil').hidden){if($('adn'))return;closeModal();return;} /* v11.6 : la pub simulée ne se ferme pas au bouton Retour */if(tab!=='home'){goTab('home');return;}soundBg(true);save();if(netReady)act('sync',{bye:true});if(CA.minimizeApp)CA.minimizeApp();});}catch(e){}
})();
