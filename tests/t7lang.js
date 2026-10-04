const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();let ok=0,ko=0;
for(const lang of ['fr','en','es','de','pt','it']){
  const ctx=await b.newContext({viewport:{width:390,height:844},locale:lang,deviceScaleFactor:2});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/fusion/wrapped.html');await p.waitForTimeout(400);
  const got=await p.evaluate(()=>window.__G.LANG);
  await p.evaluate(()=>{const G=window.__G;document.getElementById('veil').hidden=true;G.S.st.tuto=3;G.tutoStep=0;document.getElementById('hint').hidden=true;G.S.bestStage=32;G.S.run.max=32;G.S.prestiges=2;G.S.pp=3;G.S.shards=5000;G.S.gems=100;G.S.jk.chameleon=1;G.S.equip=['chameleon'];G.CFG.titan.days=[0,1,2,3,4,5,6];G.startRun();G.refresh();});
  const texts=[];
  for(const tab of ['home','atelier','quests','clan','shop','profile']){await p.evaluate(t=>window.__G.setTab(t),t=tab);await p.waitForTimeout(150);
    if(tab==='atelier'){for(const g of ['start','auto','atk','grid','eco','jok','arm']){await p.evaluate(g=>{document.querySelector(`[data-grp="${g}"]`).click();},g);texts.push(await p.evaluate(()=>document.getElementById('panel').innerText));}}
    texts.push(await p.evaluate(()=>document.body.innerText));
    if(lang==='de'&&tab==='home'){await p.screenshot({path:'v7l-de-home.png'});}
    if(lang==='de'&&tab==='atelier'){await p.screenshot({path:'v7l-de-atelier.png'});}
  }
  // modales
  await p.evaluate(()=>window.__G.setTab('home'));await p.evaluate(()=>{document.getElementById('prest').click();});texts.push(await p.evaluate(()=>document.getElementById('modal').innerText));await p.evaluate(()=>document.querySelector('#modal [data-close]').click());
  await p.evaluate(()=>{document.getElementById('titan').click();});texts.push(await p.evaluate(()=>document.getElementById('modal').innerText));await p.evaluate(()=>document.querySelector('#modal [data-close]').click());
  await p.evaluate(()=>{const G=window.__G;G.S.run.srate=5;G.S.lastSeen=Date.now()-3600e3;G.offlineModal(G.offlineGains());});texts.push(await p.evaluate(()=>document.getElementById('modal').innerText));await p.evaluate(()=>document.getElementById('offOk').click());
  const all=texts.join('\n');
  const raw=all.match(/\b(u_|j_|tb_|q_|o\d+|at_|pr_|sh_|lg_|pre_|titan_|off_|net_|wp_|th\d_|g_|gd_|gq_|cl_)\w*/g)||[];
  const frLeak=lang!=='fr'&&/Étape|Réfraction|Atelier|Quêtes|Boutique|éclats|étincelles/.test(all);
  const nav=await p.evaluate(()=>[...document.querySelectorAll('.nav button')].map(b=>b.scrollWidth<=b.clientWidth+1).every(Boolean));
  const over=await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight);
  const res={lang,got,raw:raw.slice(0,5),frLeak,errs:errs.slice(0,2),nav,over};
  if(got===lang&&!raw.length&&!frLeak&&!errs.length&&nav&&over)ok++;else{ko++;console.log('KO',res);}
  await ctx.close();}
console.log(`langues : ${ok} OK, ${ko} KO`);await b.close();})();
