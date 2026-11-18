-- Prisme Fusion v14.2 : durcissement après la revue de sécurité du 18/11/2026.
-- 1. pf_track / pf_track_batch ne sont plus appelées par le jeu depuis la v12.8 (statistiques jointes aux requêtes) :
--    elles restaient appelables avec la clé publique, sans limite de taille pour pf_track → retirées du public.
revoke execute on function public.pf_track(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.pf_track_batch(uuid, text, jsonb) from public, anon, authenticated;

-- 2. pf_load : au plus 3 nouveaux comptes par minute et par adresse IP (avant : 240 requêtes/min suffisaient à créer 240 comptes).
create or replace function public.pf_load(p_id uuid, p_secret text, p_lang text, p_name text, p_ip text, p_rip int, p_rpl int) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare h jsonb; r players%rowtype;
begin
  if not pf_rate('ip:' || coalesce(p_ip, '?'), p_rip) then return jsonb_build_object('err', 'rate'); end if;
  if not exists (select 1 from players where id = p_id) and not pf_rate('new:' || coalesce(p_ip, '?'), 3) then return jsonb_build_object('err', 'rate'); end if;
  begin h := pf_hello(p_id, p_secret, p_lang, p_name);
  exception when raise_exception then if sqlerrm = 'auth' then return jsonb_build_object('err', 'auth'); end if; raise; end;
  if not pf_rate('p:' || p_id::text, p_rpl) then return jsonb_build_object('err', 'rate'); end if;
  select * into r from players where id = p_id;
  return jsonb_build_object('hello', h, 'state', r.state, 'ver', r.ver, 'banned', r.banned, 'anom', r.anom, 'save', r.save);
end $$;
revoke all on function public.pf_load(uuid, text, text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.pf_load(uuid, text, text, text, text, int, int) to service_role;

-- 3. Empreintes des règles serveur autorisées (pf_server.js publié sur GitHub Pages). La fonction pf-act refuse toute autre version.
--    À chaque mise en ligne : insert into pf_rules(hash, note) values ('<sha256 de pf_server.js>', 'vX.Y'); (build7.py l'affiche)
create table if not exists public.pf_rules (hash text primary key, note text, at timestamptz not null default now());
alter table public.pf_rules enable row level security; -- aucune policy : réservé au serveur
revoke all on table public.pf_rules from anon, authenticated;
insert into public.pf_rules(hash, note) values ('a7349e3a0a7547762b92e4adc4ff45e3c8e6f790d83952a8e081227f9a73f4e7', 'v14.1') on conflict do nothing;
insert into public.pf_rules(hash, note) values ('4f5be9b38f1f927843105b0eb90b506f67cba5e01efd2fa8d38d01b3767d433a', 'v14.2') on conflict do nothing;
