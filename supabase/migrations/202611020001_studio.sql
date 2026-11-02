-- Execute no SQL Editor do Supabase antes de habilitar o modo nuvem.
-- O seed completo é inserido automaticamente no primeiro acesso autorizado.
begin;
create table if not exists public.studio_members (email text primary key check (email = lower(email)));
alter table public.studio_members enable row level security;
revoke all on public.studio_members from anon, authenticated;
create or replace function public.studio_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.studio_members where email = lower(auth.jwt()->>'email'));
$$;
revoke all on function public.studio_is_member() from public;
grant execute on function public.studio_is_member() to authenticated;
create table if not exists public.studio_states (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'version' = '1'),
 revision integer not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now()
);
alter table public.studio_states enable row level security;
revoke all on public.studio_states from anon, authenticated;
grant select, insert on public.studio_states to authenticated;
grant update(payload, revision) on public.studio_states to authenticated;
drop policy if exists studio_read on public.studio_states;
create policy studio_read on public.studio_states for select to authenticated using ((select auth.uid()) = owner_id and (select public.studio_is_member()));
drop policy if exists studio_insert on public.studio_states;
create policy studio_insert on public.studio_states for insert to authenticated with check ((select auth.uid()) = owner_id and (select public.studio_is_member()));
drop policy if exists studio_update on public.studio_states;
create policy studio_update on public.studio_states for update to authenticated using ((select auth.uid()) = owner_id and (select public.studio_is_member())) with check ((select auth.uid()) = owner_id and (select public.studio_is_member()));
create or replace function public.studio_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists studio_updated on public.studio_states;
create trigger studio_updated before update on public.studio_states for each row execute function public.studio_updated_at();
insert into storage.buckets(id,name,public,file_size_limit) values ('studio-assets','studio-assets',false,5242880) on conflict(id) do update set public=false,file_size_limit=5242880;
drop policy if exists studio_assets_read on storage.objects;
create policy studio_assets_read on storage.objects for select to authenticated using (bucket_id='studio-assets' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.studio_is_member()));
drop policy if exists studio_assets_insert on storage.objects;
create policy studio_assets_insert on storage.objects for insert to authenticated with check (bucket_id='studio-assets' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.studio_is_member()));
drop policy if exists studio_assets_delete on storage.objects;
create policy studio_assets_delete on storage.objects for delete to authenticated using (bucket_id='studio-assets' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.studio_is_member()));
commit;
-- Convide a conta no painel Authentication > Users. Em seguida, execute:
-- insert into public.studio_members(email) values ('EMAIL_REAL_CONVIDADO') on conflict do nothing;
-- Não inclua service_role no navegador. Desabilite novos cadastros públicos no painel Auth.
