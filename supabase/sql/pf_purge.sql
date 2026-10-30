-- Prisme Fusion v12.8 : purge automatique quotidienne (03:17 UTC) pour que la base ne grossisse pas sans fin.
-- - statistiques de jeu (events) : 90 jours
-- - anomalies anti-triche : 180 jours
-- - compteurs de débit (rate_hits) : 1 heure
-- - journal des appels HTTP sortants de pg_net (net._http_response) : 7 jours
create extension if not exists pg_cron;
create or replace function public.pf_purge() returns jsonb language plpgsql security definer set search_path = public as $$
declare e int; a int; r int; h int := 0;
begin
  delete from events where created_at < now() - interval '90 days'; get diagnostics e = row_count;
  delete from anomalies where at < now() - interval '180 days'; get diagnostics a = row_count;
  delete from rate_hits where m < now() - interval '1 hour'; get diagnostics r = row_count;
  begin execute 'delete from net._http_response where created < now() - interval ''7 days'''; get diagnostics h = row_count; exception when others then h := -1; end;
  return jsonb_build_object('events', e, 'anomalies', a, 'rate_hits', r, 'http', h);
end $$;
revoke all on function public.pf_purge() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'pf-purge';
select cron.schedule('pf-purge', '17 3 * * *', $$select public.pf_purge()$$);
