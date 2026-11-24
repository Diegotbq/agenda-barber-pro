-- Agenda Pro: initial multi-tenant schema for Supabase Postgres
-- Apply with Supabase CLI or SQL editor. Review in staging before production.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbershop_members (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','barber','receptionist')),
  created_at timestamptz not null default now(),
  primary key (barbershop_id, user_id)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, barbershop_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, barbershop_id)
);

create index if not exists clients_shop_name_idx on public.clients (barbershop_id, full_name);
create index if not exists clients_shop_phone_idx on public.clients (barbershop_id, phone);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  professional_user_id uuid references auth.users(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','completed','cancelled','no_show')),
  price_cents integer not null check (price_cents >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, barbershop_id) references public.clients(id, barbershop_id),
  foreign key (service_id, barbershop_id) references public.services(id, barbershop_id),
  check (ends_at > starts_at)
);

create index if not exists appointments_shop_start_idx on public.appointments (barbershop_id, starts_at);
create index if not exists appointments_professional_start_idx on public.appointments (professional_user_id, starts_at);

-- Subscription state is server-managed. Never grant browser clients direct writes.
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null unique references public.barbershops(id) on delete restrict,
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  provider_preapproval_id text unique,
  status text not null default 'trialing'
    check (status in ('trialing','awaiting_payment','active','past_due','canceled','expired')),
  plan_amount_cents integer not null default 1990 check (plan_amount_cents = 1990),
  currency char(3) not null default 'BRL' check (currency = 'BRL'),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  current_period_ends_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Webhook inbox: unique provider event id prevents duplicate processing.
create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  provider_event_id text not null,
  event_type text not null,
  resource_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  payload jsonb not null default '{}'::jsonb,
  unique (provider, provider_event_id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','barbershops','services','clients','appointments','billing_subscriptions'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Security-definer membership helper avoids recursive RLS evaluation on memberships.
create or replace function public.is_barbershop_member(target_barbershop_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.barbershop_members m
    where m.barbershop_id = target_barbershop_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_barbershop_member(uuid) from public;
grant execute on function public.is_barbershop_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.barbershops enable row level security;
alter table public.barbershop_members enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy "profiles_select_self" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "barbershops_select_members" on public.barbershops
  for select to authenticated using (public.is_barbershop_member(id));
create policy "barbershops_insert_owner" on public.barbershops
  for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "barbershops_update_admins" on public.barbershops
  for update to authenticated
  using (exists (select 1 from public.barbershop_members m where m.barbershop_id = id and m.user_id = (select auth.uid()) and m.role in ('owner','admin')))
  with check (exists (select 1 from public.barbershop_members m where m.barbershop_id = id and m.user_id = (select auth.uid()) and m.role in ('owner','admin')));

create policy "members_select_same_shop" on public.barbershop_members
  for select to authenticated using (public.is_barbershop_member(barbershop_id));
-- Membership changes are intentionally server-only until an invitation flow is implemented.

create policy "services_members_all" on public.services
  for all to authenticated using (public.is_barbershop_member(barbershop_id))
  with check (public.is_barbershop_member(barbershop_id));
create policy "clients_members_all" on public.clients
  for all to authenticated using (public.is_barbershop_member(barbershop_id))
  with check (public.is_barbershop_member(barbershop_id));
create policy "appointments_members_all" on public.appointments
  for all to authenticated using (public.is_barbershop_member(barbershop_id))
  with check (public.is_barbershop_member(barbershop_id));

-- No authenticated-user policies for billing tables: only trusted server/service role may write.
create policy "billing_subscription_select_members" on public.billing_subscriptions
  for select to authenticated using (public.is_barbershop_member(barbershop_id));

-- Prevent direct browser writes even if table grants are broadened later.
revoke insert, update, delete on public.billing_subscriptions from anon, authenticated;
revoke all on public.billing_webhook_events from anon, authenticated;

-- Ensure the API roles have only the intended table access.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.barbershops to authenticated;
grant select on public.barbershop_members to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select on public.billing_subscriptions to authenticated;
