/* ================= audio : musique générative + effets ================= */
let AC=null,musBus=null,sfxBus=null,delay=null;
function audio(){
  if(!S.settings.music&&!S.settings.sound)return null;
  try{
    if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();
      const comp=AC.createDynamicsCompressor();comp.connect(AC.destination);
      musBus=AC.createGain();musBus.gain.value=0.55;musBus.connect(comp);
      sfxBus=AC.createGain();sfxBus.gain.value=0.9;sfxBus.connect(comp);
      delay=AC.createDelay(1);delay.delayTime.value=0.375;const fb=AC.createGain();fb.gain.value=0.32;const wet=AC.createGain();wet.gain.value=0.35;
      delay.connect(fb).connect(delay);delay.connect(wet).connect(musBus);}
    if(AC.state==='suspended')AC.resume();
  }catch(e){AC=null;}
  return AC;
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
const PROG=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]; // la m – fa – do – sol
const PENTA=[0,3,5,7,10];
const Music={on:false,step:0,next:0,timer:null,int:0.15,target:0.15,
  start(){const a=audio();if(!a||!S.settings.music||this.on)return;this.on=true;this.next=a.currentTime+0.1;this.step=0;this.timer=setInterval(()=>this.sched(),25);},
  stop(){this.on=false;clearInterval(this.timer);},
  key(){return R&&R.mode==='level'?worldInfo(R.w).k:0;},
  sched(){if(!AC)return;const spb=60/100/2;while(this.next<AC.currentTime+0.15){this.play(this.step,this.next);this.next+=spb;this.step++;}this.int+=(this.target-this.int)*0.05;},
  play(s,t){
    const k=this.key(),bar=Math.floor(s/8)%4,ch=PROG[bar].map(n=>n+k),i=this.int,pos=s%8;
    if(pos===0){ch.forEach((n,j)=>{pad(mtof(n),t,2.4,0.018);pad(mtof(n)*1.004,t,2.4,0.014);});}
    if(pos%4===0)pluck(mtof(ch[0]-24),t,0.5,'sine',0.13);
    const arpOn=i>0.45?true:pos%2===0;
    if(arpOn){const pat=[0,1,2,1,2,0,1,2];const n=ch[pat[pos]]+12+(i>0.7&&pos>=4?12:0);pluck(mtof(n),t,0.28,'triangle',0.045,true);}
    if(i>0.6&&pos%2===1)hat(t,0.012+0.01*(i-0.6));
    if(i>0.85&&pos===6)pluck(mtof(ch[2]+24),t,0.6,'sine',0.03,true);
  }
};
function pad(f,t,d,g){const o=AC.createOscillator(),v=AC.createGain(),lp=AC.createBiquadFilter();o.type='sawtooth';o.frequency.value=f;lp.type='lowpass';lp.frequency.value=700+Music.int*900;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+0.5);v.gain.linearRampToValueAtTime(0,t+d);o.connect(lp).connect(v).connect(musBus);o.start(t);o.stop(t+d+0.05);}
function pluck(f,t,d,type,g,wet){const o=AC.createOscillator(),v=AC.createGain();o.type=type;o.frequency.value=f;v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(v);v.connect(musBus);if(wet)v.connect(delay);o.start(t);o.stop(t+d+0.05);}
let noiseBuf=null;
function hat(t,g){if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate*0.05,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}const s=AC.createBufferSource(),bp=AC.createBiquadFilter(),v=AC.createGain();s.buffer=noiseBuf;bp.type='highpass';bp.frequency.value=7000;v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(0.0001,t+0.05);s.connect(bp).connect(v).connect(musBus);s.start(t);}
function tone(f,d,type,g,delayS=0){const a=audio();if(!a||!S.settings.sound)return;const t=a.currentTime+delayS,o=a.createOscillator(),v=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(v).connect(sfxBus);o.start(t);o.stop(t+d+0.02);}
const sfx={
  merge(c){const k=Music.key(),deg=PENTA[(c-1)%5],oct=Math.floor((c-1)/5);const f=mtof(69+k+deg+12*Math.min(oct,2));tone(f,0.16,'triangle',0.13);tone(f*2,0.1,'sine',0.04);},
  click(){const k=Music.key();tone(mtof(81+k),0.045,'triangle',0.06);tone(mtof(93+k),0.06,'sine',0.03,0.02);},
  buy(){tone(660,0.08,'square',0.05);tone(990,0.1,'square',0.04,0.06);},
  chord(){[0,4,7,12].forEach((s,i)=>tone(mtof(69+Music.key()+s),0.35,'triangle',0.09,i*0.07));},
  win(){[0,4,7,12,16,19,24].forEach((s,i)=>tone(mtof(69+Music.key()+s),0.4,'triangle',0.09,i*0.06));},
  low(){tone(80,0.7,'sawtooth',0.12);},
  boom(){tone(60,0.4,'square',0.1);tone(120,0.2,'sawtooth',0.06);},
  tick(){tone(1200,0.05,'square',0.05);},
};
function vib(p){if(!S.settings.fx)return;try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}}
