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

## Apply

1. Create a Supabase project.
2. Use Supabase CLI or SQL Editor to apply `migrations/202611240001_initial_schema.sql`.
3. Configure Auth and test two separate user accounts / barbershops.
4. Verify that a user from one barbershop cannot read or mutate another tenant's records.

## Follow-up migrations required before production

- Safe onboarding RPC/transaction that creates a barbershop, owner membership, and initial seven-day trial atomically.
- Invitation flow for additional staff and role-specific policies.
- Server-side overlap prevention for appointments (database exclusion constraint or transactional RPC).
- Payment webhook signature validation and provider resource lookup.
- A backend-only state transition function for subscription lifecycle.
- Backups, retention, audit log, rate limits, and production security review.

Do not expose the Supabase service-role key in frontend code. This migration is a foundation and must be tested in a staging project before production.
