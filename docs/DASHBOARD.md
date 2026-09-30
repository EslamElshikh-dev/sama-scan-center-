# Sama Scan dashboard on Vercel

Production path: https://samascan.vercel.app/dashboard

The public website lives under app/(site) with unchanged URLs. The dashboard has a separate root layout and stylesheet; APIs use /api/dashboard only. No analytics or medical-site assistant runs on dashboard pages.

## Authentication

Windsor OAuth with PKCE and a client metadata document. Only the verified existing center administrator username hash in lib/dashboard/identity.ts is allowed. Credentials are never copied from ChatGPT. Access tokens stay in Secure, HttpOnly, SameSite cookies and are validated with Windsor before private requests. Sessions expire after at most 8 hours; log in again to renew. OAuth consent must be completed by the owner after deployment. It has not been validated with a real owner session yet.

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
