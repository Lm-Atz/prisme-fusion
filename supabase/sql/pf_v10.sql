-- Prisme Fusion v10 : ligue par niveau de puissance (divisions + rivaux simulés clairement marqués) et signalement des noms de guilde.

-- 1. Division selon la meilleure étape au moment de l'inscription de la semaine.
alter table public.league_members add column if not exists tier int not null default 0;
create or replace function public.pf_tier(p_best int) returns int language sql immutable set search_path = public as $$
  select case when p_best < 30 then 0 when p_best < 60 then 1 when p_best < 100 then 2 when p_best < 200 then 3 else 4 end;
$$;

-- 2. Rivaux simulés : complètent une tranche de moins de 20 joueurs réels jusqu'à 20 (v10.1).
--    Référence = score médian de la SEMAINE PRÉCÉDENTE des joueurs de la tranche ; rivaux entre 0,25 et 1,5 fois cette référence :
--    un joueur seul finit 1er s'il fait plus de 1,5 fois son score de la semaine passée, milieu de tableau s'il stagne.
--    Nouveau joueur sans historique : référence basse (5 % des PV de l'ennemi de sa meilleure étape moyenne).
--    Déterministes, score qui progresse au fil de la semaine, renvoyés avec bot = true et affichés comme tels.
create or replace function public.pf_league_bots(p_week text, p_bracket int, p_final boolean default false)
returns table(k int, score numeric, best int) language plpgsql stable security definer set search_path = public as $$
declare n int; c int; prog numeric; pw text; base numeric;
begin
  select count(*), coalesce(round(avg(best_stage))::int, 1) into n, c from league_members where week = p_week and bracket = p_bracket;
  if n = 0 or n >= 20 then return; end if;
  pw := to_char(to_date(p_week || '-1', 'IYYY-IW-ID') - 7, 'IYYY-IW');
  select percentile_cont(0.5) within group (order by p.score)::numeric into base from league_members p
    where p.week = pw and p.score > 0 and p.player_id in (select m.player_id from league_members m where m.week = p_week and m.bracket = p_bracket);
  if base is null then base := 0.05 * 400 * power(1.6::numeric, greatest(c, 1) - 1); end if;
  if p_final or p_week <> pf_week() then prog := 1;
  else prog := least(1, greatest(0.05, extract(epoch from ((now() at time zone 'Europe/Paris') - date_trunc('week', now() at time zone 'Europe/Paris'))) / (6 * 86400.0)));
  end if;
  return query
    select g.k, round(base * (0.25 + 1.25 * (abs(hashtext('s:' || p_week || ':' || p_bracket || ':' || g.k)) % 1000) / 1000.0) * prog),
           greatest(1, c + (abs(hashtext(p_week || ':' || p_bracket || ':' || g.k)) % 6) - 5)
    from generate_series(1, 20 - n) g(k);
end $$;
revoke all on function public.pf_league_bots(text, int, boolean) from public, anon, authenticated;

-- 3. Inscription : tranche la plus récente DE LA MÊME DIVISION avec moins de 30 membres.
create or replace function public.pf_titan(p_id uuid, p_secret text, p_score numeric, p_best integer)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); b int; cap numeric; tr int := pf_tier(p_best);
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  if p_best < 1 or p_best > 5000 then raise exception 'bad_stage'; end if;
  cap := 1e6 * power(1.9::numeric, least(p_best, 400));
  if p_score < 0 or p_score > cap then raise exception 'implausible'; end if;
  select bracket into b from league_members where week = w and player_id = p_id;
  if b is null then
    select bracket into b from league_members where week = w and tier = tr group by bracket having count(*) < 30 order by bracket desc limit 1;
    if b is null then select coalesce(max(bracket), 0) + 1 into b from league_members where week = w; end if;
    insert into league_members(week, player_id, bracket, score, best_stage, tier) values (w, p_id, b, p_score, p_best, tr);
  else
    update league_members set score = score + p_score, best_stage = greatest(best_stage, p_best), updated_at = now() where week = w and player_id = p_id;
  end if;
  update players set best_stage = greatest(best_stage, p_best) where id = p_id;
  return jsonb_build_object('ok', true, 'week', w, 'bracket', b, 'tier', tr);
end $$;
revoke all on function public.pf_titan(uuid, text, numeric, integer) from public, anon, authenticated;
grant execute on function public.pf_titan(uuid, text, numeric, integer) to service_role;

-- 4. Tableau : joueurs réels + rivaux simulés (bot = true), division de la tranche.
create or replace function public.pf_board(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); b int; tr int; rows jsonb;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  select bracket, tier into b, tr from league_members where week = w and player_id = p_id;
  if b is null then return jsonb_build_object('week', w, 'rows', '[]'::jsonb, 'joined', false); end if;
  select coalesce(jsonb_agg(r order by (r->>'score')::numeric desc, r->>'t' asc), '[]'::jsonb) into rows from (
    select jsonb_build_object('id', m.player_id, 'name', p.name, 'score', m.score, 'best', m.best_stage, 'me', m.player_id = p_id, 't', m.updated_at) r
      from league_members m join players p on p.id = m.player_id where m.week = w and m.bracket = b and not p.banned
    union all
    select jsonb_build_object('bot', true, 'k', x.k, 'score', x.score, 'best', x.best, 'me', false, 't', 'z') from pf_league_bots(w, b) x
  ) q;
  return jsonb_build_object('week', w, 'rows', rows, 'joined', true, 'bracket', b, 'tier', tr);
end $$;

-- 5. Résultat de la semaine : le rang tient compte des rivaux simulés (score final).
create or replace function public.pf_league_result(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare cur text := pf_week(); w text; b int; r int; n int; nb int; g int; my numeric; myt timestamptz;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  select m.week, m.bracket, m.score, m.updated_at into w, b, my, myt from league_members m
    where m.player_id = p_id and m.week < cur
      and not exists (select 1 from league_claims c where c.week = m.week and c.player_id = p_id)
    order by m.week desc limit 1;
  if w is null then return jsonb_build_object('none', true); end if;
  select count(*) into n from league_members where week = w and bracket = b;
  select count(*) into nb from pf_league_bots(w, b, true);
  select 1 + count(*) into r from league_members x where x.week = w and x.bracket = b and (x.score > my or (x.score = my and x.updated_at < myt));
  r := r + (select count(*) from pf_league_bots(w, b, true) x where x.score > my);
  g := pf_league_gems(r);
  insert into league_claims(week, player_id, rank, size, gems) values (w, p_id, r, n + nb, g);
  return jsonb_build_object('week', w, 'rank', r, 'size', n + nb, 'gems', g);
end $$;
revoke all on function public.pf_league_result(uuid, text) from public, anon, authenticated;
grant execute on function public.pf_league_result(uuid, text) to service_role;

-- 6. Signalement d'un nom de guilde : 3 joueurs différents dans la semaine → nom neutre.
create table if not exists public.guild_reports (week text not null, reporter uuid not null, guild_id uuid not null, created_at timestamptz default now(), primary key (week, reporter, guild_id));
alter table public.guild_reports enable row level security;
create or replace function public.pf_guild_report(p_id uuid, p_secret text, p_guild uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare w text := pf_week(); n int;
begin
  if not pf_rate('gr:' || p_id::text, 10) then return jsonb_build_object('ok', false, 'err', 'rate'); end if;
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  if not exists (select 1 from guilds where id = p_guild and not dissolved) then return jsonb_build_object('ok', false, 'err', 'guild'); end if;
  if exists (select 1 from guild_members where guild_id = p_guild and player_id = p_id and active) then return jsonb_build_object('ok', false, 'err', 'own'); end if;
  insert into guild_reports(week, reporter, guild_id) values (w, p_id, p_guild) on conflict do nothing;
  select count(*) into n from guild_reports where week = w and guild_id = p_guild;
  if n >= 3 then update guilds set name = 'Guilde ' || code where id = p_guild and name <> 'Guilde ' || code; end if;
  return jsonb_build_object('ok', true, 'count', n);
end $$;
revoke all on function public.pf_guild_report(uuid, text, uuid) from public;
grant execute on function public.pf_guild_report(uuid, text, uuid) to anon, authenticated, service_role;
