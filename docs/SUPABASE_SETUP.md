# Supabase setup for LegalFlow

The web app uses only the Supabase project URL and a publishable key in the browser.
Never add a `service_role` or secret key to a `VITE_*` variable.

## 1. Create a dedicated project

Create a new Supabase project for LegalTech. Do not reuse a project belonging to another app.

## 2. Apply migrations in order

In the Supabase SQL Editor, apply every SQL file in `supabase/migrations` in filename order. The initial schema creates tenant-scoped tables and RLS. The next migration adds the atomic first-organization RPC.

## 3. Configure Auth

In Authentication → URL Configuration, set the Site URL to:

`https://tihonoveckijan8-dev.github.io/LegalTech/`

Add the same URL to Redirect URLs. Configure email confirmation and SMTP according to the environment before inviting real users.

## 4. Add GitHub Actions variables

Repository Settings → Secrets and variables → Actions → Variables:

- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable/anon client key

These are public client configuration values. Never store a Supabase secret/service_role key in the frontend or GitHub Actions variables used by the Vite build.

## 5. Verify before production use

Create a test account, confirm email, sign in, and verify that profile creation succeeded. Run tenant-isolation checks with two separate test users before loading real contracts or documents.

The database is not connected merely because the frontend build succeeds. Do not enter production or confidential data until migrations are applied and RLS behavior is verified.
