# Authentication and onboarding — Supabase

This migration adds:

- Automatic profile creation when a Supabase Auth user is created.
- An authenticated RPC, `create_my_barbershop(shop_name)`, to create the user's first barbershop.
- The existing database trigger then creates owner membership and the seven-day trial in the same transaction.
- Duplicate owner onboarding is rejected.

## Apply migrations in order

1. `202611240001_initial_schema.sql`
2. `202611240002_auth_onboarding.sql`

## Frontend flow

1. Register using Supabase Auth (email/password or configured OAuth).
2. Confirm email if email confirmation is enabled.
3. Sign in.
4. Call `supabase.rpc('create_my_barbershop', { shop_name: 'Nome da barbearia' })`.
5. Store the returned UUID in application state; do not trust a tenant ID supplied by a URL or arbitrary form field.
6. Read the user's shops via RLS-protected queries.

## Important

- Configure the Supabase project URL and anon/publishable key in frontend environment variables.
- Never expose the service-role key.
- Do not send a password to application tables or logs.
- Add rate limiting/CAPTCHA to public registration at the hosting/auth layer.
- Test signup, email confirmation, sign-in, password reset, duplicate onboarding, and cross-tenant access using two separate accounts in a staging project.
- This is schema/RPC groundwork. No Supabase project has been provisioned or connected by this commit.
