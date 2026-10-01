const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/fusion/wrapped.html');await p.waitForTimeout(500);
await p.evaluate(()=>{const G=window.__G;const S=G.S;for(const k of ['cadence','rang','eveil','brule','aura'])delete S.up[k];S.st.tuto=3;S.st.kills=40;S.run.stage=5;S.bestStage=8;G.save();});
await p.reload();await p.waitForTimeout(400);
const r=await p.evaluate(()=>{const G=window.__G;document.getElementById('veil').hidden=true;G.R.paused=false;const R=G.R;R.cells.fill(null);R.cells[0]={l:2};const hp=R.E.hp;for(let i=0;i<30;i++)G.runTick(0.1);return {hp,after:R.E.hp,fr:G.fireRate(),up:G.S.up.cadence,ft:R.cells[0]&&R.cells[0].ft};});
console.log(r,errs);await b.close();})();
