-- Prisme Fusion v9.4 : limite de débit de la fonction pf-act (appelée par le serveur uniquement, service_role)
create table if not exists public.rate_hits (
  k text not null,
  m timestamptz not null,
  n int not null default 1,
  primary key (k, m)
);
alter table public.rate_hits enable row level security; -- aucune policy : illisible depuis le téléphone

-- Compte un appel pour la clé (« ip:… » ou « p:<id joueur> ») dans la minute en cours ; vrai tant que la limite n'est pas dépassée.
create or replace function public.pf_rate(p_key text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  insert into rate_hits (k, m, n) values (left(p_key, 80), date_trunc('minute', now()), 1)
  on conflict (k, m) do update set n = rate_hits.n + 1
  returning n into v;
  if random() < 0.01 then
    delete from rate_hits where m < now() - interval '10 minutes';
  end if;
  return v <= p_max;
end $$;

revoke all on function public.pf_rate(text, int) from public, anon, authenticated;
grant execute on function public.pf_rate(text, int) to service_role;
