import re
src=open('prisme-v6.html',encoding='utf8').read().split('\n')
L=lambda a,b:'\n'.join(src[a-1:b])
sp='parts/'
rd=lambda f:open(f,encoding='utf8').read()
foe=rd(sp+'r_foe.js').split('function drawEnemy')[0]
me=rd(sp+'r_me.js').replace('tierOf(S.maxLvl)','tierOf(S.bestStage)').replace('const h=WORLDS[E.th].h;','const h=E.type===\'titan\'?WORLDS[E.th].h:worldInfo(worldOf(E.stage)).h;')
extra_css='''.oc{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,var(--slab-hi),var(--edge));box-shadow:inset 0 0 0 3px var(--line),0 4px 0 var(--edge);transition:transform 70ms ease-out}
.oc .i{width:32px;height:32px}
@keyframes hot{to{box-shadow:inset 0 2px 0 rgba(255,255,255,.28),0 4px 0 var(--beam-edge),0 0 26px rgba(255,200,87,.9)}}
.badge{position:absolute;top:6px;right:calc(50% - 24px);width:13px;height:13px;border-radius:50%;background:var(--s1);box-shadow:0 0 0 3px var(--night)}
.ptier{color:var(--mist);font-size:13px;margin-top:-4px;text-align:center}
'''
head=L(1,58).replace('partie = arène + plateau-écrin + outils ronds.','un seul écran : arène + plateau-écrin + boosters.').replace('Accueil = une scène (faisceau de lumière, gemme du joueur, route des niveaux, combat, trois orbes) ;','Le jeu tourne en continu ;')
css=head+'\n'+extra_css+L(110,237)+'\n'+L(286,310)+'\n'+L(318,318)+'\n'+rd('v7_css.css')+'</style>\n\n'
sprite=L(321,359)
body=rd('v7_body.html')
ui=rd('v7_ui.js').replace('//__FOE__',foe).replace('//__ME__',me)
js='<script>\n(()=>{\n"use strict";\n'+rd('v7_i18n.js')+'\n'+rd('v7_i18n_en.js')+rd('v7_i18n_es.js')+rd('v7_i18n_de.js')+rd('v7_i18n_pt.js')+rd('v7_i18n_it.js')+'\n'+rd(sp+'r_util.js')+'\n'+rd('v7_engine.js')+'\n'+rd('v7_net.js')+'\n'+rd(sp+'r_audio.js')+'\n'+rd(sp+'r_gems.js')+'\n'+ui+'</script>\n'
out=css+sprite+'\n\n'+body+'\n'+js
open('prisme.html','w',encoding='utf8').write(out)
open('wrapped.html','w',encoding='utf8').write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+out.replace('</style>','</style></head><body>',1)+'</body></html>')
print(len(out.split('\n')))

# ---- fonction serveur (Supabase Edge) : même moteur, même noyau ----
import json as _json
_engine=''.join(rd(f)+'\n' for f in ['v7_i18n_server.js',sp+'r_util.js','v7_engine.js'])
import subprocess as _sp
def _min(code,extra=''):
    p=_sp.run(['npx','-y','terser','-c','passes=2,unused=false','--comments','false'],input=code.encode(),capture_output=True);return p.stdout.decode() if p.returncode==0 and p.stdout else code
_edge=rd('edge_pf_act.ts')
open('pf_server.js','w',encoding='utf8').write(_min(rd('pf_core.js'))+'\nmodule.exports.ENGINE_SRC='+_json.dumps(_min(_engine),ensure_ascii=False)+';\n')
import os as _os
_os.makedirs('edge/pf-act',exist_ok=True);open('edge/pf-act/index.ts','w',encoding='utf8').write(_edge)
