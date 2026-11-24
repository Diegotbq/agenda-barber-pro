-- Prevent concurrent double-booking at the database level.
-- Apply after 202611240002_auth_onboarding.sql.

create extension if not exists btree_gist with schema public;

-- Fail with an actionable message instead of silently accepting legacy overlaps.
do $$
begin
  if exists (
    select 1
    from public.appointments a
    join public.appointments b
      on b.barbershop_id = a.barbershop_id
     and b.professional_user_id = a.professional_user_id
     and b.id > a.id
     and b.starts_at < a.ends_at
     and b.ends_at > a.starts_at
    where a.professional_user_id is not null
      and a.status <> 'cancelled'
      and b.status <> 'cancelled'
  ) then
    raise exception 'Existing overlapping appointments found. Resolve them before applying the appointment overlap constraint.';
  end if;
end;
$$;

-- Half-open ranges [start, end) allow back-to-back appointments.
-- Cancelled appointments do not reserve a professional's time.
alter table public.appointments
  add constraint appointments_no_professional_overlap
  exclude using gist (
    barbershop_id with =,
    professional_user_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (professional_user_id is not null and status <> 'cancelled');

-- A professional assigned to an appointment must belong to that same shop.
-- Receptionists are not assignable as service providers.
create or replace function public.validate_appointment_professional()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.professional_user_id is not null and not exists (
    select 1
    from public.barbershop_members m
    where m.barbershop_id = new.barbershop_id
      and m.user_id = new.professional_user_id
      and m.role in ('owner', 'admin', 'barber')
  ) then
    raise exception 'The selected professional is not an active professional in this barbershop.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_appointment_professional on public.appointments;
create trigger validate_appointment_professional
  before insert or update of barbershop_id, professional_user_id
  on public.appointments
  for each row execute function public.validate_appointment_professional();

revoke all on function public.validate_appointment_professional() from public;

comment on constraint appointments_no_professional_overlap on public.appointments is
  'Prevents overlapping non-cancelled appointments for the same professional within one barbershop.';
