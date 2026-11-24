-- Agenda Pro: safe team directory for authenticated shop members.
-- Membership writes remain server-only until the invitation workflow is deployed.

create or replace function public.get_barbershop_team(target_barbershop_id uuid)
returns table (
  user_id uuid,
  full_name text,
  role text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_barbershop_member(target_barbershop_id) then
    raise exception 'Not authorized for this barbershop';
  end if;

  return query
    select m.user_id,
           coalesce(nullif(p.full_name, ''), 'Profissional'),
           m.role,
           m.created_at
    from public.barbershop_members m
    left join public.profiles p on p.id = m.user_id
    where m.barbershop_id = target_barbershop_id
    order by case m.role when 'owner' then 1 when 'admin' then 2 when 'barber' then 3 else 4 end,
             p.full_name;
end;
$$;

revoke all on function public.get_barbershop_team(uuid) from public;
grant execute on function public.get_barbershop_team(uuid) to authenticated;

comment on function public.get_barbershop_team(uuid) is
  'Returns the names and roles of members only when the caller belongs to the requested barbershop.';
