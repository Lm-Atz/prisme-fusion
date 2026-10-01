/* ================= pièces en verre taillé (pièce de référence + famille) ================= */
const HUES=[196,262,328,18,46,148,178,228,292,352,84,166];
const hueOf=l=>HUES[(l-1)%HUES.length];
const SPEC=['255,94,126','255,179,71','255,230,109','108,240,194','94,200,255','157,123,255'];
function poly(c,x,y,r,sides,rot){c.beginPath();const n=sides||16;for(let k=0;k<n;k++){const a=rot+k*2*Math.PI/n-Math.PI/2,px=x+r*Math.cos(a),py=y+r*Math.sin(a);k?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}
function vtx(r,n,rot){const p=[];for(let k=0;k<n;k++){const a=rot+k*2*Math.PI/n-Math.PI/2;p.push([r*Math.cos(a),r*Math.sin(a)]);}return p;}
function spark(c,x,y,s){
  c.save();c.translate(x,y);c.globalCompositeOperation='lighter';
  SPEC.slice(0,4).forEach((col,i)=>{const o=(i-1.5)*0.7;c.strokeStyle=`rgba(${col},.6)`;c.lineWidth=1.3;c.beginPath();c.moveTo(-s+o,o);c.lineTo(s+o,o);c.moveTo(o,-s+o);c.lineTo(o,s+o);c.stroke();});
  c.fillStyle='#fff';c.beginPath();c.arc(0,0,s*0.2,0,7);c.fill();c.restore();
}
/* Une gemme : couronne de facettes éclairées en haut à gauche, table claire, contour sombre, reflet, étincelle spectrale. */
function gemBody(c,r,n,h,sat,L0,t,seed,rot=0){
  const out=vtx(r,n,rot),inn=vtx(r*0.54,n,rot),LA=-2.35;
  for(let k=0;k<n;k++){const a=out[k],b=out[(k+1)%n],ia=inn[k],ib=inn[(k+1)%n];
    const mid=Math.atan2((a[1]+b[1])/2,(a[0]+b[0])/2),sh=0.5+0.5*Math.cos(mid-LA);
    c.fillStyle=`hsl(${h} ${sat}% ${L0-20+sh*36}%)`;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(ib[0],ib[1]);c.lineTo(ia[0],ia[1]);c.closePath();c.fill();}
  const g=c.createLinearGradient(-r*.5,-r*.5,r*.45,r*.5);g.addColorStop(0,`hsl(${h} ${sat}% ${Math.min(92,L0+30)}%)`);g.addColorStop(1,`hsl(${h} ${sat}% ${L0+2}%)`);
  c.fillStyle=g;c.beginPath();inn.forEach((p,k)=>k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();
  c.lineWidth=1;c.strokeStyle=`hsla(${h},90%,92%,.32)`;c.beginPath();for(let k=0;k<n;k++){c.moveTo(out[k][0],out[k][1]);c.lineTo(inn[k][0],inn[k][1]);}c.stroke();
  c.beginPath();out.forEach((p,k)=>k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.lineWidth=Math.max(1.6,r*0.07);c.strokeStyle=`hsl(${h} 70% 16%)`;c.stroke();
  c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.ellipse(-r*.2,-r*.25,r*.17,r*.07,-0.6,0,7);c.fill();
  const tw=0.5+0.5*Math.sin(t*2.6+seed*1.7);if(tw>0.55){const p=out[(seed*3)%n];spark(c,p[0]*0.92,p[1]*0.92,r*0.22*tw);}
}
function drawGem(c,x,y,r,l,sx,sy,gold,t){
  const n=3+((l-1)%8),tier=Math.floor((l-1)/8),h=gold?44:hueOf(l);
  c.save();c.translate(x,y);
  c.fillStyle='rgba(6,3,22,.5)';c.beginPath();c.ellipse(0,r*0.95,r*0.78*sx,r*0.16,0,0,7);c.fill();
  c.scale(sx,sy);
  for(let k=0;k<tier;k++){c.beginPath();c.arc(0,0,r*1.12+k*5,0,7);c.lineWidth=3;c.strokeStyle=k%2?`hsla(${h},70%,80%,.75)`:'rgba(255,226,160,.85)';c.stroke();}
  gemBody(c,r,n,h,gold?95:80,gold?55:50,t,l);
  if(gold){c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,220,120,${0.25+0.2*Math.sin(t*5)})`;c.beginPath();c.arc(0,0,r*0.5,0,7);c.fill();c.globalCompositeOperation='source-over';}
  c.font=`${Math.round(r*0.66)}px "Lilita One",system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';
  c.lineJoin='round';c.lineWidth=Math.max(2.5,r*0.13);c.strokeStyle=`hsl(${h} 70% 16%)`;c.strokeText(l,0,r*0.05);c.fillStyle='#fff';c.fillText(l,0,r*0.05);
  c.restore();
}
function drawSpecial(c,x,y,r,k,t,sc=1){
  c.save();c.translate(x,y);
  c.fillStyle='rgba(6,3,22,.5)';c.beginPath();c.ellipse(0,r*0.95,r*0.78,r*0.16,0,0,7);c.fill();
  c.scale(sc,sc);
  if(k==='lock'){
    const g=c.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#9aa0d6');g.addColorStop(1,'#3b3e73');
    c.fillStyle=g;c.beginPath();c.roundRect(-r*.92,-r*.92,r*1.84,r*1.84,r*.3);c.fill();c.lineWidth=2;c.strokeStyle='#1c1d40';c.stroke();
    c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=1.2;c.beginPath();c.moveTo(-r*.9,-r*.15);c.lineTo(-r*.15,-r*.9);c.moveTo(r*.25,r*.9);c.lineTo(r*.9,r*.25);c.stroke();
    c.fillStyle='#1c1d40';c.beginPath();c.roundRect(-r*.34,-r*.02,r*.68,r*.5,r*.1);c.fill();
    c.strokeStyle='#1c1d40';c.lineWidth=r*.15;c.beginPath();c.arc(0,-r*.04,r*.22,Math.PI,0);c.stroke();
  }else if(k==='bomb'){
    const p=0.5+0.5*Math.sin(t*9);
    gemBody(c,r*0.92,8,350,30,22,t,5);
    c.globalCompositeOperation='lighter';const g=c.createRadialGradient(0,0,0,0,0,r*.7);g.addColorStop(0,`rgba(255,90,110,${0.5+0.4*p})`);g.addColorStop(1,'rgba(255,90,110,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,r*.7,0,7);c.fill();c.globalCompositeOperation='source-over';
    spark(c,r*.1,-r*1.0,r*(0.28+0.12*p));
  }else if(k==='fog'){
    gemBody(c,r,6,240,10,34,t,2);
    c.font=`${Math.round(r*0.8)}px "Lilita One",system-ui`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=4;c.strokeStyle='#1c1d40';c.strokeText('?',0,2);c.fillStyle='#e8e6ff';c.fillText('?',0,2);
  }else if(k==='joker'){
    c.save();c.rotate(Math.sin(t*1.6)*0.25);const out=vtx(r,3,0);
    SPEC.forEach((col,i)=>{const a=out[i%3],b=out[(i+1)%3];c.fillStyle=`rgb(${col})`;c.beginPath();c.moveTo(0,0);
      const f0=i<3?0:0.5,f1=i<3?0.5:1;c.lineTo(a[0]+(b[0]-a[0])*f0,a[1]+(b[1]-a[1])*f0);c.lineTo(a[0]+(b[0]-a[0])*f1,a[1]+(b[1]-a[1])*f1);c.closePath();c.fill();});
    poly(c,0,0,r,3,0);c.lineWidth=2.5;c.strokeStyle='#fff';c.stroke();c.restore();
    c.font=`${Math.round(r*0.5)}px "Lilita One",system-ui`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=4;c.strokeStyle='#1c1d40';c.strokeText('≤'+jokerCap(),0,r*.2);c.fillStyle='#fff';c.fillText('≤'+jokerCap(),0,r*.2);
  }
  c.restore();
}
