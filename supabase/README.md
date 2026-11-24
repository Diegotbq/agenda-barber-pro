# Supabase database foundation

This migration establishes the first multi-tenant database layer for Agenda Pro.

## Included tables

- `profiles`: user profile linked to Supabase Auth.
- `barbershops`: each business/tenant.
- `barbershop_members`: membership and role within a tenant.
- `services`, `clients`, `appointments`: operational barber shop data.
- `billing_subscriptions`: server-managed trial and Mercado Pago subscription state.
- `billing_webhook_events`: webhook inbox with provider-event uniqueness for idempotent processing.

## Important security behavior

- RLS is enabled on every table.
- Operational rows are scoped by `barbershop_id` and membership.
- A client cannot write subscription status or webhook events.
- Billing writes must use a trusted backend with the Supabase service-role key, stored only as a server secret.
- Appointment foreign keys include `barbershop_id`, preventing a client or service from another barbershop being attached to an appointment.

## Team invitations (Edge Function)

The team screen can send invitations through the `invite-team-member` Edge Function. Deploy it only after creating a Supabase project and configuring the function secrets:

```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co SUPABASE_ANON_KEY=YOUR_ANON_KEY SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy invite-team-member
```

Keep the service-role key only in Supabase Function secrets. The function verifies the caller's session and owner/admin membership, restricts role assignment, sends the Supabase Auth invitation email, and links the invited account to the shop. Configure the Supabase Auth email templates and SMTP provider before sending real invitations. Test owner, admin, unauthorized member, duplicate email, and invitation acceptance in a staging project.

## Apply

1. Create a Supabase project.
2. Use Supabase CLI or SQL Editor to apply `migrations/202611240001_initial_schema.sql`.
3. Configure Auth and test two separate user accounts / barbershops.
4. Verify that a user from one barbershop cannot read or mutate another tenant's records.

## Follow-up migrations required before production

- Safe onboarding RPC/transaction that creates a barbershop, owner membership, and initial seven-day trial atomically.
- Invitation flow for additional staff and role-specific policies.
- Apply `migrations/202611240003_appointment_safety.sql` to enforce server-side appointment overlap prevention and validate that assigned professionals belong to the same barbershop.
- Apply `migrations/202611240004_business_hours_and_blocks.sql` to add weekly opening hours and closure blocks for breaks, holidays, and time off. The app's Settings screen uses `barbershop_business_hours` to save the weekly schedule.
- Apply `migrations/202611240005_team_directory.sql` to enable the authenticated team directory. It exposes member names and roles only after checking that the caller belongs to the requested barbershop; membership writes remain server-only until secure invitations are implemented.
- Apply `migrations/202611240006_appointment_role_access.sql` to restrict appointment visibility and writes by team role: owners/admins/receptionists can manage the shop agenda, while barbers can only access appointments assigned to their own user account. Barbers cannot delete appointments.
- Payment webhook signature validation and provider resource lookup.
- A backend-only state transition function for subscription lifecycle.
- Backups, retention, audit log, rate limits, and production security review.

Do not expose the Supabase service-role key in frontend code. This migration is a foundation and must be tested in a staging project before production.
