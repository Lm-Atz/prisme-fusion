/* ================= langues ================= */
/* Clés en français (langue de référence). {x} = variable. Les pluriels simples passent par {n|s} : « s » ajouté si n>1. */
const I18N={};
I18N.fr={
  _name:'Français',_units:['k','M','Md','Bn'],_days:['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],_dur:['s','min','h','j'],_adj:['Cobalt','Fulgurant','Pourpre','Stellaire','Vif','Polaire','Ardent','Lunaire','Électrique','Sombre','Radieux','Quantique'],_noun:['Hexagone','Prisme','Pentagone','Comète','Spirale','Vecteur','Nova','Pulsar','Octogone','Photon','Orbite','Fractale'],
  // monnaies, génériques
  sparks:'étincelles',shards:'éclats',gems:'gemmes',stage:'Étape {n}',level:'niveau',lvl:'niv. {n}',max:'Max',close:'Fermer',later:'Plus tard',cancel:'Annuler',
  ok:'Récupérer',fight:'Combattre',retry:'Réessayer',wait:'Attendre',ad:'Publicité',
  // navigation
  nav_home:'Jeu',nav_atelier:'Atelier',nav_quests:'Quêtes',nav_league:'Ligue',nav_shop:'Boutique',profile:'Profil',
  // thèmes
  th0_mob:'Fragment',th0_mini:'Gardien du prisme',th0_boss:'Le Prisme brisé',th0_titan:'Titan de verre',th0_atk:'pose des blocs',
  th1_mob:'Braise',th1_mini:'Gardien des cendres',th1_boss:'La Forge rouge',th1_titan:'Titan de magma',th1_atk:'brûle tes petites gemmes',
  th2_mob:'Remous',th2_mini:'Gardien des abysses',th2_boss:"L'Œil noir",th2_titan:'Titan des profondeurs',th2_atk:'cache le niveau de tes gemmes',
  th3_mob:'Lueur',th3_mini:'Gardien du ciel',th3_boss:'La Sentinelle',th3_titan:"Titan d'aurore",th3_atk:'se soigne',
  th4_mob:'Reflet',th4_mini:'Gardien des miroirs',th4_boss:'Le Kaléidoscope',th4_titan:'Titan-miroir',th4_atk:'mélange et affaiblit tes gemmes',
  w0:'Néon',w1:'Magma',w2:'Abysses',w3:'Aurore',w4:'Prisme',
  type_mob:'Monstre',type_mini:'Gardien',type_boss:'Boss',type_titan:'Titan de la semaine',
  tier0:'Triangle',tier1:'Carré',tier2:'Pentagone',tier3:'Hexagone',tier4:'Heptagone',tier5:'Octogone',tier6:'Ennéagone',tier7:'Décagone',tier8:'Hendécagone',tier9:'Dodécagone',circle:'Cercle',
  // armes
  wp_tri:'Triangle',wp_tri_fx:'Rafale',wp_tri_d:'Tire vite, petits coups',
  wp_sq:'Carré',wp_sq_fx:'Perce-bouclier',wp_sq_d:'Ses tirs traversent le bouclier des boss',
  wp_pen:'Pentagone',wp_pen_fx:'Brûlure',wp_pen_d:"Enflamme l'ennemi : dégâts sur la durée",
  wp_hex:'Hexagone',wp_hex_fx:'Éclair',wp_hex_d:'Chaque tir charge tes jokers',
  wp_hep:'Heptagone',wp_hep_fx:'Critique',wp_hep_d:'Un tir sur quatre fait ×3',
  wp_oct:'Octogone',wp_oct_fx:'Gel',wp_oct_d:'Ses tirs rallongent le chrono du boss',
  wp_star:'Étoile',wp_star_fx:'Moisson',wp_star_d:'Chaque tir rapporte des étincelles',
  wp_dia:'Losange',wp_dia_fx:'Aura',wp_dia_d:'Renforce les gemmes voisines',
  // familles de recherche
  g_start:'Départ',g_start_d:'Commencer chaque partie avec des boosters déjà pris.',
  g_auto:'Auto',g_auto_d:'Retirer un geste à chaque palier.',
  g_atk:'Attaque',g_atk_d:'Frapper plus fort.',
  g_grid:'Plateau',g_grid_d:'Des gemmes plus fortes, plus souvent.',
  g_eco:'Économie',g_eco_d:"Plus d'étincelles, plus vite, plus longtemps.",
  g_jok:'Jokers',g_jok_d:'Débloquer, équiper et renforcer tes pouvoirs.',
  g_arm:'Armes',g_arm_d:'Chaque forme de gemme est une arme. Tes points de réfraction les renforcent.',
  // recherches (t = titre, d = description du niveau suivant)
  u_st_cad:'Vitesse de départ',u_st_cad_d:'Vitesse niveau {n} dès le début',
  u_st_auto:'Auto de départ',u_st_auto_d:'Fusion automatique niveau {n} dès le début',
  u_st_power:'Force de départ',u_st_power_d:'Force niveau {n} dès le début',
  u_st_birth:'Niveau de départ',u_st_birth_d:'Les gemmes naissent au niveau {n} dès le début',
  u_st_spark:'Gain de départ',u_st_spark_d:"Gain d'étincelles niveau {n} dès le début",
  u_st_bank:'Trésor de départ',u_st_bank_d:'{n} étincelles offertes à chaque partie',
  u_au_merge:'Fusion auto renforcée',u_au_merge_d:'Le booster Auto fusionne {n} % plus vite',
  u_au_buy:'Achat automatique',u_au_buy_d:'Achète un booster toutes les {n} s',u_au_buy_d0:'Achète le booster le moins cher tout seul',
  u_au_joker:'Jokers automatiques',u_au_joker_d:"Déclenche tes jokers dès qu'ils sont chargés",
  u_au_boss:'Défi automatique',u_au_boss_d:'Redéfie un boss qui a fui après {n} s',
  u_au_prestige:'Réfraction automatique',u_au_prestige_d:"Réfraction seule dès que le trésor de départ atteint {n} % de tes étincelles",
  u_au_exped:'Expédition',u_au_exped_d:'Tes gemmes avancent les étapes hors-ligne pendant {n} h',
  u_au_titan:'Titan automatique',u_au_titan_d:'Le Titan est défié seul et tu as {n} ticket{n|s} gratuit{n|s} de plus',
  u_power:'Puissance',u_power_d:'Dégâts ×{n} (+10 % par niveau)',
  u_crit:'Coup critique',u_crit_d:"{n} % de chance qu'un tir fasse ×3",
  u_combo:'Élan',u_combo_d:'Chaque fusion manuelle enchaînée accélère les tirs de +{n} % pendant 3 s',
  u_bossdmg:'Tueur de boss',u_bossdmg_d:'Dégâts ×{n} contre les boss',
  u_pierce:'Perce-bouclier',u_pierce_d:'Le bouclier des boss laisse passer {n} niveau{n|x} de gemme de plus',
  u_lucky:'Étincelle',u_lucky_d:'{n} % de chance de naître un niveau au-dessus',
  u_chain:'Réaction en chaîne',u_chain_d:"{n} % de chance qu'une fusion en déclenche une autre",
  u_gold:"Chasseur d'or",u_gold_d:"+{n} % de gemmes dorées, qui rapportent des étincelles",
  u_board:'Grand plateau',u_board_d0:'Plateau 5 × 5 au lieu de 4 × 4',u_board_d1:'Plateau 6 × 6',
  u_sursis:'Sursis',u_sursis_d:"Plateau plein : {n} petites gemmes se recyclent au lieu d'une",
  u_spark:'Étincelles',u_spark_d:'Étincelles ×{n} (+10 % par niveau)',
  u_loot:'Butin',u_loot_d:"+{n} % de trésor de départ à la réfraction",
  u_prod:'Forge passive',u_prod_d:"Production : {n} étincelles / h",
  u_cap:'Réserve',u_cap_d:'La forge stocke {n} h de production',
  u_off:'Veille',u_off_d:"Les étincelles s'accumulent {n} h hors-ligne",
  u_killspark:'Trophées',u_killspark_d:"+{n} % d'étincelles par ennemi vaincu",
  u_catal:'Catalyseur',u_catal_d:'Tes jokers se chargent {n} % plus vite',
  u_cadence:'Cadence de tir',u_cadence_d:'Toutes les gemmes tirent {n} % plus vite',
  u_rang:'Maîtrise',u_rang_d:'Effets des armes +{n} %',
  u_eveil:'Éveil',u_eveil_d:'+{n} % de points de réfraction à chaque réfraction',
  u_brule:'Brûlure tenace',u_brule_d:'La brûlure dure {n} s',
  u_aura:'Grande aura',u_aura_d:"L'aura du losange donne +{n} %",
  // jokers
  j_chameleon:'Caméléon',j_chameleon_d:"Pose {p} sur le plateau : il fait monter d'un niveau n'importe quelle gemme, jusqu'à {n} niveau{n|x} au-dessus de tes gemmes de départ.",j_one:'1 joker',j_two:'2 jokers',
  j_magnet:'Aimant',j_magnet_d:"Fusionne d'un coup jusqu'à {n} paires de gemmes identiques.",
  j_surge:'Surcharge',j_surge_d:'Dégâts ×2 pendant {n} s.',
  j_frost:'Gel',j_frost_d:'Gèle le boss {n} s.',
  j_prism:'Prisme',j_prism_d:"Fait monter d'un niveau tes {n} plus petites gemmes.",
  j_meteor:'Météore',j_meteor_d:'Frappe comme une gemme deux niveaux au-dessus de ta plus grosse{x}.',
  j_breaker:'Brise-bouclier',j_breaker_d:"Désactive le bouclier d'un boss pendant {n} s.",
  j_lock:"Se débloque à l'étape {n}.",j_charge:'Se charge en {n} fusions',j_lvl:'niveau {n} sur 5',j_max:'Niveau maximum',j_equip:'Équiper',j_unequip:'Retirer',j_lvlbtn:'Niveau {n}',
  j_ready:'Prêt',j_notready:'Pas encore chargé : fusionne pour le remplir',j_unlocked:'{n} débloqué',j_full:'Tous les emplacements de joker sont pris',j_slots:'{n} joker{n|s} équipé{n|s} sur {m}',
  // boosters temporaires
  tb_cad:'Vitesse',tb_cad_d:'Les gemmes apparaissent plus souvent',tb_cad_n:'une gemme toutes les {n} s',
  tb_birth:'Niveau',tb_birth_d:'Les gemmes naissent plus grosses',tb_birth_n:'naissance au niveau {n}',
  tb_auto:'Auto',tb_auto_d:'Le plateau fusionne tout seul',tb_auto_n:'{n} fusion / s',tb_auto_0:'inactif',
  tb_power:'Force',tb_power_d:'Tous les tirs font plus mal',tb_power_n:'dégâts ×{n}',
  tb_spark:'Gain',tb_spark_d:"Plus d'étincelles par tir et par ennemi",tb_spark_n:'étincelles ×{n}',
  tb_aria:'{t} niveau {l}, coût {c} étincelles. {d}',tb_aria_max:'{t} niveau {l}, maximum. {d}',tb_lvl:'Niveau {n} : {v}.',tb_note:'Booster de partie : remis à zéro à la réfraction. La recherche « {t} de départ » le garde.',tb_buy:'{c} : acheter',
  // quêtes
  q_kill:'Vaincre {n} ennemis',q_merge:'Fusionner {n} fois',q_ad:'Regarder 1 publicité récompensée',q_boss1:'Vaincre 1 boss',q_tb:'Acheter {n} boosters',q_forge:'Récolter la forge',q_jok3:'Utiliser 3 jokers',q_combo:'Réussir un combo ×{n} à la main',q_pre1:'Faire une réfraction',q_bonus:'Bonus : toutes les quêtes du jour',
  q_titan4:'Affronter le Titan 4 fois',q_top10:'Être dans le top 10 de ta ligue',q_pre3:'Faire 3 réfractions',
  o1:'Fusionner 10 gemmes à la main',o2:'Vaincre 3 ennemis',o3:'Acheter un booster de partie',o4:"Atteindre l'étape {n}",o5:"Lancer une recherche à l'Atelier",o6:'Vaincre le Gardien du prisme',o7:'Récolter la forge',o9:'Vaincre ton premier boss',o10:'Faire ta première réfraction',o11:'Terminer {n} recherches',o12:'Acheter le booster Auto',o13:'Affronter le Titan',o14:'Débloquer ton premier joker',o15:'Réussir un combo ×10 à la main',o17:'Faire {n} réfractions',o18:'Monter Force de départ au niveau 5',o20:'Jouer {n} jours différents',o23:"Débloquer l'achat automatique",o24:'Utiliser 15 jokers',o26:'Vaincre {n} boss',o29:'Débloquer {n} jokers',o30:'Infliger {n} de dégâts au Titan en une fois',o31:'Débloquer les jokers automatiques',o37:"Débloquer l'Expédition",o38:'Monter un joker au niveau 3',o42:'Débloquer la réfraction automatique',
  quests_title:'Quêtes',quests_sub:'Touche une quête terminée pour récupérer sa récompense.',quests_onb:'Premiers pas',quests_of:'{a} sur {b}',quests_today:"Aujourd'hui",quests_new:'Nouvelles dans {t}',quests_week:'Cette semaine',quests_monday:'Renouvelées lundi',quests_cal:'Calendrier',quests_claim:'Récupérer',quests_got:'Reçu',quests_reward:'Récompense reçue',
  login_day:'Jour {n}',login_title:'Jour {n} sur 7',login_sub:'Reviens chaque jour : le septième offre un joker.',login_go:'Récupérer le jour {n}',login_done:'Récompense du jour reçue. Reviens demain pour le jour {n}.',login_got:'Récompense du jour reçue',login_joker:'Joker',boost_h:'×2 {n} h',
  // atelier
  at_title:'Atelier',at_bal:"étincelles disponibles",at_sub:"Des recherches définitives, payées en étincelles. Chaque Réfraction multiplie tes étincelles pour toujours.",at_free:'Emplacement libre : choisis une recherche',at_slots:'{n} emplacement{n|s} sur 3',at_slot:'Emplacement',at_to:'Vers le niveau {n}',at_rush:'Terminer maintenant avec des gemmes',at_ad:'−30 min',
  at_lock:'Étape {n}',at_maxed:'Maximum',at_k:'{k} sur {m}',at_detail:'{t} : détails',at_locked:"Se débloque à l'étape {n}.",at_inprog:'En recherche, prête dans {t}.',at_ismax:'Niveau maximum atteint.',at_dur:'Durée : {t}',at_buy:'Rechercher pour {c}',at_full:'Tous tes emplacements sont occupés.',at_next:'Prochain niveau : {d}',at_lvl:'Niveau {k} sur {m}',
  at_started:'{t} : recherche lancée',at_busy:'Tous les emplacements sont occupés',at_done:'{t} : recherche terminée',at_rushed:'Recherche accélérée de 30 minutes',at_newslot:'Nouvel emplacement de recherche',at_newjslot:'Nouvel emplacement de joker',no_gems:'Pas assez de gemmes',
  pp_n:'{n} point{n|s} de réfraction',pp_reset:'Redistribuer',pp_note:'Chaque réfraction donne des points (1 à l\'étape 30, puis +1 par tranche de 10). Un point par niveau, puis deux, puis trois. Niveau : effet +20 %, dégâts +8 %.',pp_up:'Améliorer {t}, {n} point{n|s}',pp_back:'Points de réfraction rendus',
  // ligue
  lg_title:'Ligue {d}',lg_sub:'Tes dégâts cumulés contre le Titan cette semaine ({days}), face à 29 joueurs simulés. Les 5 premiers montent en Argent.',lg_days:'mardi, jeudi, samedi',lg_today:"aujourd'hui !",lg_next:'prochain : {d}',lg_up:'Zone de montée au-dessus',lg_down:'Zone de descente en dessous',lg_report:'Signaler le pseudo {n}',lg_reported:'Signalement envoyé',div_bronze:'Bronze',
  // boutique
  sh_title:'Boutique',sh_demo:'Démo : achats et publicités simulés, aucun paiement réel.',sh_boost:'Gains doublés',sh_active:'Actif encore {t}',sh_inactive:'Inactif',sh_adboost:'Pub : ×2 pendant {n} h',sh_boost_d:'Dégâts et étincelles doublés. Se cumule.',sh_gemboost:'×2 pendant {n} h',sh_watch:'Regarder',sh_skin:'Couleur de ta gemme',sh_worn:'Portée',sh_wear:'Porter',sh_price:'{n} gemmes',sh_own:'Acquis',sh_confirm:"Confirmer l'achat",sh_sim:'Achat simulé : aucun paiement réel.',sh_bought:'Achat simulé effectué',sh_boosted:'Gains doublés pendant {n} h',
  of_starter:'Pack de départ',of_starter_d:'150 gemmes et 6 h de gains doublés. Une seule fois.',of_loot:"Trésor ×2 à vie",of_loot_d:"Double le trésor de départ offert à chaque réfraction.",of_noads:'Supprimer les pubs',of_noads_d:'Plus de pub imposée. Les pubs récompensées restent au choix.',of_gems:'{n} gemmes',of_small:'Petit paquet.',of_more:'+{n} % par rapport au petit paquet.',of_big:'Le plus gros coffre : +85 %.',
  starter_p:'150 gemmes et 6 h de gains doublés pour {p}. Une seule fois.',starter_left:'Offre visible encore {t}',starter_btn:'{p} (achat simulé)',starter_no:'Non merci',
  skin_cyan:'Cyan',skin_rose:'Magenta',skin_or:'Or',skin_prisme:'Prisme',
  // profil
  pr_title:'Profil',pr_tier:'{t}, étape {n} au mieux',pr_worlds:', {n} monde{n|s} terminé{n|s}',pr_name:'Pseudo',pr_change:'Changer',pr_first:'Le premier changement est gratuit. ',pr_note:'Les pseudos passent un filtre automatique. Après 3 signalements, le pseudo redevient un nom aléatoire.',pr_newname:'Nouveau pseudo',
  pr_forge:'Forge',pr_forge_sub:"{r} étincelles / h, {h} h de réserve",pr_forge_n:"{n} étincelles",pr_forge_d:'Produit même quand le jeu est fermé.',pr_collect:'Récolter',
  pr_settings:'Réglages',pr_music:'Musique',pr_sound:'Effets sonores',pr_fx:'Secousses et vibrations',pr_lang:'Langue',
  pr_stats:'Statistiques',pr_best:'meilleure étape',pr_pres:'réfractions',pr_merges:'fusions, dont {n} à la main',pr_kills:'ennemis vaincus, {n} boss',pr_titan:'record contre le Titan',pr_res:'recherches terminées',
  pr_bestiary:'Bestiaire',pr_beaten:'{n} vaincu{n|s}',pr_bestiary_empty:"Bats ton premier gardien à l'étape 5 pour ouvrir le bestiaire.",pr_in:'en {n} s',pr_guard:'gardien',pr_stage:'{n}, étape {s}',
  pr_demo:'Démo',copied:"Copié",copy:"Copier",pr_xfer_same:"C'est déjà ta partie",pr_xfer_bad:"Code invalide",pr_xfer_go:"Récupérer",pr_xfer_enter_p:"La partie de cet appareil sera remplacée par celle du code.",pr_xfer_enter:"J'ai un code",pr_xfer_show_p:"Note ce code ou copie-le : il donne accès à ta partie, ne le partage pas.",pr_xfer_show:"Voir mon code",pr_xfer_p:"Ta partie est liée à cet appareil. Un code permet de la retrouver ailleurs ou après une réinstallation.",pr_xfer:"Changer d'appareil",pr_version:'version {v}',pr_reset:'Effacer ma progression',pr_reset_q:'Effacer ta progression ?',pr_reset_p:'Tout sera remis à zéro : étapes, recherches, gemmes.',pr_reset_ok:'Tout effacer',
  name_updated:'Pseudo mis à jour',name_saved:'Pseudo enregistré',name_keep:'Garder ce nom',name_first:'Premier gardien vaincu',name_first_p:'Choisis le nom que les autres joueurs verront en ligue. Ce premier changement est gratuit.',name_your:'Ton pseudo',name_cost:'Il te faut {n} gemmes.',
  name_short:'3 caractères minimum.',name_long:'16 caractères maximum.',name_chars:'Lettres, chiffres, espaces, - et _ uniquement.',name_banned:'Ce pseudo contient un mot interdit.',
  // jeu
  hint1:'Tes gemmes tirent toutes seules. Glisse-en une sur une gemme identique : la fusion tire plus fort.',hint2:'Chaque forme est une arme différente. Plus la gemme est grosse, plus ses tirs font mal.',hint3:'Tes étincelles achètent des boosters de partie : prends Vitesse.',hint4:"Les boosters durent jusqu'à la réfraction (étape {n}). Les recherches de l'Atelier, elles, sont définitives.",
  board_aria:'Plateau : fais glisser une gemme sur une gemme identique',enemy_aria:'Ennemi',hp_aria:"Vie de l'ennemi",shards_aria:"Étincelles",gems_aria:'Gemmes, ouvrir la boutique',profile_aria:'Profil',
  boss_banner:'Boss : {n} s pour le vaincre',boss_fled:"Il s'est enfui",boss_fled_p:'Continue à grossir tes gemmes, puis redéfie-le',shield:'Bouclier',shield_p:'Seules les gemmes niveau {n} et plus lui font mal',blocked:'Bloqué',crit:'Critique ',he:'Il {a}',new_world:'Nouveau monde',
  chal_aria:"Redéfier le boss de l'étape {n}",retreat_aria:"Reculer : retourner à l'étape {n}",boss_back:"Repli stratégique",pre_aria:"Réfraction : étincelles ×{m}",pre_locked:"Réfraction dès l'étape {n}",titan_aria:'Titan : {n} ticket{n|s}',
  pre_title:'Réfraction',pre_pot:"+{n} étincelles de trésor au départ",pre_mult:"Étincelles ×{a} → ×{b}, pour toujours",pre_pp:'+{n} point{n|s} de réfraction pour tes armes',pre_p:"La lumière traverse le prisme : tu repars à l'étape 1 avec tes recherches et un trésor de départ. Tes boosters de partie sont remis à zéro.",pre_note:"Plus tu pousses loin avant de réfracter, plus le trésor de départ et les points sont gros.",pre_go:'Réfracter',pre_not:'Pas maintenant',pre_done:"Étincelles ×{m} pour toujours, +{n} de trésor",pre_tip:"Regarde l'Atelier : tes étincelles achètent des recherches définitives",
  titan_p:'{n} secondes de dégâts libres, comptés pour la ligue. Les mardis, jeudis et samedis.',titan_tickets:'{n} ticket{n|s}',titan_ad:'+1 ticket',titan_gem:'{n} : +1',titan_got:'+1 ticket Titan',titan_go:'{n} s : fais le maximum de dégâts',titan_record:'Nouveau record : compté pour la ligue.',titan_prev:"Record : {n}. Ce score s'ajoute à ton total de la semaine.",continue:'Continuer',
  off_title:'Pendant ton absence',off_p:"{t} d'absence",off_counted:', {t} comptées',off_exped:'Tes gemmes ont avancé de {n} étape{n|s} en expédition.',off_x2:'Doubler les étincelles',off_more:'Encore +{n} étincelles',
  net_title:'Connexion requise',net_p:'Prisme Fusion a besoin d\'internet pour sauvegarder ta progression et la ligue. La partie est en pause.',net_server:'Le serveur de Prisme Fusion est injoignable pour le moment. La partie est en pause, réessaie dans un instant.',net_back:'Connexion rétablie',net_restored:'Progression récupérée depuis le serveur',lg_sub_live:'Tes dégâts cumulés contre le Titan cette semaine ({days}), face aux joueurs de ta division. Les 5 premiers montent en Argent.',
  ad_sim:'Publicité simulée',ad_real:'Dans le jeu réel : une vidéo de 15 à 30 secondes.',ad_between:'Publicité',
  toast_lock:'Tous les emplacements sont occupés',gift_title:'Cadeau',gift_p:'Regarde une courte publicité pour le récupérer.',gift_go:'Regarder et gagner',gift_boost:'Gains ×2 pendant {n} min',gift_aria:'Cadeau : touche pour voir',
};
let LANG='fr';
const LANG_LIST=()=>Object.keys(I18N);
function pickLang(){try{const s=localStorage.getItem('prisme-lang');if(s&&I18N[s])return s;}catch(e){}const nav=(navigator.languages||[navigator.language||'fr']).map(x=>x.slice(0,2).toLowerCase());for(const l of nav)if(I18N[l])return l;return 'en';}
function setLang(l){if(!I18N[l])return;LANG=l;try{localStorage.setItem('prisme-lang',l);}catch(e){}document.documentElement.lang=l;}
/* t('clé',{n:3}) : remplace {n} ; {n|s} ajoute « s » si n>1 (ou la chaîne donnée) */
function t(k,v){let s=I18N[LANG][k];if(s==null)s=I18N.fr[k];if(s==null)return k;if(!v)return s;return s.replace(/\{(\w+)(?:\|([^}]*))?\}/g,(m,key,pl)=>{const val=v[key];if(pl!==undefined){const many=+String(val).replace(/[^\d.]/g,'')>1;if(pl.includes('/')){const [a,b]=pl.split('/');return many?b:a;}return many?pl:'';}return val==null?'':String(val);});}
/* nombres : séparateurs de la langue, décimales locales */
const dec=(v,d=1)=>{try{return new Intl.NumberFormat(LANG,{minimumFractionDigits:0,maximumFractionDigits:d}).format(+v.toFixed(d));}catch(e){return v.toFixed(d);}};
const grp=n=>{try{return new Intl.NumberFormat(LANG).format(n);}catch(e){return String(n);}};
