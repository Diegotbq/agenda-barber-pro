-- Supabase Auth profile bootstrap + secure owner onboarding
-- Apply after 202611240001_initial_schema.sql.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

revoke all on function public.handle_new_auth_user() from public;

-- Creates a shop for the authenticated user. The existing trigger then creates
-- owner membership and the seven-day trial atomically.
create or replace function public.create_my_barbershop(shop_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_shop_id uuid;
  clean_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  clean_name := trim(coalesce(shop_name, ''));
  if length(clean_name) < 2 or length(clean_name) > 100 then
    raise exception 'Barbershop name must contain 2 to 100 characters';
  end if;

  if exists (
    select 1 from public.barbershops b
    where b.owner_user_id = auth.uid()
  ) then
    raise exception 'This user already owns a barbershop';
  end if;

  insert into public.barbershops (name, owner_user_id)
  values (clean_name, auth.uid())
  returning id into new_shop_id;

  return new_shop_id;
end;
$$;

revoke all on function public.create_my_barbershop(text) from public;
grant execute on function public.create_my_barbershop(text) to authenticated;
