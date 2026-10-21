-- Prisme Fusion v9.6 : mesure (événements groupés) et statistiques agrégées pour le tableau de bord.
create index if not exists events_player_time on public.events (player_id, created_at);

-- Le téléphone envoie ses événements par paquets (au plus 60), une seule vérification du secret par paquet.
create or replace function public.pf_track_batch(p_id uuid, p_secret text, p_events jsonb)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare n int := 0; e jsonb;
begin
  if not pf_rate('ev:' || p_id::text, 20) then return 0; end if; -- au plus 20 paquets par minute et par joueur
  if not pf_auth(p_id, p_secret) then return 0; end if;
  if jsonb_typeof(p_events) <> 'array' then return 0; end if;
  for e in select value from jsonb_array_elements(p_events) limit 60 loop
    if jsonb_typeof(e->'n') = 'string' and length(coalesce((e->'p')::text,'')) <= 2000 then
      insert into events(player_id, name, props, created_at)
      values (p_id, left(e->>'n', 40), coalesce(e->'p','{}'::jsonb) || jsonb_build_object('ct', e->'t'), now());
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.pf_track_batch(uuid, text, jsonb) from public;
grant execute on function public.pf_track_batch(uuid, text, jsonb) to anon, authenticated, service_role;

-- Clé d'accès du tableau de bord (une seule ligne, illisible depuis le téléphone).
create table if not exists public.admin_keys (k text primary key, created_at timestamptz default now());
alter table public.admin_keys enable row level security;

-- Statistiques agrégées, anonymes, réservées au détenteur de la clé.
create or replace function public.pf_stats(p_key text, p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; d int := least(greatest(coalesce(p_days,30),1),120);
begin
  if not exists (select 1 from admin_keys where k = p_key) then raise exception 'key'; end if;
  with first_seen as (
    select player_id, min(created_at)::date as d0 from events where player_id is not null group by player_id
  ), active as (
    select distinct player_id, created_at::date as day from events where player_id is not null
  ), coh as (
    select f.d0, count(*) n,
      count(*) filter (where exists (select 1 from active a where a.player_id=f.player_id and a.day=f.d0+1)) d1,
      count(*) filter (where exists (select 1 from active a where a.player_id=f.player_id and a.day=f.d0+7)) d7,
      count(*) filter (where exists (select 1 from active a where a.player_id=f.player_id and a.day=f.d0+30)) d30
    from first_seen f where f.d0 >= current_date - d group by f.d0
  )
  select jsonb_build_object(
    'players', (select count(*) from players),
    'new', (select count(*) from first_seen where d0 >= current_date - d),
    'cohorts', coalesce((select jsonb_agg(jsonb_build_object('day',d0,'n',n,'d1',d1,'d7',d7,'d30',d30) order by d0) from coh), '[]'),
    'dau', coalesce((select jsonb_agg(jsonb_build_object('day',day,'n',n) order by day) from (select day, count(*) n from active where day >= current_date - d group by day) x), '[]'),
    'tuto', coalesce((select jsonb_object_agg(s, n) from (select props->>'s' s, count(distinct player_id) n from events where name='tuto' and created_at >= now() - make_interval(days => d) group by 1) x), '{}'),
    'stages', coalesce((select jsonb_object_agg(s, n) from (select props->>'n' s, count(distinct player_id) n from events where name='stage' and created_at >= now() - make_interval(days => d) group by 1) x), '{}'),
    'counts', coalesce((select jsonb_object_agg(name, n) from (select name, count(*) n from events where created_at >= now() - make_interval(days => d) group by 1) x), '{}'),
    'ads', coalesce((select jsonb_object_agg(coalesce(p,'?'), n) from (select props->>'at' p, count(*) n from events where name='ad' and created_at >= now() - make_interval(days => d) group by 1) x), '{}'),
    'tabs', coalesce((select jsonb_object_agg(coalesce(p,'?'), n) from (select props->>'t' p, count(distinct player_id) n from events where name='tab' and created_at >= now() - make_interval(days => d) group by 1) x), '{}'),
    'payers', (select count(distinct player_id) from events where name='purchase' and created_at >= now() - make_interval(days => d)),
    'session_sec', (select round(avg((props->>'sec')::numeric)) from events where name='session_end' and (props->>'sec') ~ '^[0-9]+$' and created_at >= now() - make_interval(days => d)),
    'at', now()
  ) into r;
  return r;
end $$;
revoke all on function public.pf_stats(text, int) from public;
grant execute on function public.pf_stats(text, int) to anon, authenticated, service_role;

-- Clé du tableau de bord : insert into admin_keys(k) select encode(extensions.gen_random_bytes(18),'hex') where not exists (select 1 from admin_keys);
