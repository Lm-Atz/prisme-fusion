const VERSION='8.6 · transfert';
/* ================= icônes et correspondances ================= */
const UPICON={st_cad:'hourglass',st_auto:'link',st_power:'swords',st_birth:'gem',st_spark:'spark',st_bank:'coin',au_merge:'link',au_buy:'bag',au_joker:'eye',au_boss:'crown',au_prestige:'prism',au_exped:'flag',au_titan:'flame',power:'swords',crit:'star',combo:'bolt',bossdmg:'crown',pierce:'breaker',lucky:'spark',chain:'link',gold:'coin',board:'grid',sursis:'clock',spark:'spark',loot:'bag',prod:'forge',cap:'box',off:'hourglass',killspark:'trophy',catal:'spark',cadence:'hourglass',rang:'star',eveil:'prism',brule:'flame',aura:'diamond'};
const JICON={chameleon:'eye',magnet:'magnet',surge:'bolt',frost:'snow',prism:'prism',meteor:'meteor',breaker:'breaker'};
const GICON={start:'flag',auto:'link',atk:'swords',grid:'grid',eco:'shard',jok:'spark',arm:'target'};
const upIcon=u=>u.joker?JICON[u.joker]:UPICON[u.id]||'spark';
const TYPE_LABEL={get mob(){return t('type_mob')},get mini(){return t('type_mini')},get boss(){return t('type_boss')},get titan(){return t('type_titan')}};
const RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const motionOK=()=>S.settings.fx&&!RM.matches;
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
function skinHue(t){const k=SKINS.find(s=>s.id===S.skin)||SKINS[0];return {cyan:192,rose:322,or:44,prisme:(t*50)%360}[k.id];}
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
  if(big||performance.now()-numT>350){numT=performance.now();bfx.nums.push({txt:(s.crit?t('crit'):'')+'−'+(s.d<10?dec(s.d,1):fmt(s.d)),t:0,x:BW/2+rnd(-40,40),y:BH*0.36,col:big?'hsl(44 100% 66%)':'hsl(40 100% 96%)',big});}
  for(let k=0;k<(big?14:4);k++){const a=Math.random()*Math.PI*2,sp=rnd(60,big?260:140);bfx.parts.push({x:BW/2,y:BH*0.52,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.3,.6),t:0,col:SPEC[k%6],sz:rnd(1.5,3.5)});}
  if(s.crit&&s.d>=R.E.max*0.1)kick('medium');
  if(big)tone(110+Math.min(s.d,1e6)**0.1*20,0.12,'square',0.06);
}
hooks.attack=(kind,hit)=>{hit.forEach(i=>fx.beams.push({i,t:0}));kick('medium');sfx.low();bfx.nums.push({txt:t('he',{a:THEMES[R.E.th].atkT}),t:0,x:BW/2,y:BH*0.92,col:'hsl(352 100% 76%)'});};
hooks.windup=()=>{sfx.tick();};
hooks.phase=p=>{bfx.phaseT=1;if(p==='shield'){banner(t('shield'),t('shield_p',{n:R.E.shieldL}),'boss',2600);sfx.chord();kick('large');}};
hooks.kill=(E,sp,sh)=>{if(sh>=1){bfx.nums.push({txt:'+'+fmt(Math.round(sh))+' ◆',t:0,x:BW/2,y:BH*0.78,col:'hsl(196 100% 78%)',big:E.type==='boss'});}enemyBurst(E.type==='mob'?18:40,null,E.type==='mob'?200:320);if(E.type!=='mob'){fx.flash=1;fx.flashCol='255,200,87';kick(E.type==='boss'?'huge':'large');sfx.win();}else{kick('small');sfx.tick();}bfx.popT=0;bfx.nums=[];
  bfx.nums.push({txt:'+'+fmt(sp),t:0,x:BW/2,y:BH*0.5,col:'hsl(44 100% 66%)',big:true});
  if(S.run.stage%10===1&&S.run.stage>1&&!S.run.fled)banner(worldInfo(worldOf(S.run.stage)).name,t('new_world'),'gold',2200);};
hooks.bossStart=E=>{banner(E.name,t('boss_banner',{n:CFG.enemy.bossTime}),'boss',2600);sfx.chord();kick('medium');Music.target=0.9;};
hooks.bossFled=v=>{banner(t(v?'boss_back':'boss_fled'),t('boss_fled_p'),'',2600);sfx.low();Music.target=0.3;renderActs();};
hooks.joker=id=>{const j=jokerById(id);sfx.chord();fx.glow=1;fx.flash=0.6;fx.flashCol='212,140,255';kick('medium');bfx.nums.push({txt:j.t,t:0,x:BW/2,y:BH*0.85,col:'hsl(282 100% 80%)',big:true});};
hooks.harvest=(i,sp)=>{if(Math.random()<0.5)return;const [x,y]=fx.at(i);fx.floats.push({x,y:y-cell*.2,t:0,txt:'+'+(sp<10?dec(sp,1):fmt(sp)),h:150,small:true});};
hooks.tb=k=>{sfx.buy();kick('small');fx.glow=Math.min(1,fx.glow+0.4);if(tutoStep===3)tutoNext();};
hooks.prestige=g=>{track('refraction',{stage:S.run.stage,pts:g});boardCache=null;fx.flash=1;fx.flashCol='127,226,255';kick('huge');sfx.win();for(let i=0;i<R.N*R.N;i++)fx.burst(i,null,4,300);};
hooks.titanEnd=d=>{Music.target=0.3;netTitan(d,S.bestStage).then(r=>{if(r&&r.ok){boardCache=null;netSave(true);}});track('titan',{d:Math.floor(d),best:S.bestStage});modal(`<div class="mart" style="color:var(--s1)">${ic('flame')}</div><h2>${THEMES[weekTheme()].titan}</h2><div class="big">${fmt(d)}</div><p>${d>=S.st.titanBest?t('titan_record'):t('titan_prev',{n:fmt(S.st.titanBest)})}</p><div class="acts"><button class="b b-gold" data-close>${t('continue')}</button></div>`);};
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
let tab='home',toastT=null,bannerT=null;
function toast(m){const t=$('toast');t.hidden=true;void t.offsetWidth;t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2200);}
function banner(t,sub,cls,ms){const b=$('banner');b.hidden=true;void b.offsetWidth;b.className='banner '+(cls||'');b.innerHTML=esc(t)+(sub?`<small>${esc(sub)}</small>`:'');b.hidden=false;clearTimeout(bannerT);bannerT=setTimeout(()=>b.hidden=true,ms||2000);}
let modalOnClose=null;
function modal(html,onClose){$('modal').innerHTML=html;$('veil').hidden=false;modalOnClose=onClose||null;if(R)R.paused=true;const b=$('modal').querySelector('.b');if(b)b.focus({preventScroll:true});}
function closeModal(){$('veil').hidden=true;$('modal').innerHTML='';const f=modalOnClose;modalOnClose=null;if(R)R.paused=false;if(f)f();}
function showAd(done,label){
  let n=3;modal(`<div class="mart">${ic('tv','ie')}</div><p>${label||t('ad_sim')}</p><div class="ad" id="adn">3</div><p>${t('ad_real')}</p>`);
  const it=setInterval(()=>{n--;const el=$('adn');if(el)el.textContent=n;if(n<=0){clearInterval(it);closeModal();done();}},1000);
}
function rewarded(done){showAd(()=>{roll();S.day.ads++;done();save();refresh();});}
function maybeInterstitial(then){if(!S.noAds&&S.adCount>=CFG.interstitialEvery){S.adCount=0;save();showAd(then,t('ad_between'));}else then();}

function refresh(){
  accrue();roll();
  $('cG').textContent=grp(S.gems);const bs=$('balSp');if(bs)bs.textContent=fmt(S.run.sparks);
  $('bQ').hidden=!claimable();
  const done=tickBuild();if(done.length){done.forEach(id=>toast(t('at_done',{t:upById(id).t})));sfx.chord();save();if(tab==='atelier')renderTab();if(R)renderTB();}
  const canBuild=(S.build.length<S.slots&&ALLUP.some(u=>!upLocked(u)&&!inBuild(u.id)&&S.run.sparks>=upCost(u)))||JOKERS.some(j=>jokerAvail(j)&&!S.jk[j.id]&&S.run.sparks>=j.sh);
  $('bA').hidden=!canBuild;
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
function renderTB(){
  const sp=S.run.sparks;
  $('tb').innerHTML=Object.keys(TBDEF).map(k=>{const c=tbCost(k),l=tbLvl(k),ok=isFinite(c)&&sp>=c,max=!isFinite(c);
    return `<button class="tbt ${ok?'ok':''} ${ok&&tutoStep===3?'hot':''}" data-tb="${k}" style="--tc:var(--${TBDEF[k].c})" ${max?'disabled':''} aria-label="${max?t('tb_aria_max',{t:TBDEF[k].t,l,d:TBDEF[k].d}):t('tb_aria',{t:TBDEF[k].t,l,c:fmt(c),d:TBDEF[k].d})}"><span class="lv">${l}</span><span class="ico">${ic(TBDEF[k].i)}</span><span class="lbl">${TBDEF[k].t}</span><b>${max?t('max'):ic('spark')+fmt(c)}</b></button>`;}).join('');
  renderJok();
}
function updTB(){const sp=S.run.sparks;document.querySelectorAll('[data-tb]').forEach(b=>{const c=tbCost(b.dataset.tb);b.classList.toggle('ok',isFinite(c)&&sp>=c);});}
function renderActs(){
  const a=$('acts');let h='';
  const g=prestigeGain(),canP=S.run.max>=CFG.prestige.minStage;
  if(R.mode==='boss'&&R.E.type==='boss')h+=`<button class="qb" id="retreat" aria-label="${t('retreat_aria',{n:S.run.stage-1})}"><span>${ic('flag')}</span></button>`;
  if(S.run.fled)h+=`<button class="qb hot" id="chal" aria-label="${t('chal_aria',{n:S.run.stage})}"><span>${ic('crown')}</span></button>`;
  if(S.bestStage>=CFG.prestige.minStage||canP)h+=`<button class="qb ${canP?'on':''}" id="prest" ${canP?'':'disabled'} aria-label="${canP?t('pre_aria',{m:dec(1+CFG.prestige.mult*(S.prestiges+1),1)}):t('pre_locked',{n:CFG.prestige.minStage})}"><span>${ic('prism')}</span>${canP?'<i></i>':''}</button>`;
  if(S.bestStage>=15&&isTitanDay()){const rd=titanReady();h+=`<button class="qb ${rd?'on':''}" id="titan" ${R.mode!=='farm'?'disabled':''} aria-label="${t('titan_aria',{n:titanTickets()})}"><span>${ic('flame')}</span>${rd?'<i></i>':''}</button>`;}
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
$('tb').addEventListener('click',e=>{const b=e.target.closest('[data-tb]');if(!b||!R||tbHeld)return;audio();Music.start();if(buyTB(b.dataset.tb)){renderTB();save();}else{const c=tbCost(b.dataset.tb);if(isFinite(c)){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}}});
function tbDetail(k){const d=TBDEF[k],l=tbLvl(k),c=tbCost(k);modal(`<div class="mart" style="color:var(--${d.c})">${ic(d.i)}</div><h2>${d.t}</h2><p style="color:var(--light)">${d.d}.</p><p>${t('tb_lvl',{n:l,v:d.n(l)})}${isFinite(c)?'<br>'+t('tb_lvl',{n:l+1,v:d.n(l+1)}):''}</p><p style="color:var(--mist);font-size:13px">${t('tb_note',{t:d.t})}</p><div class="acts">${isFinite(c)?`<button class="b b-gold" data-buytb="${k}" ${S.run.sparks>=c?'':'disabled'}>${ic('spark')}${t('tb_buy',{c:fmt(c)})}</button>`:''}<button class="b" data-close>${t('close')}</button></div>`);}
$('acts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!R)return;audio();
  if(b.id==='chal'){if(challengeBoss()){renderStage();renderActs();}}
  else if(b.id==='retreat'){if(retreat()){renderStage();renderActs();save();}}
  else if(b.id==='prest')prestigeModal();
  else if(b.id==='titan')titanModal();
});
function prestigeModal(){const g=prestigeGain(),pp=ppGain(S.run.max),m0=refMult(),m1=1+CFG.prestige.mult*(S.prestiges+1);modal(`<div class="mart" style="color:var(--shard)">${ic('prism')}</div><h2>${t('pre_title')}</h2><div class="loot">${ic('spark')}${t('pre_mult',{a:dec(m0,1),b:dec(m1,1)})}</div><p style="color:var(--beam);font-weight:800">${t('pre_pp',{n:pp})}</p><p style="font-weight:700">${t('pre_pot',{n:fmt(g)})}</p><p>${t('pre_p')}</p><p style="color:var(--mist);font-size:13px">${t('pre_note')}</p><div class="acts"><button class="b b-spark" id="doPrest">${t('pre_go')}</button><button class="b" data-close>${t('pre_not')}</button></div>`);}
function titanModal(){const ts=titanState(),n=titanTickets();modal(`<div class="mart" style="color:var(--s1)">${ic('flame')}</div><h2>${THEMES[weekTheme()].titan}</h2><p>${t('titan_p',{n:CFG.titan.time})}</p><div class="big" style="color:var(--beam)">${t('titan_tickets',{n})}</div><div class="acts"><button class="b b-gold" id="titanGo" ${n>0?'':'disabled'}>${t('fight')}</button><div class="row"><button class="b" id="titanAd" ${ts.ad>=1?'disabled':''}>${ic('tv')}${t('titan_ad')}</button><button class="b b-gem" id="titanGem" ${ts.gem>=1||S.gems<CFG.titan.ticketGems?'disabled':''}>${ic('gem')}${t('titan_gem',{n:CFG.titan.ticketGems})}</button></div><button class="b" data-close>${t('later')}</button></div>`);}
function launchTitan(){if(startTitan()){renderStage();renderActs();banner(R.E.name,t('titan_go',{n:CFG.titan.time}),'gold',2400);Music.target=1;save();}}
/* ----- cadeau publicitaire ----- */
let giftT=0,giftNext=0,gift=null,giftShown=0;
function giftTick(dt){
  giftT+=dt;
  if(gift){if(giftT-giftShown>CFG.gift.show){gift=null;$('gift').hidden=true;}return;}
  if(!giftNext)giftNext=giftT+rnd(CFG.gift.every[0],CFG.gift.every[1]);
  if(giftT>=giftNext&&giftOK()&&$('veil').hidden&&tab==='home'){gift=giftRoll();giftShown=giftT;giftNext=0;const g=$('gift');g.innerHTML=ic(gift.k==='sp'?'spark':gift.k==='g'?'gem':'bolt',gift.k==='g'?'ig':'ie');g.hidden=false;g.classList.remove('pop');void g.offsetWidth;g.classList.add('pop');sfx.tick();}
  else if(giftT>=giftNext&&!giftOK())giftNext=giftT+600;
}
function giftLabel(gf){return gf.k==='sp'?'+'+fmt(gf.v)+' '+t('sparks'):gf.k==='g'?'+'+gf.v+' '+t('gems'):t('gift_boost',{n:30});}
$('gift').addEventListener('click',()=>{if(!gift)return;audio();const gf=gift;modal(`<div class="mart" style="color:var(--beam)">${ic('box')}</div><h2>${t('gift_title')}</h2><div class="loot" style="color:var(--beam)">${giftLabel(gf)}</div><p>${t('gift_p')}</p><div class="acts"><button class="b b-gold" id="giftGo">${ic('tv')}${t('gift_go')}</button><button class="b" data-close>${t('later')}</button></div>`);});
/* ----- tutoriel ----- */
let tutoStep=0,hpLagV=1,hintT=null;
function showHint(txt,ms){const h=$('hint');h.textContent=txt;h.hidden=false;clearTimeout(hintT);if(ms)hintT=setTimeout(()=>h.hidden=true,ms);}
function tutoNext(){
  if(tutoStep===1){tutoStep=2;S.st.tuto=1;showHint(t('hint2'),4500);}
  else if(tutoStep===3){tutoStep=4;S.st.tuto=3;$('hint').hidden=true;showHint(t('hint4',{n:CFG.prestige.minStage}),5000);document.querySelectorAll('.tbt.hot').forEach(b=>b.classList.remove('hot'));}
  save();
}
function tutoTick(){if(tutoStep===2&&S.run.sparks>=tbCost('cad')){tutoStep=3;S.st.tuto=2;showHint(t('hint3'));renderTB();}}
/* ----- onglets ----- */
let atGroup='start';
const grpReady=g=>S.build.length<S.slots&&ALLUP.some(u=>u.g===g&&!upLocked(u)&&!inBuild(u.id)&&S.run.sparks>=upCost(u))||(g==='jok'&&JOKERS.some(j=>jokerAvail(j)&&!S.jk[j.id]&&S.run.sparks>=j.sh));
function buildRow(b){const u=upById(b.id),p=100*Math.min(1,1-(b.until-Date.now())/1000/b.dur);
  return `<div class="slot slab item run"><span class="ring" data-ring="${b.id}" style="--p:${p}%">${ic(upIcon(u),'ie')}</span><div style="min-width:0"><b>${u.t}</b><span class="tm">${ic('clock')}<span data-until="${b.until}">${dur((b.until-Date.now())/1000)}</span></span><div class="note" style="margin:2px 0 0">${t('at_to',{n:lvlOf(u)+1})}</div></div><div class="slot-acts"><button class="b b-gem sm" data-rush="${b.id}" data-rushg="${b.id}" aria-label="${t('at_rush')}">${ic('gem')}<span>${rushGems(b)}</span></button><button class="b sm" data-adb="${b.id}" ${S.day.buildAds>=CFG.build.adPerDay?'disabled':''}>${ic('tv')}${t('at_ad')}</button></div></div>`;}
function tileHtml(u,free){
  const k=lvlOf(u),c=upCost(u),max=k>=u.max,lock=upLocked(u),b=inBuild(u.id);
  let foot;
  if(lock)foot=`<div class="tstate">${ic('lock')}${t('at_lock',{n:upReq(u)})}</div>`;
  else if(b)foot=`<div class="tstate run">${ic('clock')}<span data-until="${b.until}">${dur((b.until-Date.now())/1000)}</span></div>`;
  else if(max)foot=`<div class="tstate">${ic('check')}${t('at_maxed')}</div>`;
  else foot=`<button class="b b-spark sm" data-build="${u.id}" ${free<1||S.run.sparks<c?'disabled':''}><span style="display:inline-flex;align-items:center;gap:4px">${ic('spark')}${fmt(c)}</span><small>${ic('clock')}${dur(upTime(u))}</small></button>`;
  return `<div class="tile slab ${lock?'locked':''}" data-g="${u.g}"><button class="tile-top" data-updetail="${u.id}" aria-label="${t('at_detail',{t:u.t})}"><span class="tico">${ic(upIcon(u))}</span><span class="tname">${u.t}</span><span class="tlvl">${isFinite(u.max)?t('at_k',{k,m:u.max}):t('lvl',{n:k})}</span></button>${isFinite(u.max)?`<div class="pips"><i style="width:${100*k/u.max}%"></i></div>`:'<div class="pips inf"></div>'}${foot}</div>`;
}
function upDetail(id){
  const u=upById(id),k=lvlOf(u),c=upCost(u),max=k>=u.max,lock=upLocked(u),b=inBuild(u.id),free=S.slots-S.build.length;
  let act='';
  if(lock)act=`<p>${t('at_locked',{n:upReq(u)})}</p>`;
  else if(b)act=`<p>${t('at_inprog',{t:`<b data-until="${b.until}">${dur((b.until-Date.now())/1000)}</b>`})}</p>`;
  else if(max)act=`<p>${t('at_ismax')}</p>`;
  else act=`<p>${ic('clock')} ${t('at_dur',{t:dur(upTime(u))})}</p><div class="acts"><button class="b b-spark" data-build="${u.id}" ${free<1||S.run.sparks<c?'disabled':''}>${ic('spark')}${t('at_buy',{c:fmt(c)})}</button>${free<1?'<p>'+t('at_full')+'</p>':''}</div>`;
  modal(`<div class="mart" style="color:var(--beam)">${ic(upIcon(u))}</div><h2>${u.t}</h2><p>${isFinite(u.max)?t('at_lvl',{k,m:u.max}):t('lvl',{n:k})}</p><p style="color:var(--light)">${max?'':t('at_next',{d:u.d(k)})}</p>${act}<div class="acts"><button class="b" data-close>${t('close')}</button></div>`);
}
function renderTab(){
  const home=tab==='home';$('panel').hidden=home;
  document.querySelectorAll('.nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab));
  if(home){requestAnimationFrame(resize);return;}
  const p=$('tabPanel');let h='';
  const head=(ttl,sub)=>`<header class="phead"><div><h1 class="ttl">${ttl}</h1>${sub?`<p class="sub">${sub}</p>`:''}</div><button class="quit" data-tab="home" aria-label="${t('nav_home')}">${ic('close')}</button></header>`;
  if(tab==='atelier'){
    const free=S.slots-S.build.length,nextSlot=CFG.build.slotGems[S.slots-1];
    h+=head(t('at_title'),t('at_sub'))+`<div class="bal">${ic('spark','ie')}<b id="balSp">${fmt(S.run.sparks)}</b><span>${t('at_bal')}</span></div><div class="list">${S.build.map(buildRow).join('')}${Array.from({length:free},()=>`<div class="slot empty">${ic('plus')}${t('at_free')}</div>`).join('')}</div>`;
    h+=`<div class="slotbuy"><span>${t('at_slots',{n:S.slots})}</span>${nextSlot!=null?`<button class="b b-gem sm" id="buySlot" ${S.gems<nextSlot?'disabled':''}>${ic('plus')}${t('at_slot')} ${ic('gem')}${nextSlot}</button>`:''}</div>`;
    h+=`<div class="grp" role="group" aria-label="${t('at_title')}">${GROUPS.map(g=>`<button data-grp="${g.id}" aria-pressed="${atGroup===g.id}">${ic(GICON[g.id])}${g.t}${grpReady(g.id)?'<span class="badge"></span>':''}</button>`).join('')}</div>`;
    h+=`<p class="note">${GROUPS.find(g=>g.id===atGroup).d}</p>`;
    if(atGroup==='jok'){
      const nj=CFG.build.jslotGems[S.jslots-1];
      h+=`<div class="slotbuy"><span>${t('j_slots',{n:S.equip.length,m:S.jslots})}</span>${nj!=null?`<button class="b b-gem sm" id="buyJSlot" ${S.gems<nj?'disabled':''}>${ic('plus')}${t('at_slot')} ${ic('gem')}${nj}</button>`:''}</div><div class="list" style="margin-top:10px">`;
      JOKERS.forEach(j=>{const l=S.jk[j.id]||0,on=S.equip.includes(j.id),av=jokerAvail(j);let btns='';
        if(!l&&av)btns=`<button class="b b-spark sm" data-unlock="${j.id}:s" ${S.run.sparks<j.sh?'disabled':''}>${ic('spark')}${fmt(j.sh)}</button><button class="b b-gem sm" data-unlock="${j.id}:g" ${S.gems<j.gm?'disabled':''}>${ic('gem')}${j.gm}</button>`;
        else if(l){const u=upById('j_'+j.id),b=inBuild(u.id),c=upCost(u);btns=`<button class="b sm ${on?'b-gem':''}" data-equip="${j.id}" ${!on&&S.equip.length>=S.jslots?'disabled':''}>${on?t('j_unequip'):t('j_equip')}</button>`+(l<5?(b?`<span class="d">${ic('clock')}<span data-until="${b.until}">${dur((b.until-Date.now())/1000)}</span></span>`:`<button class="b b-spark sm" data-build="${u.id}" ${free<1||S.run.sparks<c?'disabled':''}>${t('j_lvlbtn',{n:l+1})} ${ic('spark')}${fmt(c)}</button>`):'<span class="d">'+t('j_max')+'</span>');}
        h+=`<div class="jcard slab ${on?'on':''} ${!av&&!l?'locked':''}"><span class="jart">${ic(JICON[j.id])}</span><div style="min-width:0"><b>${j.t}</b>${l?`<span class="jl">${t('j_lvl',{n:l})}</span>`:''}<p>${av||l?j.d(Math.max(1,l)):t('j_lock',{n:j.lvl})}</p>${l?`<p class="jmeta">${t('j_charge',{n:jokerNeed(j.id)})}</p>`:''}${btns?`<div class="jbtns">${btns}</div>`:''}</div></div>`;});
      h+='</div>';
    }
    if(atGroup==='arm'){h+=`<div class="slotbuy"><span><b style="font:18px var(--display);color:var(--beam)">${S.pp||0}</b> ${t('pp_n',{n:S.pp||0}).replace(/^\d+\s*/,'')}</span>${Object.keys(S.wp||{}).length?`<button class="b b-gem sm" id="wpReset" ${S.gems<CFG.wpReset?'disabled':''}>${t('pp_reset')} ${ic('gem')}${CFG.wpReset}</button>`:''}</div><p class="note">${t('pp_note')}</p><div class="list" style="gap:6px;margin-bottom:12px">${WEAPONS.map((w,i)=>{const k=wpLvl(i),c=wpCost(i);return `<div class="wpn"><canvas width="88" height="88" data-wpn="${i+1}"></canvas><div><b>${w.t} <span>· ${w.fx}</span>${k?`<em>${t('lvl',{n:k})}</em>`:''}</b><p>${w.d}</p></div><button class="b ${S.pp>=c?'b-gold':''} sm" data-wp="${i}" ${S.pp>=c?'':'disabled'} aria-label="${t('pp_up',{t:w.t,n:c})}">${ic('plus')}${c}</button></div>`;}).join('')}</div>`;}
    h+=`<div class="tiles">${UPG.filter(u=>u.g===atGroup).map(u=>tileHtml(u,free)).join('')}</div>`;
  }else if(tab==='quests'){
    const v=questView();
    const qrow=q=>{const ready=q.p>=q.n&&!q.done;return `<div class="quest slab item ${ready?'hl':''} ${q.done?'done':''}" ${ready?`data-claim="${q.kind}:${q.i}" role="button" tabindex="0"`:''}><span class="qic">${ic(q.done?'check':ready?'star':'target')}</span><div class="qbody" style="min-width:0"><b>${q.t}</b><div class="qbar"><i style="width:${100*q.p/q.n}%"></i><span>${fmt(q.p)} / ${fmt(q.n)}</span></div>${rewardHtml(q.r)}</div>${ready?`<span class="b b-gold sm">${t('quests_claim')}</span>`:q.done?`<span class="note">${t('quests_got')}</span>`:'<span></span>'}</div>`;};
    h+=head(t('quests_title'),t('quests_sub'));
    const done=ONB.length-v.onbLeft;
    if(v.onb.length)h+=`<h2 class="sec">${t('quests_onb')}<small>${t('quests_of',{a:done,b:ONB.length})}</small></h2><div class="chap"><i style="width:${100*done/ONB.length}%"></i></div><div class="list">${v.onb.map(qrow).join('')}</div>`;
    const mid=new Date();mid.setHours(24,0,0,0);
    h+=`<h2 class="sec">${t('quests_today')}<small>${t('quests_new',{t:dur((mid-Date.now())/1000)})}</small></h2><div class="list">${v.d.map(qrow).join('')}</div>`;
    h+=`<h2 class="sec">${t('quests_week')}<small>${t('quests_monday')}</small></h2><div class="list">${v.w.map(qrow).join('')}</div>`;
    h+=`<h2 class="sec">${t('quests_cal')}</h2>`+loginHtml();
  }else if(tab==='league'){
    const live=netReady&&boardCache&&boardCache.joined&&boardCache.rows.length>0;
    const rows=live?boardCache.rows.map(r=>({id:r.id,name:r.name,score:r.score,sides:tierOf(r.best||1).sides,hue:idHue(r.id),me:r.me})):standings();
    if(netReady&&!boardCache)netBoard().then(b=>{if(b&&tab==='league')renderTab();});
    h+=head(t('lg_title',{d:t('div_bronze')}),t(live?'lg_sub_live':'lg_sub',{days:t('lg_days')+' · '+(isTitanDay()?t('lg_today'):t('lg_next',{d:nextTitanDay()}))}));
    const pod=rows.slice(0,3);while(pod.length<3)pod.push({name:'—',score:0,sides:3,hue:200});
    h+=`<div class="podium">${[1,0,2].map(i=>{const r=pod[i];return `<div class="pod p${i+1}"><canvas width="80" height="80" data-mini="${r.sides}" data-hue="${r.me?'me':r.hue}"></canvas><span class="nm">${esc(r.name)}</span><div class="blk">${i+1}</div></div>`;}).join('')}</div><div class="list" style="gap:4px">`;
    rows.forEach((r,i)=>{if(i===5&&rows.length>6)h+=`<div class="zone upz">${t('lg_up')}</div>`;if(i===25)h+=`<div class="zone downz">${t('lg_down')}</div>`;
      const cls=(r.me?' me':'')+(i<5?' up':i>=25?' down':'');h+=`<div class="lg${cls}"><span class="rk">${i+1}</span><canvas width="52" height="52" data-mini="${r.sides}" data-hue="${r.me?'me':r.hue}"></canvas><span class="nm">${esc(r.name)}</span><span class="sc">${fmt(r.score)}</span>${r.me?'<span></span>':`<button class="rep" data-report="${r.id||i}" aria-label="${t('lg_report',{n:esc(r.name)})}">${ic('flag')}</button>`}</div>`;});
    h+='</div>';
  }else if(tab==='shop'){
    h+=head(t('sh_title'),`${ic('tv')}${t('sh_demo')}`);
    const OART={starter:['box','ie'],loot:['shard','is'],noads:['tv','ie'],g80:['gem','ig'],g500:['gem','ig'],g1200:['gem','ig'],g2600:['box','ig'],g7000:['box','ig'],g15000:['crown','ig']};
    h+=`<div class="list">${OFFERS.map(o=>{const own=o.once&&o.once();const left=o.id==='starter'&&S.offerAt&&!S.starter?Math.max(0,S.offerAt+86400e3-Date.now()):0;return `<div class="offer slab"><span class="oart">${ic(OART[o.id][0],OART[o.id][1])}</span><div style="min-width:0"><b>${o.t}</b><p>${o.d}${left>0?` <span style="color:var(--beam)">${t('starter_left',{t:dur(left/1000)})}</span>`:''}</p></div><button class="b b-gold sm" data-offer="${o.id}" ${own?'disabled':''}>${own?t('sh_own'):priceOf(o)}</button></div>`;}).join('')}</div>`;
    const bl=S.boostUntil-Date.now();
    h+=`<h2 class="sec">${t('sh_boost')}<small>${bl>0?t('sh_active',{t:dur(bl/1000)}):t('sh_inactive')}</small></h2><div class="gitems"><div class="gitem slab"><span class="oart">${ic('tv','ie')}</span><b>${t('sh_adboost',{n:CFG.boost.adH})}</b><p>${t('sh_boost_d')}</p><button class="b b-gold sm" id="adBoost">${ic('tv')}${t('sh_watch')}</button></div>`;
    h+=`<div class="gitem slab"><span class="oart">${ic('bolt','ie')}</span><b>${t('sh_gemboost',{n:CFG.boost.gemsH})}</b><p>${t('sh_boost_d')}</p><button class="b b-gem sm" data-gem="boost" ${S.gems<CFG.boost.gemsPrice?'disabled':''}>${ic('gem')}${CFG.boost.gemsPrice}</button></div></div>`;
    h+=`<h2 class="sec">${t('sh_skin')}</h2><div class="skins">`;
    SKINS.forEach(k=>{const has=S.skins.includes(k.id);h+=`<button class="skin" data-skin="${k.id}" aria-pressed="${S.skin===k.id}"><canvas width="80" height="80" data-mini="6" data-hue="${k.id==='prisme'?'prism':{cyan:192,rose:322,or:44}[k.id]}"></canvas>${k.label}<span>${has?(S.skin===k.id?t('sh_worn'):t('sh_wear')):t('sh_price',{n:k.price})}</span></button>`;});
    h+='</div>';
  }else if(tab==='profile'){
    const tr=tierOf(S.bestStage),L=layers();
    h+=head(t('pr_title'))+`<div class="stage"><canvas id="me" width="380" height="380" aria-hidden="true"></canvas><div class="ptier">${t('pr_tier',{t:tr.name,n:S.bestStage})}${L?t('pr_worlds',{n:L}):''}</div></div>`;
    h+=`<h2 class="sec">${t('pr_name')}</h2><div class="field"><input id="nameIn" maxlength="16" value="${esc(S.name)}" aria-label="${t('pr_newname')}"><button class="b b-gold sm" id="nameBtn">${S.nameChanges===0?t('pr_change'):t('pr_change')+' '+ic('gem')+RENAME}</button></div><p class="err" id="nameErr"></p>`;
    h+=`<p class="note">${S.nameChanges===0?t('pr_first'):''}${t('pr_note')}</p>`;
    h+=`<h2 class="sec">${t('pr_forge')}<small>${t('pr_forge_sub',{r:fmt(idleRate()),h:2+S.up.cap})}</small></h2><div class="slot slab"><span class="ring" id="forgeRing" style="--p:${100*S.idle.bank/idleCap()}%">${ic('forge','ie')}</span><div><b id="forgeN">${t('pr_forge_n',{n:fmt(Math.floor(S.idle.bank))})}</b><div class="note" style="margin:2px 0 0">${t('pr_forge_d')}</div></div><button class="b b-spark sm" id="collectBtn" ${S.idle.bank<1?'disabled':''}>${t('pr_collect')}</button></div>`;
    h+=`<h2 class="sec">${t('pr_settings')}</h2><div class="list">`;
    h+=`<label class="switch slab">${t('pr_lang')}<select id="setLang" class="sel">${LANG_LIST().map(l=>`<option value="${l}" ${l===LANG?'selected':''}>${I18N[l]._name}</option>`).join('')}</select></label>`;
    h+=`<label class="switch slab">${t('pr_music')}<input type="checkbox" id="setMusic" ${S.settings.music?'checked':''}></label>`;
    h+=`<label class="switch slab">${t('pr_sound')}<input type="checkbox" id="setSound" ${S.settings.sound?'checked':''}></label>`;
    h+=`<label class="switch slab">${t('pr_fx')}<input type="checkbox" id="setFx" ${S.settings.fx?'checked':''}></label></div>`;
    h+=`<h2 class="sec">${t('pr_stats')}</h2><div class="stats"><div class="stat slab"><b>${S.bestStage}</b><span>${t('pr_best')}</span></div><div class="stat slab"><b>${S.prestiges}</b><span>${t('pr_pres')}</span></div><div class="stat slab"><b>${fmt(S.st.merges)}</b><span>${t('pr_merges',{n:fmt(S.st.manual)})}</span></div><div class="stat slab"><b>${fmt(S.st.kills)}</b><span>${t('pr_kills',{n:S.st.bosses})}</span></div><div class="stat slab"><b>${fmt(S.st.titanBest)}</b><span>${t('pr_titan')}</span></div><div class="stat slab"><b>${S.st.bought}</b><span>${t('pr_res')}</span></div></div>`;
    const bk=Object.keys(S.bestiary).map(Number).sort((a,b)=>a-b);
    h+=`<h2 class="sec">${t('pr_bestiary')}<small>${t('pr_beaten',{n:bk.length})}</small></h2><div class="list" style="gap:4px">${bk.length?bk.map(n=>{const e=enemyFor(n);return `<div class="best"><canvas width="88" height="88" style="width:44px;height:44px" data-foe="${n}"></canvas><span>${t('pr_stage',{n:e.name,s:n})}</span><span>${e.type==='boss'?t('pr_in',{n:S.bestiary[n]}):t('pr_guard')}</span></div>`;}).join(''):'<p class="note">'+t('pr_bestiary_empty')+'</p>'}</div>`;
    h+=`<h2 class="sec">${t('pr_xfer')}</h2><p class="sub" style="margin:-4px 0 8px">${t('pr_xfer_p')}</p><div class="row"><button class="b" style="flex:1" id="xferShow">${t('pr_xfer_show')}</button><button class="b" style="flex:1" id="xferEnter">${t('pr_xfer_enter')}</button></div>`;
    h+=`<h2 class="sec">${t('pr_demo')}<small>${t('pr_version',{v:VERSION})}</small></h2><button class="b b-red" style="width:100%" id="resetBtn">${t('pr_reset')}</button>`;
  }
  p.innerHTML=h;window.scrollTo(0,0);$('panel').scrollTop=0;const gsel=p.querySelector('.grp [aria-pressed="true"]');if(gsel&&gsel.scrollIntoView)gsel.scrollIntoView({inline:'center',block:'nearest'});
  p.querySelectorAll('canvas[data-wpn]').forEach(m=>{const c=m.getContext('2d');c.clearRect(0,0,88,88);drawGem(c,44,44,30,+m.dataset.wpn,1,1,false,0);});
  p.querySelectorAll('canvas[data-foe]').forEach(m=>{drawFoeAt(m.getContext('2d'),88,0,enemyFor(+m.dataset.foe));});
  p.querySelectorAll('canvas[data-mini]').forEach(m=>{const hv=m.dataset.hue;drawMini(m,+m.dataset.mini,hv==='me'?skinHue(0):hv==='prism'?300:+hv);});
}
function loginHtml(){
  const st=loginState();
  return `<div class="login">${LOGIN.map((r,i)=>{const d=i+1,cls=d<st.day?'past':d===st.day?'today':'';return `<div class="ltile ${cls}"><small>${t('login_day',{n:d})}</small>${r.joker?`<span>${ic('eye','ig')}${t('login_joker')}</span>`:rewardHtml(r).replace('class="rew"','class="rew" style="justify-content:center"')}</div>`;}).join('')}</div>${st.claimedToday?`<p class="note">${t('login_done',{n:st.day%7+1})}</p>`:`<button class="b b-gold" style="width:100%;margin-top:10px" id="loginGo">${t('login_go',{n:st.day})}</button>`}`;
}
function loginModal(){
  const st=loginState();if(st.claimedToday)return;
  modal(`<h2>${t('login_title',{n:st.day})}</h2><p>${t('login_sub')}</p>${loginHtml()}`);
}
function goTab(t){audio();Music.start();tab=t;renderTab();}
document.querySelector('.nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;goTab(b.dataset.tab);});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&!b.closest('#board')){audio();sfx.click();}},true);
$('meBtn').addEventListener('click',()=>goTab('profile'));
$('pillG').addEventListener('click',()=>goTab('shop'));
function doBuild(id){const r=startBuild(id);if(r==='ok'){sfx.buy();toast(t('at_started',{t:upById(id).t}));}else if(r==='slots')toast(t('at_busy'));save();refresh();renderTab();return r;}
$('panel').addEventListener('click',e=>{
  const el=e.target.closest('button,[data-claim]');if(!el)return;audio();Music.start();
  if(el.dataset.tab)goTab(el.dataset.tab);
  else if(el.id==='collectBtn'){const g=collect();if(g){sfx.chord();save();toast('+'+fmt(g)+' '+t('sparks'));const cs=$('cSp');flyShards($('forgeRing'),cs,Math.min(8,2+Math.floor(Math.log10(g+1))));refresh();renderTab();}}
  else if(el.dataset.wp){if(buyWP(+el.dataset.wp)){sfx.buy();save();renderTab();}}
  else if(el.id==='wpReset'){if(resetWP()){sfx.chord();toast(t('pp_back'));save();refresh();renderTab();}}
  else if(el.dataset.build)doBuild(el.dataset.build);
  else if(el.dataset.updetail)upDetail(el.dataset.updetail);
  else if(el.dataset.rush){if(rushBuild(el.dataset.rush)){sfx.chord();}else toast(t('no_gems'));save();refresh();renderTab();}
  else if(el.dataset.adb){const id=el.dataset.adb;rewarded(()=>{adBuild(id);toast(t('at_rushed'));renderTab();});}
  else if(el.id==='buySlot'){if(buySlot()){sfx.chord();toast(t('at_newslot'));}save();refresh();renderTab();}
  else if(el.id==='buyJSlot'){if(buyJSlot()){sfx.chord();toast(t('at_newjslot'));}save();refresh();renderTab();}
  else if(el.dataset.grp){atGroup=el.dataset.grp;renderTab();}
  else if(el.dataset.unlock){const [id,c]=el.dataset.unlock.split(':');if(unlockJoker(id,c)){sfx.win();toast(t('j_unlocked',{n:jokerById(id).t}));renderJok();}save();refresh();renderTab();}
  else if(el.dataset.equip){if(!toggleEquip(el.dataset.equip))toast(t('j_full'));else renderJok();save();renderTab();}
  else if(el.dataset.claim){const [k,i]=el.dataset.claim.split(':');if(claim(k,+i)){sfx.chord();toast(t('quests_reward'));save();refresh();renderTab();}}
  else if(el.id==='loginGo'){const r=claimLogin();if(r){toast(t('login_got'));sfx.win();}save();refresh();renderTab();}
  else if(el.dataset.report){toast(t('lg_reported'));el.disabled=true;if(/-/.test(el.dataset.report))netReport(el.dataset.report);}
  else if(el.dataset.offer){const o=OFFERS.find(x=>x.id===el.dataset.offer);modal(`<div class="mart">${ic('bag','ie')}</div><h2>${o.t}</h2><p>${o.d}</p><div class="big" style="color:var(--beam)">${priceOf(o)}</div><p>${t('sh_sim')}</p><div class="acts"><button class="b b-gold" data-confirm="${o.id}">${t('sh_confirm')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
  else if(el.dataset.gem){if(buyGemItem(el.dataset.gem)){sfx.buy();save();refresh();renderTab();}}
  else if(el.id==='adBoost'){rewarded(()=>{give({b:CFG.boost.adH});toast(t('sh_boosted',{n:CFG.boost.adH}));renderTab();});}
  else if(el.dataset.skin){if(!buySkin(el.dataset.skin))toast(t('no_gems'));else sfx.buy();save();refresh();renderTab();}
  else if(el.id==='nameBtn'){const r=rename($('nameIn').value);if(r.ok){toast(t('name_updated'));netName(S.name);save();refresh();renderTab();}else $('nameErr').textContent=r.msg;}
  else if(el.id==='xferShow'){const code=xferCode();modal(`<h2>${t('pr_xfer_show')}</h2><p>${t('pr_xfer_show_p')}</p><div class="code" id="xferCode">${code}</div><div class="acts"><button class="b b-gold" id="xferCopy">${t('copy')}</button><button class="b" data-close>${t('close')}</button></div>`);}
  else if(el.id==='xferEnter'){modal(`<h2>${t('pr_xfer_enter')}</h2><p>${t('pr_xfer_enter_p')}</p><input id="xferIn" class="in" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="PF1-…"><p id="xferErr" style="color:var(--danger);min-height:1.2em"></p><div class="acts"><button class="b b-gold" id="xferGo">${t('pr_xfer_go')}</button><button class="b" data-close>${t('cancel')}</button></div>`);setTimeout(()=>$('xferIn').focus(),50);}
  else if(el.id==='resetBtn'){modal(`<h2>${t('pr_reset_q')}</h2><p>${t('pr_reset_p')}</p><div class="acts"><button class="b b-red" data-doreset>${t('pr_reset_ok')}</button><button class="b" data-close>${t('cancel')}</button></div>`);}
});
$('panel').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.claim)e.target.click();});
$('panel').addEventListener('change',e=>{
  if(e.target.id==='setMusic'){S.settings.music=e.target.checked;if(S.settings.music)Music.start();else Music.stop();}
  if(e.target.id==='setSound')S.settings.sound=e.target.checked;
  if(e.target.id==='setFx')S.settings.fx=e.target.checked;
  if(e.target.id==='setLang'){setLang(e.target.value);applyStatic();renderTab();if(R){renderStage();renderTB();renderActs();}}save();
});
$('modal').addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;audio();
  if(el.hasAttribute('data-close'))closeModal();
  else if(el.dataset.buytb){if(buyTB(el.dataset.buytb)){renderTB();save();closeModal();}}
  else if(el.dataset.build){doBuild(el.dataset.build);closeModal();}
  else if(el.dataset.confirm){purchase(el.dataset.confirm);closeModal();sfx.chord();toast(t('sh_bought'));save();refresh();renderTab();}
  else if(el.id==='xferCopy'){const c=$('xferCode').textContent;if(navigator.clipboard)navigator.clipboard.writeText(c).then(()=>toast(t('copied')),()=>{});else toast(c);}
  else if(el.id==='xferGo'){const d=xferParse($('xferIn').value);if(!d){$('xferErr').textContent=t('pr_xfer_bad');return;}if(d.id===DEV.id){closeModal();toast(t('pr_xfer_same'));return;}try{localStorage.setItem('prisme-dev',JSON.stringify(d));localStorage.removeItem(KEY);}catch(e){}location.reload();}
  else if(el.hasAttribute('data-doreset')){S=fresh();closeModal();save();tab='home';startRun();renderTab();refresh();}
  else if(el.id==='nameGo'){const v=$('nameIn').value;if(v.trim()===S.name){closeModal();return;}const r=rename(v);if(r.ok){closeModal();toast(t('name_saved'));netName(S.name);save();refresh();}else $('nameErr').textContent=r.msg;}
  else if(el.id==='loginGo'){const r=claimLogin();closeModal();if(r){toast(t('login_got'));sfx.win();}save();refresh();renderTab();}
  else if(el.id==='doPrest'){closeModal();S.adCount++;const g=doPrestige();renderStage();renderTB();renderActs();save();refresh();toast(t('pre_done',{m:dec(refMult(),1),n:fmt(g)}));maybeInterstitial(()=>{if(!S.starter&&!S.offerAt&&S.prestiges>=1){S.offerAt=Date.now();save();starterModal();}else if(S.prestiges===1)toast(t('pre_tip'));});}
  else if(el.id==='titanGo'){closeModal();launchTitan();}
  else if(el.id==='giftGo'){const gf=gift;gift=null;$('gift').hidden=true;giftNext=0;closeModal();showAd(()=>{giftTake(gf);toast(giftLabel(gf));sfx.win();save();refresh();if(R)renderTB();},t('ad_sim'));}
  else if(el.id==='titanAd'){closeModal();rewarded(()=>{titanAdTicket();toast(t('titan_got'));titanModal();});}
  else if(el.id==='titanGem'){if(titanGemTicket()){sfx.buy();save();refresh();titanModal();}}
  else if(el.id==='offOk'){closeModal();}
  else if(el.id==='offAd'){const o=pendingOff;closeModal();showAd(()=>{roll();S.day.ads++;applyOffline(o,1);toast(t('off_more',{n:fmt(o.sparks)}));save();refresh();renderTB();});}
});
let pendingOff=null;
function offlineModal(o){
  pendingOff=o;applyOffline(o,1);renderStage();renderTB();
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
  const left=S.offerAt?Math.max(0,S.offerAt+86400e3-Date.now()):0;
  const so=OFFERS[0];modal(`<div class="mart">${ic('box','ie')}</div><h2>${so.t}</h2><p>${t('starter_p',{p:priceOf(so)})}</p>${left>0?`<p class="tm" style="color:var(--beam);font-weight:800">${t('starter_left',{t:dur(left/1000)})}</p>`:''}<div class="acts"><button class="b b-gold" data-confirm="starter">${t('starter_btn',{p:priceOf(so)})}</button><button class="b" data-close>${t('starter_no')}</button></div>`);
}
function homeMoments(){
  if(S.bestStage>=6&&S.nameChanges===0&&!S.st.namePrompted&&$('veil').hidden){S.st.namePrompted=true;save();
    modal(`<div class="mart" style="color:var(--gem)">${ic('gem')}</div><h2>${t('name_first')}</h2><p>${t('name_first_p')}</p><div class="field"><input id="nameIn" maxlength="16" value="${esc(S.name)}" aria-label="${t('name_your')}"></div><p class="err" id="nameErr"></p><div class="acts"><button class="b b-gold" id="nameGo">${t('name_keep')}</button><button class="b" data-close>${t('later')}</button></div>`);
    $('nameIn').select();}
}
/* ----- textes statiques (nav, aria, hors-ligne) ----- */
function applyStatic(){document.querySelectorAll('[data-i18n]').forEach(el=>{el.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=t(el.dataset.i18n);});});document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));document.title='Prisme Fusion';}
/* ----- lancement de la partie continue ----- */
function startRun(){
  newRun();fx.trauma=0;fx.pop={};fx.sq={};bfx.nums=[];bfx.parts=[];hpLagV=1;
  renderStage();renderTB();renderActs();requestAnimationFrame(resize);
  if(!S.st.tuto){tutoStep=1;showHint(t('hint1'));}
  else if(S.st.tuto<3)tutoStep=2;else tutoStep=0;
}
/* ================= boucle ================= */
let last=performance.now(),uiT=0,saveT=0,lastStage=0,lastMode='';
const meC=$('meMini').getContext('2d');
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
      const tm=$('tmr');if(R.mode==='boss'){tm.hidden=false;tm.className='tmr'+(R.bossT<10?' late':'');tm.innerHTML=ic('clock')+Math.ceil(R.bossT)+' '+(I18N[LANG]._dur||I18N.fr._dur)[0];}else if(R.mode==='titan'){tm.hidden=false;tm.className='tmr';tm.innerHTML=fmt(R.titanDmg)+' · '+Math.ceil(R.titanT)+' '+(I18N[LANG]._dur||I18N.fr._dur)[0];}else tm.hidden=true;
      $('cSp').textContent=fmt(S.run.sparks);
      updTB();updJok();tutoTick();giftTick(dt);
      const fill=R.cells.filter(Boolean).length/R.cells.length;
      if(R.mode==='farm')Music.target=Math.min(1,Math.max(fill*0.9,R.combo/6,0.25));
    }
  }
  if(tab==='home'){drawMini($('meMini'),tierOf(S.bestStage).sides,skinHue(t));}
  else if(tab==='profile'&&$('me'))drawMe($('me').getContext('2d'),380,t,dt);
  uiT+=dt;if(uiT>0.5){uiT=0;refresh();if(tab==='home')homeMoments();}
  saveT+=dt;if(saveT>5){saveT=0;save();netSave(false);}
  netT+=dt;if(netT>30){netT=0;probeNet();}
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
/* ----- connexion obligatoire ----- */
let netOK=true,netT=0;
function setOnline(v){if(v===netOK)return;netOK=v;$('offline').hidden=v;if(R)R.hold=!v;if(v){last=performance.now();toast(t('net_back'));}else save();}
async function probeNet(){if(!navigator.onLine){setOnline(false);return;}if(!/^https?:/.test(location.protocol)){setOnline(true);return;}if(NET.on){const ok=await netTime();if(!ok){try{const r=await fetch(location.href,{method:'HEAD',cache:'no-store'});if(r.ok)$('netMsg').textContent=t('net_server');}catch(e){$('netMsg').textContent=t('net_p');}}else $('netMsg').textContent=t('net_p');setOnline(ok);if(ok&&!netReady)netBoot();return;}try{const r=await fetch(location.href,{method:'HEAD',cache:'no-store'});setOnline(r.ok||r.status<500);}catch(e){setOnline(false);}}
window.addEventListener('online',probeNet);window.addEventListener('offline',()=>setOnline(false));
$('retryNet').addEventListener('click',probeNet);
probeNet();
if(window.ResizeObserver){let rsz=0;new ResizeObserver(()=>{const bw=$('bw');const h=bw.clientHeight;if(h!==rsz){rsz=h;resize();}}).observe($('bw'));}
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();netSave(true);}else{last=performance.now();const o=offlineGains();if(o&&(o.sparks>0||o.stages>0)&&$('veil').hidden)offlineModal(o);S.lastSeen=Date.now();}});
document.addEventListener('pointerdown',()=>{audio();Music.start();},{once:true});

window.__G={isTitanDay,nextTitanDay,titanState,titanTickets,titanAdTicket,titanGemTicket,TITAN_DAYS,WEAPONS,weaponOf,rankOf,effectPow,fireRate,ppGain,wpLvl,wpCost,buyWP,resetWP,LOGIN,loginState,claimLogin,loginModal,homeMoments,countUp,flyShards,ALLUP,UPG,JOKERS,GROUPS,startBuild,tickBuild,rushBuild,rushGems,adBuild,buySlot,unlockJoker,toggleEquip,buyJSlot,useJoker,jokerNeed,upById,lvlOf,upTime,upCost,enemyFor,dmgOf,THEMES,WORLDS,worldOf,worldInfo,weekTheme,get S(){return S;},set S(v){S=v;},get DAILY(){return DAILY;},DPOOL,get R(){return R;},CFG,ONB,WEEKLY,fresh,save,load,collect,accrue,idleCap,idleRate,newRun,startRun,runTick,runMove,snapTarget,buyTB,tbCost,tbLvl,spawnInterval,autoRate,powerMult,sparkMult,prestigeGain,doPrestige,challengeBoss,retreat,startTitan,endTitan,titanReady,offlineGains,applyOffline,offlineModal,claim,questView,standings,myRank,rename,reportMe,purchase,buyGemItem,buySkin,checkName,tierOf,fmt,refresh,renderTab,renderTB,renderActs,hooks,Music,fx,bfx,
  setTab(t){tab=t;renderTab();},get tab(){return tab;},get tutoStep(){return tutoStep;},set tutoStep(v){tutoStep=v;},tutoNext,get cell(){return cell;},setOnline,get netOK(){return netOK;},get LANG(){return LANG;},setLang,t,I18N,giftRoll,giftTake,giftOK,get gift(){return gift;},forceGift(){giftNext=1;giftT=1e9;giftTick(0);},refMult,sparkMult,snapBoard,growBoard,tickBuild,startBuild,NET,DEV,netHello,netSave,netTime,netTitan,netBoard,netName,netReport,track,get netReady(){return netReady;},get boardCache(){return boardCache;},set boardCache(v){boardCache=v;},get clockOff(){return clockOff;},netBoot,idHue,probeNet,xferCode,xferParse};
setLang(pickLang());load();const localSeen=S.lastSeen||0;accrue();roll();applyStatic();
{const o=offlineGains();startRun();renderTab();refresh();if(o&&(o.sparks>0||o.stages>0))offlineModal(o);S.lastSeen=Date.now();}
requestAnimationFrame(frame);
if(S.st.kills>0)setTimeout(()=>{if($('veil').hidden)loginModal();},400);
async function netBoot(){const r=await netHello(localSeen);if(!r.ok)return;if(r.used==='server'){accrue();roll();const o=offlineGains();startRun();renderJok();renderTab();refresh();if(o&&(o.sparks>0||o.stages>0)&&$('veil').hidden)offlineModal(o);S.lastSeen=Date.now();toast(t('net_restored'));}else netSave(true);track('open',{lang:LANG,stage:S.run.stage,best:S.bestStage});}
netBoot();
/* ----- bouton Retour Android (Capacitor) ----- */
try{const CA=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(CA&&CA.addListener)CA.addListener('backButton',()=>{if(!$('veil').hidden){closeModal();return;}if(tab!=='home'){goTab('home');return;}save();netSave(true);if(CA.minimizeApp)CA.minimizeApp();});}catch(e){}
})();
