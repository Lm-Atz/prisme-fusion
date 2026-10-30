-- Prisme Fusion v12.8 : montée en charge.
-- 1. Identité rapide : le code secret de l'appareil est aléatoire (192 bits), un SHA-256 suffit (bcrypt sert aux mots de passe humains).
--    bcrypt coûtait ~19 ms de calcul en base à CHAQUE requête. Les comptes existants passent au nouveau format à leur prochaine connexion.
-- 2. pf_load : anti-abus (IP), identité, anti-abus (joueur) et lecture de la partie en UN seul aller-retour (avant : 4).
-- 3. pf_events_add : statistiques jointes à la requête de jeu (réservé au serveur, identité déjà vérifiée).

create or replace function public.pf_hash(p text) returns text language sql immutable set search_path = public, extensions as $$
  select 's2:' || encode(extensions.digest(p, 'sha256'), 'hex');
$$;
revoke all on function public.pf_hash(text) from public, anon, authenticated;

-- vérifie le secret ; convertit un ancien hash bcrypt au premier succès
create or replace function public.pf_check(p_id uuid, p_secret text, h text) returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if h is null or p_secret is null then return false; end if;
  if left(h, 3) = 's2:' then return h = pf_hash(p_secret); end if;
  if h = crypt(p_secret, h) then update players set secret_hash = pf_hash(p_secret) where id = p_id; return true; end if;
  return false;
end $$;
revoke all on function public.pf_check(uuid, text, text) from public, anon, authenticated;

create or replace function public.pf_auth(p_id uuid, p_secret text) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  select secret_hash into h from players where id = p_id;
  return pf_check(p_id, p_secret, h);
end $$;

create or replace function public.pf_hello(p_id uuid, p_secret text, p_lang text, p_name text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r players%rowtype;
begin
  select * into r from players where id = p_id;
  if not found then
    insert into players(id, secret_hash, lang, name) values (p_id, pf_hash(p_secret), coalesce(substr(p_lang,1,5),'fr'), coalesce(substr(p_name,1,16),'Prisme')) returning * into r;
  elsif not pf_check(p_id, p_secret, r.secret_hash) then
    raise exception 'auth';
  else
    update players set last_seen = now(), lang = coalesce(substr(p_lang,1,5), lang) where id = p_id;
  end if;
  return jsonb_build_object('now', extract(epoch from now())*1000, 'save', r.save, 'updated', extract(epoch from r.updated_at)*1000, 'name', r.name, 'flags', r.flags);
end $$;

create or replace function public.pf_recover() returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); o players%rowtype; s text;
begin
  if uid is null then raise exception 'login'; end if;
  select * into o from players where auth_uid = uid;
  if not found then raise exception 'none'; end if;
  s := encode(gen_random_bytes(24), 'hex');
  update players set secret_hash = pf_hash(s) where id = o.id;
  return jsonb_build_object('ok', true, 'id', o.id, 'secret', s, 'name', o.name, 'best', o.best_stage);
end $$;

create or replace function public.pf_load(p_id uuid, p_secret text, p_lang text, p_name text, p_ip text, p_rip int, p_rpl int) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare h jsonb; r players%rowtype;
begin
  if not pf_rate('ip:' || coalesce(p_ip, '?'), p_rip) then return jsonb_build_object('err', 'rate'); end if;
  begin h := pf_hello(p_id, p_secret, p_lang, p_name);
  exception when raise_exception then if sqlerrm = 'auth' then return jsonb_build_object('err', 'auth'); end if; raise; end;
  if not pf_rate('p:' || p_id::text, p_rpl) then return jsonb_build_object('err', 'rate'); end if;
  select * into r from players where id = p_id;
  return jsonb_build_object('hello', h, 'state', r.state, 'ver', r.ver, 'banned', r.banned, 'anom', r.anom, 'save', r.save);
end $$;
revoke all on function public.pf_load(uuid, text, text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.pf_load(uuid, text, text, text, text, int, int) to service_role;

create or replace function public.pf_events_add(p_id uuid, p_events jsonb) returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; e jsonb;
begin
  if jsonb_typeof(p_events) <> 'array' then return 0; end if;
  if not pf_rate('ev:' || p_id::text, 20) then return 0; end if;
  for e in select value from jsonb_array_elements(p_events) limit 60 loop
    if jsonb_typeof(e->'n') = 'string' and length(coalesce((e->'p')::text,'')) <= 2000 then
      insert into events(player_id, name, props, created_at) values (p_id, left(e->>'n', 40), coalesce(e->'p','{}'::jsonb) || jsonb_build_object('ct', e->'t'), now());
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.pf_events_add(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.pf_events_add(uuid, jsonb) to service_role;
