-- Barbershop operating hours and schedule blocks.
-- Apply after 202611240003_appointment_safety.sql.

create table if not exists public.barbershop_business_hours (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  opens_at time,
  closes_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, weekday),
  check (
    (is_closed and opens_at is null and closes_at is null)
    or
    (not is_closed and opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);

create table if not exists public.barbershop_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_user_id uuid references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (id, barbershop_id)
);

create index if not exists schedule_blocks_shop_period_idx
  on public.barbershop_schedule_blocks using gist
  (barbershop_id, tstzrange(starts_at, ends_at, '[)'));

create index if not exists schedule_blocks_professional_period_idx
  on public.barbershop_schedule_blocks
  (professional_user_id, starts_at, ends_at);

drop trigger if exists set_updated_at on public.barbershop_business_hours;
create trigger set_updated_at before update on public.barbershop_business_hours
  for each row execute function public.set_updated_at();

alter table public.barbershop_business_hours enable row level security;
alter table public.barbershop_schedule_blocks enable row level security;

create policy "business_hours_members_all" on public.barbershop_business_hours
  for all to authenticated
  using (public.is_barbershop_member(barbershop_id))
  with check (public.is_barbershop_member(barbershop_id));

create policy "schedule_blocks_members_all" on public.barbershop_schedule_blocks
  for all to authenticated
  using (public.is_barbershop_member(barbershop_id))
  with check (
    public.is_barbershop_member(barbershop_id)
    and (
      professional_user_id is null
      or exists (
        select 1 from public.barbershop_members m
        where m.barbershop_id = barbershop_schedule_blocks.barbershop_id
          and m.user_id = barbershop_schedule_blocks.professional_user_id
          and m.role in ('owner','admin','barber')
      )
    )
  );

grant select, insert, update, delete on public.barbershop_business_hours to authenticated;
grant select, insert, update, delete on public.barbershop_schedule_blocks to authenticated;

comment on table public.barbershop_business_hours is
  'Weekly operating hours per barbershop. weekday follows PostgreSQL: Sunday=0 through Saturday=6.';
comment on table public.barbershop_schedule_blocks is
  'Closed periods such as breaks, holidays, vacations, and professional-specific time off.';
