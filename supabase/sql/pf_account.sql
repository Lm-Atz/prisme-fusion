-- Prisme Fusion v9.3 — compte e-mail + mot de passe (Supabase Auth), appliqué le 2026-10-09.
-- La partie reste identifiée par (id, secret) ; le compte sert à la lier et à la retrouver : pf_recover renouvelle le secret.
-- Réglage dashboard requis : Authentication → Sign In / Providers → Email → « Confirm email » désactivé (aucun e-mail envoyé).
alter table public.players add column if not exists auth_uid uuid unique references auth.users(id) on delete set null;
create or replace function public.pf_link_account(p_id uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); o players%rowtype; em text;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  if uid is null then raise exception 'login'; end if;
  select email into em from auth.users where id = uid;
  select * into o from players where auth_uid = uid;
  if found and o.id <> p_id then
    return jsonb_build_object('ok', false, 'err', 'linked_other', 'other', jsonb_build_object('name', o.name, 'best', o.best_stage, 'prestiges', o.prestiges, 'seen', extract(epoch from coalesce(o.last_act, o.last_seen))*1000), 'email', em);
  end if;
  update players set auth_uid = uid where id = p_id;
  return jsonb_build_object('ok', true, 'email', em);
end $$;
create or replace function public.pf_recover() returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); o players%rowtype; s text;
begin
  if uid is null then raise exception 'login'; end if;
  select * into o from players where auth_uid = uid;
  if not found then raise exception 'none'; end if;
  s := encode(gen_random_bytes(24), 'hex');
  update players set secret_hash = crypt(s, gen_salt('bf', 8)) where id = o.id;
  return jsonb_build_object('ok', true, 'id', o.id, 'secret', s, 'name', o.name, 'best', o.best_stage);
end $$;
create or replace function public.pf_account(p_id uuid, p_secret text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); o players%rowtype; em text;
begin
  if not pf_auth(p_id, p_secret) then raise exception 'auth'; end if;
  if uid is null then return jsonb_build_object('login', false); end if;
  select email into em from auth.users where id = uid;
  select * into o from players where auth_uid = uid;
  return jsonb_build_object('login', true, 'email', em, 'linked', found, 'mine', found and o.id = p_id, 'other', case when found and o.id <> p_id then jsonb_build_object('name', o.name, 'best', o.best_stage, 'prestiges', o.prestiges) else null end);
end $$;
do $$ declare f text; begin
  for f in select unnest(array['pf_link_account(uuid,text)','pf_recover()','pf_account(uuid,text)']) loop
    execute 'revoke all on function public.'||f||' from public, anon'; execute 'grant execute on function public.'||f||' to authenticated, service_role'; end loop;
end $$;
