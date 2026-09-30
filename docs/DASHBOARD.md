# Sama Scan dashboard on Vercel

Production path: https://samascan.vercel.app/dashboard

The public website lives under app/(site) with unchanged URLs. The dashboard has a separate root layout and stylesheet; APIs use /api/dashboard only. No analytics or medical-site assistant runs on dashboard pages.

## Authentication

The dashboard supports a server-verified `admin` login. Configure these **sensitive Production environment variables** on the existing Vercel project, then redeploy:

- `SAMA_ADMIN_PASSWORD_HASH`: `scrypt$32768$<16-byte hex salt>$<32-byte hex digest>` (N=32768, r=8, p=1).
- `SAMA_SESSION_SECRET`: independent random secret, at least 43 characters.

No password or deployment secret belongs in Git. Sessions use HMAC-SHA256, expire after 8 hours, and are stored in a Secure, HttpOnly, SameSite=Lax cookie. Password-hash or signing-secret rotation invalidates previous sessions. Login and mutation routes reject cross-origin requests. The in-process IP-hash throttle allows five attempts per 15 minutes; it is a per-instance defense, not a distributed rate limiter. A platform firewall limit can strengthen this when configured. Logs never contain entered credentials.

Before private configuration exists, the current owner-only Windsor login remains available, and the new password form is disabled. After configuration, dashboard access requires the admin session. Windsor OAuth becomes a separate data connection inside the dashboard; the local login does not fabricate provider access. Provider authentication still uses PKCE, a client metadata document, Secure/HttpOnly cookies and the verified center-owner username hash. Only the account owner can complete Windsor consent.

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
