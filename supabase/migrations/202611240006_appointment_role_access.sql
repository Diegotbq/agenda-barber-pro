-- Agenda Pro: restrict appointment visibility and writes by team role.
-- Owners/admins/receptionists manage the whole shop agenda.
-- Barbers can only read and manage appointments assigned to themselves.
-- Apply after 202611240005_team_directory.sql.

drop policy if exists "appointments_members_all" on public.appointments;

create policy "appointments_select_by_team_role" on public.appointments
  for select to authenticated
  using (
    exists (
      select 1
      from public.barbershop_members m
      where m.barbershop_id = appointments.barbershop_id
        and m.user_id = (select auth.uid())
        and (
          m.role in ('owner', 'admin', 'receptionist')
          or (m.role = 'barber' and appointments.professional_user_id = (select auth.uid()))
        )
    )
  );

create policy "appointments_insert_by_team_role" on public.appointments
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.barbershop_members m
      where m.barbershop_id = appointments.barbershop_id
        and m.user_id = (select auth.uid())
        and (
          m.role in ('owner', 'admin', 'receptionist')
          or (m.role = 'barber' and appointments.professional_user_id = (select auth.uid()))
        )
    )
  );

create policy "appointments_update_by_team_role" on public.appointments
  for update to authenticated
  using (
    exists (
      select 1
      from public.barbershop_members m
      where m.barbershop_id = appointments.barbershop_id
        and m.user_id = (select auth.uid())
        and (
          m.role in ('owner', 'admin', 'receptionist')
          or (m.role = 'barber' and appointments.professional_user_id = (select auth.uid()))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.barbershop_members m
      where m.barbershop_id = appointments.barbershop_id
        and m.user_id = (select auth.uid())
        and (
          m.role in ('owner', 'admin', 'receptionist')
          or (m.role = 'barber' and appointments.professional_user_id = (select auth.uid()))
        )
    )
  );

create policy "appointments_delete_by_team_role" on public.appointments
  for delete to authenticated
  using (
    exists (
      select 1
      from public.barbershop_members m
      where m.barbershop_id = appointments.barbershop_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'receptionist')
    )
  );
