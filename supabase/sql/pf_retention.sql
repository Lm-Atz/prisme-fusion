-- Prisme Fusion : durées de conservation annoncées dans la politique de confidentialité (v10).
-- NON APPLIQUÉ AUTOMATIQUEMENT : à exécuter (une fois) avant la publication, après validation de Lucas.
--   * partie supprimée après 24 mois sans connexion ;
--   * statistiques détaillées (table events) supprimées après 13 mois.
create extension if not exists pg_cron;

create or replace function public.pf_purge() returns jsonb language plpgsql security definer set search_path = public as $$
declare ev int; pl int;
begin
  delete from events where created_at < now() - interval '13 months';
  get diagnostics ev = row_count;
  -- joueurs inactifs depuis 24 mois : leurs lignes liées partent avec eux (ligue, signalements, guilde)
  with gone as (select id from players where coalesce(last_act, last_seen, updated_at, created_at) < now() - interval '24 months')
  , a as (delete from league_members where player_id in (select id from gone))
  , b as (delete from league_claims where player_id in (select id from gone))
  , c as (delete from guild_members where player_id in (select id from gone))
  , d as (delete from reports where reporter in (select id from gone) or target in (select id from gone))
  , e as (delete from anomalies where player_id in (select id from gone))
  delete from players where id in (select id from gone);
  get diagnostics pl = row_count;
  return jsonb_build_object('events', ev, 'players', pl, 'at', now());
end $$;
revoke all on function public.pf_purge() from public, anon, authenticated;

-- tous les jours à 4 h 17 (heure UTC)
select cron.schedule('pf-purge', '17 4 * * *', $$select public.pf_purge()$$);
