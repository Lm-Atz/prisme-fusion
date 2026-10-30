// v13 : boutique en 4 onglets — navigation, contenu, raccourcis « il manque des gemmes », langues
const {pfApply}=require('./pf_core.js');const src=require('./pf_src.js')();
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
let ok=0,ko=0;const T=(n,c,x)=>{if(c)ok++;else{ko++;console.log('KO',n,x===undefined?'':JSON.stringify(x));}};
const html=fs.readFileSync('/home/claude/fusion/wrapped.html');const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end(html);}).listen(8771);
(async()=>{const b=await chromium.launch();const T0=Date.UTC(2026,10,4,12);const SK=T0-Date.now();const now=()=>Date.now()+SK;const DB={};
 const c=await b.newContext({viewport:{width:360,height:740},locale:'fr-FR',timezoneId:'Europe/Paris'});
 await c.route('https://atmrbzkcneotleuoapdp.supabase.co/**',async route=>{const q=route.request();let a={};try{a=q.postDataJSON()||{};}catch(e){}let body=null;
   if(q.url().includes('pf_time'))body={now:now()};else if(q.url().includes('pf-act')){let p=DB[a.id];if(!p)p=DB[a.id]={state:null};const r=pfApply(src,p.state,a,now(),false);p.state=r.state;body={ok:true,now:now(),state:r.state,result:r.result,anomalies:r.anomalies,league:null,effects:[]};}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:T0});await p.goto('http://localhost:8771/');await p.waitForTimeout(2500);
 const id=await p.evaluate(()=>window.__G.DEV.id);{const st=DB[id].state;st.bestStage=40;st.run.stage=40;st.run.max=40;st.maxStage=40;st.st.tuto=3;st.gems=30;st.srvAt=now();st.simBy='x';}
 await p.evaluate(async()=>{await window.__G.actAsync('sync');document.getElementById('veil').hidden=true;});
 const ev=f=>p.evaluate(f);const W=ms=>p.waitForTimeout(ms);const click=async sel=>{await p.evaluate(s=>document.querySelector(s).click(),sel);await W(250);};
 // 1. ouverture par l'onglet du bas : Offres
 await ev(()=>window.__G.setTab('shop'));await W(300);
 let r=await ev(()=>({tabs:[...document.querySelectorAll('#panel .shtabs [data-shpane]')].map(b=>b.dataset.shpane+':'+b.getAttribute('aria-pressed')),bal:document.querySelector('#panel .gbal').innerText.trim(),badge:!!document.querySelector('#panel .shtabs [data-shpane="offers"] .badge'),gift:!!document.querySelector('#panel [data-gem], #panel #shopGift, #panel .gift-day')||/Cadeau du jour/.test(document.getElementById('panel').innerText)}));
 T('4 onglets, Offres ouvert par défaut',r.tabs.join()==='offers:true,gems:false,bonus:false,skins:false',r.tabs);T('solde de gemmes affiché',r.bal==='30',r.bal);T('pastille sur Offres (cadeau du jour à prendre)',r.badge);T('Offres : cadeau du jour présent',r.gift);
 r=await ev(()=>{const t=document.getElementById('panel').innerText;return {pass:/Pass de saison/.test(t),week:/Offre de la semaine/.test(t),start:/Pack de départ/.test(t),loot:/Trésor/.test(t),chest:/Coffre/.test(t),noads:/pubs/.test(t),gems:document.querySelectorAll('#panel [data-offer^="g"]').length,skins:document.querySelectorAll('#panel [data-skin]').length,h:document.getElementById('panel').scrollHeight};});
 T('Offres : pass, offre de la semaine, départ, trésor, coffre, pubs',r.pass&&r.week&&r.start&&r.loot&&r.chest&&r.noads,r);T('Offres : ni packs de gemmes ni couleurs',r.gems===0&&r.skins===0,r);T('Offres : moins de 1,5 écran',r.h<740*1.5,r.h);
 // 2. Gemmes
 await click('#panel .shtabs [data-shpane="gems"]');
 r=await ev(()=>({n:document.querySelectorAll('#panel .gtiles .gtile[data-offer^="g"]').length,best:document.querySelectorAll('#panel .gtile.best').length,pop:document.querySelectorAll('#panel .gtile.pop').length,x2:!!document.querySelector('#panel .x2bar'),h:document.getElementById('panel').scrollHeight,cw:document.getElementById('panel').clientHeight,price:getComputedStyle(document.querySelector('#panel .gtile.best .b')).color}));
 T('Gemmes : 6 tuiles, 1 meilleur rapport, 1 populaire, barre ×2',r.n===6&&r.best===1&&r.pop===1&&r.x2,r);T('Gemmes : tient sur un écran',r.h<=r.cw+40,r);T('Gemmes : prix du meilleur pack lisible',r.price==='rgb(59, 32, 0)',r.price);
 await click('#panel .gtile[data-offer="g600"]');r=await ev(()=>document.getElementById('modal').innerText);T('Gemmes : confirmation 4,99 €',/4,99/.test(r),r);
 await click('#modal [data-confirm]');await W(1200);r=await ev(()=>({g:window.__G.S.gems,bal:document.querySelector('#panel .gbal')&&document.querySelector('#panel .gbal').innerText.trim(),srv:null}));
 T('Gemmes : 600 ×2 au 1er achat = 1230, solde à jour, serveur d\'accord',r.g===1230&&r.bal.replace(/\s/g,'')==='1230'&&DB[id].state.gems===1230,{r,srv:DB[id].state.gems});
 r=await ev(()=>({x2:!!document.querySelector('#panel .x2bar'),bon:document.querySelectorAll('#panel .gtile .bon:not(.nob)').length}));T('après le 1er achat : barre ×2 retirée, bonus % affichés',!r.x2&&r.bon===5,r);
 // 3. Bonus : boutons en gemmes, raccourci si pas assez
 await ev(()=>{window.__G.S.gems=10;});await click('#panel .shtabs [data-shpane="bonus"]');
 r=await ev(()=>({short:document.querySelectorAll('#panel [data-nogems]').length,cols:getComputedStyle(document.querySelector('#panel .shbonus .gitems')).gridTemplateColumns.split(' ').length,h:document.getElementById('panel').scrollHeight}));
 T('Bonus : 3 colonnes, achats trop chers marqués (5)',r.cols===3&&r.short===5,r);T('Bonus : à peine plus d\'un écran',r.h<740*1.25,r.h);
 await click('#panel [data-nogems]');r=await ev(()=>document.querySelector('#panel .shtabs [aria-pressed="true"]').dataset.shpane);T('Bonus : pas assez de gemmes → onglet Gemmes',r==='gems',r);
 await ev(()=>{window.__G.S.gems=1230;});await click('#panel .shtabs [data-shpane="bonus"]');r=await ev(()=>({ok:document.querySelectorAll('#panel [data-gem="boost"],#panel [data-pack]').length,short:document.querySelectorAll('#panel [data-nogems]').length}));T('Bonus : assez de gemmes → boutons actifs',r.ok===5&&r.short===0,r);
 // 4. Couleurs ; achat trop cher → Gemmes
 await click('#panel .shtabs [data-shpane="skins"]');r=await ev(()=>({sk:document.querySelectorAll('#panel [data-skin]').length,offers:document.querySelectorAll('#panel [data-offer]').length}));T('Couleurs : couleurs seules',r.sk>=10&&r.offers===0,r);
 await ev(()=>{window.__G.S.gems=0;});await click('#panel [data-skin="obsidienne"]');r=await ev(()=>document.querySelector('#panel .shtabs [aria-pressed="true"]').dataset.shpane);T('Couleurs : trop chère → onglet Gemmes',r==='gems',r);
 // 5. raccourcis depuis le jeu : solde en haut de l'écran, et pass (palier trop cher)
 await ev(()=>window.__G.setTab('home'));await W(200);await click('#pillG');r=await ev(()=>({tab:window.__G.tab,pane:document.querySelector('#panel .shtabs [aria-pressed="true"]').dataset.shpane}));T('solde de l\'écran de jeu → boutique, onglet Gemmes',r.pane==='gems',r);
 await click('#panel .shtabs [data-shpane="offers"]');await ev(()=>window.__G.setTab('atelier'));await W(200);await ev(()=>window.__G.setTab('shop'));await W(200);
 r=await ev(()=>document.querySelector('#panel .shtabs [aria-pressed="true"]').dataset.shpane);T('l\'onglet choisi est gardé en revenant',r==='offers',r);
 // 6. offres déjà acquises retirées
 await ev(()=>{window.__G.S.noAds=true;window.__G.renderTab();});r=await ev(()=>!/Supprimer les pubs/.test(document.getElementById('panel').innerText));T('offre déjà acquise retirée de la vitrine',r);
 // 7. le défilement est gardé par onglet après un achat
 await click('#panel .shtabs [data-shpane="skins"]');await ev(()=>{document.getElementById('panel').scrollTop=120;window.__G.renderTab();});r=await ev(()=>document.getElementById('panel').scrollTop);T('rafraîchissement : la page ne remonte pas',r>=100,r);
 // 8. langues : libellés courts, rien ne déborde
 for(const L of ['fr','en','de','es','it','pt']){r=await ev(L=>{window.__G.setLang(L);window.__G.renderTab();return [...document.querySelectorAll('#panel .shtabs button')].map(b=>({t:b.innerText.trim(),o:b.scrollWidth>b.clientWidth+1}));},L);
  T('langue '+L+' : onglets traduits et sans débordement',r.length===4&&r.every(x=>x.t&&!/shp_/.test(x.t)&&!x.o),r);}
 T('aucune erreur JS',errs.length===0,errs);
 console.log(`t7shop : ${ok} OK, ${ko} KO`);await b.close();srv.close();process.exit(ko?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1);});
