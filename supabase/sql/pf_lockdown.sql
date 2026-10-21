-- Prisme Fusion v9.4 (2026-10-21) : fonctions réservées au serveur (pf-act, service_role).
-- Avant : appelables directement depuis le téléphone avec la clé publique, ce qui contournait le serveur juge
-- (score Titan arbitraire via pf_titan, sauvegarde forgée via pf_save puis hello, guilde sans payer via pf_guild_create, pseudo gratuit via pf_set_name).
do $$ declare f text; begin
 for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in ('pf_save','pf_titan','pf_set_name','pf_report','pf_hello','pf_league_result','pf_guild_create') loop
  execute 'revoke execute on function '||f||' from public, anon, authenticated';
  execute 'grant execute on function '||f||' to service_role';
 end loop;
 alter function public.pf_guild_tiers() set search_path = public;
end $$;
-- Restent appelables par le téléphone : pf_time, pf_board, pf_track, pf_guild, pf_guild_list/join/leave/kick/open (lecture ou actions sans valeur économique),
-- et pour un utilisateur connecté (Google/Apple) : pf_account, pf_link_account, pf_recover.
