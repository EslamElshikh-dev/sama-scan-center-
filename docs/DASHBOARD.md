# Sama Scan dashboard on Vercel

Production path: https://samascan.vercel.app/dashboard

The public website lives under app/(site) with unchanged URLs. The dashboard has a separate root layout and stylesheet; APIs use /api/dashboard only. No analytics or medical-site assistant runs on dashboard pages.

## Authentication

The dashboard uses the `admin` account through the `samascan-admin` Supabase Edge Function. Authentication is held in the dedicated, non-exposed `samascan_auth` schema on project `vddoeiggfcwllfxpirep` (the existing al-osairat-directory infrastructure). It shares that project's availability and quotas. It does not query or modify directory tables or directory user accounts. `docs/supabase-auth.sql` defines only the dedicated objects; `backend/samascan-admin/index.mjs` is the function source.

Passwords are bcrypt hashed (cost 12). Sessions are cryptographically random 256-bit tokens; only their SHA-256 digests are stored. They expire after 8 hours and are revoked on logout. The browser token is held in a Secure, HttpOnly, SameSite=Lax cookie. Every protected request checks its session with the authentication service and fails closed. Database-backed throttling allows 20 attempts per 15-minute window across all server instances. A successful login resets the counter. The counter is global for this single administrator; repeated hostile attempts can temporarily lock login.

Private tables have RLS enabled and no public policies or grants. Only the service role may execute the auth RPC. The Edge Function uses the platform's injected secret keys internally; no secret key is deployed to Vercel or exposed in Git. The project publishable key in the Next.js server module is intentionally public and grants no access to the authentication tables/RPC. `verify_jwt=false` on this one Edge Function is intentional: it validates the project key and then validates the administrator password or opaque session for every action. No other function or project authentication setting is changed.

Vercel no longer requires `SAMA_ADMIN_PASSWORD_HASH` or `SAMA_SESSION_SECRET`; the earlier .env import file is obsolete. To rotate the admin password, use an authenticated database-management connection to update the bcrypt verifier and delete this administrator's session rows in one transaction. Never commit a password or verifier to Git. Login and mutation routes reject cross-origin requests; credential-bearing data is never logged.

Windsor OAuth remains a separate data connection inside the dashboard. Admin login does not fabricate provider access. Provider authentication uses PKCE, a client metadata document, Secure/HttpOnly cookies and the verified center-owner username hash.

## Storage activation

The Vercel project did not have a database or Blob store when migrated. Data reads use the authenticated Windsor connection. Saving drafts, selected accounts, improvement tasks and publish receipts requires a dedicated libSQL/Turso database:

- DASHBOARD_DATABASE_URL
- DASHBOARD_DATABASE_AUTH_TOKEN

Images require a **private** Vercel Blob store with BLOB_READ_WRITE_TOKEN. Keep credentials in Vercel environment variables, never in source control. Schema is created idempotently by lib/dashboard/database.ts. Provision services and redeploy before enabling writes. Without storage, write endpoints fail closed with an explicit setup message; no success is simulated.

Images up to 4 MB are decoded server-side, reduced to JPEG and stripped of metadata. Draft images require owner authentication. A random public URL is issued only after the owner confirms publication. This allows connected social providers to fetch the image. Publishing is locked atomically in the database; uncertain delivery is never retried automatically.

Supported publish targets are those discovered from Windsor: Google Business Profile, Facebook organic and Instagram. Other channels are listed with their actual capabilities; connecting a channel does not imply it supports publication. Center accounts must be explicitly selected. GA4 is required for website contact events.

## Validation

Run npm run typecheck, npm run lint, npm run build. Test anonymous API access and OAuth state rejection before production. Live data and social posting require the owner session and provider permissions. No social post is sent as part of deployment verification.

References: https://mcp.windsor.ai/ and https://vercel.com/docs/vercel-blob/using-blob-sdk
