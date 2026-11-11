# Supabase setup for LegalFlow

The web app uses only the Supabase project URL and a publishable key in the browser.
Never add a `service_role` or secret key to a `VITE_*` variable.

## 1. Create a dedicated project

Create a new Supabase project for LegalTech. Do not reuse a project belonging to another app.

## 2. Apply migrations in order

In the Supabase SQL Editor, apply every SQL file in `supabase/migrations` in filename order. The initial schema creates tenant-scoped tables and RLS; the next migration adds the atomic first-organization RPC; the audit migration adds database-managed activity triggers.

## 3. Enable the Data API schema\n\nNew Supabase projects no longer expose `public` tables to the Data API automatically. In Project Settings → API → Data API, enable the `public` schema for the project. The migration grants only the required table privileges and enables RLS, but SQL grants do not by themselves expose a schema through the Data API. Keep `anon` access disabled; the app uses authenticated sessions.\n\n## 4. Configure Auth

In Authentication → URL Configuration, set the Site URL to:

`https://tihonoveckijan8-dev.github.io/LegalTech/`

Add the same URL to Redirect URLs. Configure email confirmation and SMTP according to the environment before inviting real users.

## 5. Add GitHub Actions variables

Repository Settings → Secrets and variables → Actions → Variables:

- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable/anon client key

These are public client configuration values. Never store a Supabase secret/service_role key in the frontend or GitHub Actions variables used by the Vite build.

## 6. Organization onboarding

Without Supabase configuration, the deployed site shows a setup screen instead of presenting temporary demo records as real business data. After a successful sign-in, the app loads active organization memberships. A user without an active organization can create one; the `create_organization` database function creates the organization, owner membership, and audit event in one transaction.

## 7. Verify before production use

Create a test account, confirm email, sign in, and verify that profile creation succeeded. Run tenant-isolation checks with two separate test users before loading real contracts or documents.

The contracts screen now reads organization-scoped contracts from PostgreSQL and creates a counterparty plus a draft contract through the authenticated client. Creation uses two requests, so if contract insertion fails after a new counterparty is created, that counterparty may remain unused and can be cleaned up later.\n\nThe database is not connected merely because the frontend build succeeds. Do not enter production or confidential data until migrations are applied and RLS behavior is verified.

## 8. Private contract documents

The initial migration provisions the private `legal-contracts` Storage bucket. It accepts PDF, DOC, and DOCX files up to 25 MiB. Do not make this bucket public.

Files use the path format `<organization UUID>/<contract UUID>/<unique filename>`. Storage RLS verifies both IDs against the contract row. Active organization members can read files; uploads and deletion are restricted to organization owners, directors, and managers. The `contract_versions` table stores immutable version metadata, including the original filename, MIME type, byte size, uploader, timestamp, and optional change note.

The browser requests a short-lived signed download URL only after the authenticated user has passed Storage RLS. The application does not expose permanent public file URLs.

After applying migrations and configuring the Data API, verify with test accounts:
1. An owner/director/manager can upload a PDF or DOCX to a test contract.
2. The file appears as a new version; uploading another file does not overwrite the earlier version.
3. An active read-only organization member can view the version list and download a file, but cannot upload.
4. A user who is not an active member cannot list or download the file.
5. A file larger than 25 MiB and unsupported formats are rejected.

The frontend currently writes version metadata directly through the authenticated Supabase client. If a concurrent upload creates the same version number, the database unique constraint rejects the duplicate rather than overwriting a file; retry after refreshing the history.


## 9. Activity audit

The migration `20261111120000_add_audit_triggers.sql` adds append-only audit events for contract creation, changes to contract fields, and document-version uploads. PostgreSQL triggers write these rows inside the same transaction as the original operation; the browser has no INSERT, UPDATE, or DELETE grant on `audit_events`.

The activity screen is visible only to organization owners and directors. This is enforced twice: the interface hides the menu item for other roles, and the `audit_select_owner_director` RLS policy limits database rows. Event metadata stores changed field names rather than full old/new contract values, avoiding unnecessary duplication of confidential terms.

After applying all migrations, test that:
1. Creating a contract creates a `contract.created` event.
2. Updating one or more contract fields creates one `contract.updated` event listing changed field names.
3. Uploading a new contract version creates a `contract.document_version_uploaded` event.
4. An owner and director can read the organization journal.
5. A manager, lawyer, accountant, or user from another organization receives no audit rows.
6. The authenticated browser client cannot insert, update, or delete `audit_events` directly.
