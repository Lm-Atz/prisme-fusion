-- Prisme Fusion v9.2 — guildes (appliqué en production le 2026-10-04 ; référence, pas une migration CLI).
-- Tables : guilds, guild_members (départ = active=false, historique conservé), guild_points (par semaine ISO), guild_claims.
-- RPC joueur (pf_auth) : pf_guild, pf_guild_list, pf_guild_create, pf_guild_join, pf_guild_leave, pf_guild_kick, pf_guild_open.
-- Réservées au serveur (service_role, appelées par la fonction pf-act) : pf_guild_add (points d'une quête validée par le moteur),
--   pf_guild_claim (verrou d'un palier : jauge atteinte, membre depuis 24 h, une fois par semaine) ; la récompense est ensuite
--   créditée dans l'état du joueur par le moteur (action trusted guild_reward). La création coûte 50 gemmes (guild_pay, trusted).
create table if not exists public.guilds (id uuid primary key default gen_random_uuid(), name text not null, code text not null unique, leader uuid not null references public.players(id), open boolean not null default true, lang text, created_at timestamptz not null default now(), dissolved boolean not null default false);
create table if not exists public.guild_members (player_id uuid primary key references public.players(id) on delete cascade, guild_id uuid not null references public.guilds(id) on delete cascade, joined_at timestamptz not null default now(), active boolean not null default true);
create index if not exists guild_members_guild_idx on public.guild_members(guild_id);
create index if not exists guild_members_active_idx on public.guild_members(guild_id) where active;
create table if not exists public.guild_points (week text not null, guild_id uuid not null references public.guilds(id) on delete cascade, player_id uuid not null references public.players(id) on delete cascade, points int not null default 0, updated_at timestamptz not null default now(), primary key (week, guild_id, player_id));
create table if not exists public.guild_claims (week text not null, guild_id uuid not null, player_id uuid not null references public.players(id) on delete cascade, tier int not null, claimed_at timestamptz not null default now(), primary key (week, guild_id, player_id, tier));
alter table public.guilds enable row level security; alter table public.guild_members enable row level security; alter table public.guild_points enable row level security; alter table public.guild_claims enable row level security;
create or replace function public.pf_guild_tiers() returns int[] language sql immutable as $$ select array[200,600,1500,3000,6000]; $$;
create or replace function public.pf_guild_code() returns text language plpgsql volatile set search_path = public, extensions as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop c := ''; for i in 1..6 loop c := c || substr(a, 1 + floor(random()*32)::int, 1); end loop; exit when not exists (select 1 from guilds where code = c); end loop;
  return c;
end $$;
create or replace function public.pf_guild(p_id uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); g guilds%rowtype; gm guild_members%rowtype; total int; members jsonb; claims jsonb; n int;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  select * into gm from guild_members where player_id = p_id and active;
  if not found then return jsonb_build_object('guild', null, 'week', w, 'tiers', to_jsonb(pf_guild_tiers()), 'now', extract(epoch from now())*1000); end if;
  select * into g from guilds where id = gm.guild_id;
  select coalesce(sum(points),0) into total from guild_points where week = w and guild_id = g.id;
  select count(*) into n from guild_members where guild_id = g.id and active;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.player_id, 'name', p.name, 'best', p.best_stage, 'pts', coalesce(gp.points,0), 'leader', m.player_id = g.leader, 'me', m.player_id = p_id, 'since', extract(epoch from m.joined_at)*1000, 'seen', extract(epoch from p.last_seen)*1000) order by coalesce(gp.points,0) desc, m.joined_at asc), '[]'::jsonb)
    into members from guild_members m join players p on p.id = m.player_id left join guild_points gp on gp.week = w and gp.guild_id = g.id and gp.player_id = m.player_id where m.guild_id = g.id and m.active;
  select coalesce(jsonb_agg(tier order by tier), '[]'::jsonb) into claims from guild_claims where week = w and guild_id = g.id and player_id = p_id;
  return jsonb_build_object('guild', jsonb_build_object('id', g.id, 'name', g.name, 'code', g.code, 'open', g.open, 'leader', g.leader, 'n', n, 'max', 30),
    'week', w, 'total', total, 'tiers', to_jsonb(pf_guild_tiers()), 'claims', claims, 'members', members, 'since', extract(epoch from gm.joined_at)*1000, 'now', extract(epoch from now())*1000);
end $$;
create or replace function public.pf_guild_list(p_id uuid, p_secret text, p_lang text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); rows jsonb;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'code', g.code, 'n', g.n, 'pts', (select coalesce(sum(points),0) from guild_points gp where gp.week = w and gp.guild_id = g.id)) order by (g.lang = p_lang) desc, g.n desc, g.created_at desc), '[]'::jsonb)
    into rows from (select g0.*, (select count(*) from guild_members m where m.guild_id = g0.id and m.active) as n from guilds g0 where g0.open and not g0.dissolved) g where g.n < 30 and g.n > 0;
  return jsonb_build_object('rows', rows);
end $$;
create or replace function public.pf_guild_create(p_id uuid, p_secret text, p_name text, p_lang text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g'); gid uuid; c text;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  if exists (select 1 from guild_members where player_id = p_id and active) then raise exception 'in_guild'; end if;
  if char_length(n) < 3 or char_length(n) > 20 then raise exception 'bad_name'; end if;
  if exists (select 1 from guilds where lower(name) = lower(n) and not dissolved) then raise exception 'name_taken'; end if;
  c := pf_guild_code();
  insert into guilds(name, code, leader, lang) values (n, c, p_id, coalesce(substr(p_lang,1,2),'fr')) returning id into gid;
  insert into guild_members(player_id, guild_id, joined_at, active) values (p_id, gid, now(), true) on conflict (player_id) do update set guild_id = excluded.guild_id, joined_at = now(), active = true;
  return jsonb_build_object('ok', true, 'id', gid, 'code', c, 'name', n);
end $$;
create or replace function public.pf_guild_join(p_id uuid, p_secret text, p_code text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare g guilds%rowtype; n int;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  if exists (select 1 from guild_members where player_id = p_id and active) then raise exception 'in_guild'; end if;
  select * into g from guilds where code = upper(btrim(p_code)) and not dissolved;
  if not found then raise exception 'no_guild'; end if;
  select count(*) into n from guild_members where guild_id = g.id and active;
  if n >= 30 then raise exception 'full'; end if;
  insert into guild_members(player_id, guild_id, joined_at, active) values (p_id, g.id, now(), true) on conflict (player_id) do update set guild_id = excluded.guild_id, joined_at = now(), active = true;
  return jsonb_build_object('ok', true, 'id', g.id, 'name', g.name);
end $$;
create or replace function public.pf_guild_leave(p_id uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare gm guild_members%rowtype; g guilds%rowtype; nxt uuid;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  select * into gm from guild_members where player_id = p_id and active;
  if not found then raise exception 'no_guild'; end if;
  select * into g from guilds where id = gm.guild_id;
  update guild_members set active = false where player_id = p_id;
  if g.leader = p_id then
    select player_id into nxt from guild_members where guild_id = g.id and active order by joined_at asc limit 1;
    if nxt is null then update guilds set dissolved = true, open = false where id = g.id; else update guilds set leader = nxt where id = g.id; end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.pf_guild_kick(p_id uuid, p_secret text, p_target uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare g guilds%rowtype;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  select g0.* into g from guilds g0 join guild_members m on m.guild_id = g0.id where m.player_id = p_id and m.active;
  if not found or g.leader <> p_id then raise exception 'not_leader'; end if;
  if p_target = p_id then raise exception 'self'; end if;
  update guild_members set active = false where player_id = p_target and guild_id = g.id;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.pf_guild_open(p_id uuid, p_secret text, p_open boolean) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  update guilds set open = p_open where leader = p_id and not dissolved;
  return jsonb_build_object('ok', found);
end $$;
create or replace function public.pf_guild_add(p_id uuid, p_points int) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); gid uuid; total int;
begin
  if p_points < 1 or p_points > 100 then raise exception 'bad_points'; end if;
  select guild_id into gid from guild_members where player_id = p_id and active;
  if gid is null then return jsonb_build_object('ok', false, 'err', 'no_guild'); end if;
  insert into guild_points(week, guild_id, player_id, points) values (w, gid, p_id, p_points) on conflict (week, guild_id, player_id) do update set points = guild_points.points + excluded.points, updated_at = now();
  select coalesce(sum(points),0) into total from guild_points where week = w and guild_id = gid;
  return jsonb_build_object('ok', true, 'total', total);
end $$;
create or replace function public.pf_guild_claim(p_id uuid, p_tier int) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); gm guild_members%rowtype; total int; tiers int[] := pf_guild_tiers();
begin
  if p_tier < 1 or p_tier > array_length(tiers,1) then raise exception 'bad_tier'; end if;
  select * into gm from guild_members where player_id = p_id and active;
  if not found then raise exception 'no_guild'; end if;
  select coalesce(sum(points),0) into total from guild_points where week = w and guild_id = gm.guild_id;
  if total < tiers[p_tier] then raise exception 'not_reached'; end if;
  if gm.joined_at > now() - interval '24 hours' then raise exception 'too_recent'; end if;
  insert into guild_claims(week, guild_id, player_id, tier) values (w, gm.guild_id, p_id, p_tier);
  return jsonb_build_object('ok', true, 'tier', p_tier);
exception when unique_violation then raise exception 'claimed';
end $$;
do $$ declare f text; begin
  for f in select unnest(array['pf_guild(uuid,text)','pf_guild_list(uuid,text,text)','pf_guild_create(uuid,text,text,text)','pf_guild_join(uuid,text,text)','pf_guild_leave(uuid,text)','pf_guild_kick(uuid,text,uuid)','pf_guild_open(uuid,text,boolean)','pf_guild_tiers()']) loop
    execute 'revoke all on function public.'||f||' from public'; execute 'grant execute on function public.'||f||' to anon, authenticated, service_role'; end loop;
  for f in select unnest(array['pf_guild_add(uuid,int)','pf_guild_claim(uuid,int)','pf_guild_code()']) loop
    execute 'revoke all on function public.'||f||' from public, anon, authenticated'; execute 'grant execute on function public.'||f||' to service_role'; end loop;
end $$;
