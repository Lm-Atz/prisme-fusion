// v12.8 : test des fonctions SQL (pf_scale.sql, pf_purge.sql) dans un vrai Postgres local (PGlite), sans toucher à la base de production.
// Usage : node t7sql.mjs <dossier node_modules contenant @electric-sql/pglite>
import fs from 'fs';import path from 'path';import {fileURLToPath,pathToFileURL} from 'url';
const NM=process.argv[2];const here=path.dirname(fileURLToPath(import.meta.url));
const {PGlite}=await import(pathToFileURL(path.join(NM,'@electric-sql/pglite/dist/index.js')).href);
const {pgcrypto}=await import(pathToFileURL(path.join(NM,'@electric-sql/pglite/dist/contrib/pgcrypto.js')).href);
let ok=0,ko=0;const T=(n,c)=>{if(c)ok++;else{ko++;console.log('KO',n);}};
const db=new PGlite({extensions:{pgcrypto}});
// schéma minimal équivalent à la production (tables et fonctions utilisées)
await db.exec(`
create schema extensions; create extension pgcrypto schema extensions;
create role anon; create role authenticated; create role service_role;
create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
create table players(id uuid primary key, secret_hash text, name text, lang text, save jsonb, best_stage int default 1, prestiges int default 0, flags int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(), last_seen timestamptz, state jsonb, ver int default 0, anom int default 0, banned boolean default false, last_act timestamptz, auth_uid uuid);
create table events(id bigserial primary key, player_id uuid, name text, props jsonb, created_at timestamptz default now());
create table anomalies(id bigserial primary key, player_id uuid, at timestamptz default now(), action text, kinds jsonb, info jsonb);
create table rate_hits(k text, m timestamptz, n int, primary key(k,m));
create schema net; create table net._http_response(id bigserial, created timestamptz default now());
`);
// pf_rate (production, pf_rate.sql)
const rateSql=fs.readFileSync(path.join(here,'..','supabase','sql','pf_rate.sql'),'utf8');
await db.exec(rateSql.replace(/grant[^;]*;/gi,'').replace(/revoke[^;]*;/gi,'').replace(/create table if not exists public\.rate_hits[^;]*;/i,''));
await db.exec(fs.readFileSync(path.join(here,'..','supabase','sql','pf_scale.sql'),'utf8'));
const purge=fs.readFileSync(path.join(here,'..','supabase','sql','pf_purge.sql'),'utf8').replace(/create extension if not exists pg_cron;/,'').replace(/select cron\.[^\n]*\n/g,'');
await db.exec(purge);
const q=async(s,p)=>(await db.query(s,p)).rows;
const id='11111111-1111-4111-8111-111111111111',sec='a'.repeat(48);
// 1. nouveau joueur → SHA-256
let r=await q(`select pf_load($1,$2,'fr','QA','1.1.1.1',240,40) j`,[id,sec]);
T('pf_load crée le joueur',!!r[0].j.hello&&r[0].j.ver===0);
let h=(await q(`select secret_hash from players where id=$1`,[id]))[0].secret_hash;T('secret stocké en SHA-256 (s2:…)',/^s2:[0-9a-f]{64}$/.test(h));
T('pf_auth : bon secret',(await q(`select pf_auth($1,$2) a`,[id,sec]))[0].a===true);
T('pf_auth : mauvais secret',(await q(`select pf_auth($1,$2) a`,[id,'b'.repeat(48)]))[0].a===false);
r=await q(`select pf_load($1,$2,'fr','QA','1.1.1.1',240,40) j`,[id,'b'.repeat(48)]);T('pf_load : mauvais secret → auth',r[0].j.err==='auth');
// 2. ancien compte bcrypt → accepté et converti
const id2='22222222-2222-4222-8222-222222222222',sec2='c'.repeat(48);
await q(`insert into players(id,secret_hash,name,state,ver) values($1,extensions.crypt($2,extensions.gen_salt('bf',4)),'Old','{"gems":7}',3)`,[id2,sec2]);
T('ancien hash bcrypt : mauvais secret refusé, hash inchangé',(await q(`select pf_auth($1,$2) a`,[id2,'d'.repeat(48)]))[0].a===false&&(await q(`select secret_hash h from players where id=$1`,[id2]))[0].h.startsWith('$2'));
r=await q(`select pf_load($1,$2,'fr','Old','1.1.1.1',240,40) j`,[id2,sec2]);T('ancien hash bcrypt : accepté, partie relue',r[0].j.state&&r[0].j.state.gems===7&&r[0].j.ver===3);
T('…et converti en SHA-256',(await q(`select secret_hash h from players where id=$1`,[id2]))[0].h.startsWith('s2:'));
T('…puis toujours accepté',(await q(`select pf_auth($1,$2) a`,[id2,sec2]))[0].a===true);
// 3. limites de débit
let last;for(let i=0;i<5;i++)last=(await q(`select pf_load($1,$2,'fr','QA','2.2.2.2',240,3) j`,[id,sec]))[0].j;T('limite par joueur → rate',last.err==='rate');
for(let i=0;i<4;i++)last=(await q(`select pf_load($1,$2,'fr','QA','3.3.3.3',2,1000) j`,[id,sec]))[0].j;T('limite par IP → rate',last.err==='rate');
// 4. statistiques
r=await q(`select pf_events_add($1,$2::jsonb) n`,[id,JSON.stringify([{n:'open',p:{a:1},t:5},{n:7},{n:'tab',p:{t:'shop'}}])]);T('pf_events_add : 2 événements valides sur 3',r[0].n===2&&(await q(`select count(*)::int c from events`))[0].c===2);
// 5. pf_recover → nouveau secret en SHA-256 (fonction réécrite)
T('pf_recover utilise pf_hash',/pf_hash\(s\)/.test((await q(`select prosrc from pg_proc where proname='pf_recover'`))[0].prosrc));
// 6. purge
await q(`insert into events(player_id,name,created_at) values($1,'vieux',now()-interval '100 days'),($1,'récent',now()-interval '10 days')`,[id]);
await q(`insert into anomalies(player_id,at) values($1,now()-interval '200 days'),($1,now())`,[id]);
await q(`insert into rate_hits values('old',now()-interval '2 hours',1)`);
await q(`insert into net._http_response(created) values(now()-interval '8 days'),(now())`);
r=(await q(`select pf_purge() j`))[0].j;
T('purge : 1 événement de plus de 90 jours supprimé, récents gardés',r.events===1&&(await q(`select count(*)::int c from events where name='récent'`))[0].c===1);
T('purge : anomalies de plus de 180 jours',r.anomalies===1&&(await q(`select count(*)::int c from anomalies`))[0].c===1);
T('purge : vieux compteurs de débit et journal HTTP',r.rate_hits>=1&&r.http===1);
T('purge : les parties des joueurs ne sont jamais touchées',(await q(`select count(*)::int c from players`))[0].c===2);
// 7. coût : SHA-256 vs bcrypt (cost 8)
let t0=performance.now();for(let i=0;i<50;i++)await q(`select pf_auth($1,$2)`,[id,sec]);const fast=(performance.now()-t0)/50;
await q(`update players set secret_hash=extensions.crypt($2,extensions.gen_salt('bf',8)) where id=$1`,[id2,sec2]);t0=performance.now();await q(`select extensions.crypt($1,secret_hash)=secret_hash from players where id=$2`,[sec2,id2]);const slow=performance.now()-t0;
console.log(`coût vérification : SHA-256 ${fast.toFixed(2)} ms, bcrypt ${slow.toFixed(1)} ms`);T('SHA-256 au moins 10× plus rapide que bcrypt',slow>10*fast);
console.log(`t7sql : ${ok} OK, ${ko} KO`);
