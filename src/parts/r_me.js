/* ================= gemme du joueur (accueil) ================= */
function drawMe(c,size,t,dt){
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,size,size);
  const s=size/190;c.scale(s,s);
  const tr=tierOf(S.maxLvl),h=skinHue(t),L=layers();
  fx.evolveT=Math.max(0,fx.evolveT-dt*0.8);
  // faisceau de lumière venu d'en haut
  const beam=c.createLinearGradient(0,0,0,150);beam.addColorStop(0,'rgba(255,228,170,.34)');beam.addColorStop(1,'rgba(255,228,170,0)');
  c.fillStyle=beam;c.beginPath();c.moveTo(80,0);c.lineTo(110,0);c.lineTo(150,150);c.lineTo(40,150);c.closePath();c.fill();
  // lumière décomposée au sol, à droite du socle
  c.save();c.globalCompositeOperation='lighter';
  SPEC.forEach((col,i)=>{c.fillStyle=`rgba(${col},.30)`;c.beginPath();c.moveTo(100,150);c.lineTo(190,142+i*7);c.lineTo(190,149+i*7);c.closePath();c.fill();});
  c.restore();
  // socle
  c.fillStyle='#080d22';c.beginPath();c.ellipse(95,154,52,13,0,0,7);c.fill();
  c.strokeStyle='rgba(255,228,170,.35)';c.lineWidth=2;c.beginPath();c.ellipse(95,151,52,13,0,Math.PI,0);c.stroke();
  // couches gagnées (mondes terminés) : éclats en orbite
  const bob=Math.sin(t*1.8)*4,ev=1+Math.sin(fx.evolveT*Math.PI)*0.3,R0=44*ev;
  for(let k=0;k<Math.min(2+L*2,10)*(L>0?1:0);k++){const a=t*(0.7+k*0.05)+k*2*Math.PI/Math.min(2+L*2,10);c.save();c.translate(95+Math.cos(a)*62,86+bob+Math.sin(a)*18);gemBody(c,6,4,(h+k*40)%360,80,55,t,k);c.restore();}
  c.save();c.translate(95,86+bob);c.rotate(Math.sin(t*0.6)*0.08);
  gemBody(c,R0,tr.sides||16,h,85,52,t,3,t*0.15);
  c.restore();
}
function drawFoeAt(c,size,t,E){
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,size,size);
  const h=WORLDS[E.th].h;c.fillStyle='rgba(6,3,22,.5)';c.beginPath();c.ellipse(size/2,size*0.86,size*0.3,size*0.06,0,0,7);c.fill();
  c.save();c.translate(size/2,size*0.5+Math.sin(t*2)*2);drawFoe(c,E.th,E.type,h,size*0.27,t,{hit:0,rage:0,blink:Math.sin(t*0.7)>0.97?-1:1,shieldL:0});c.restore();
}
function drawMini(cv2,sides,hue){const c=cv2.getContext('2d'),w=cv2.width;c.clearRect(0,0,w,w);c.save();c.translate(w/2,w/2);gemBody(c,w*0.4,sides||16,hue,80,52,0,1);c.restore();}
