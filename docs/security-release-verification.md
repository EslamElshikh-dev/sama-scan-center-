# Security release verification

The October release pins Next.js / eslint-config-next to 16.4.2 and the sharp
resolved by Next.js to 0.35.5. React remains 19.2.8.

## Reproduce without operational records

```sh
npm ci --no-audit --no-fund
npm run test:crm
npm run lint
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=./tests/helpers/offline-fetch.mjs npm run build
npm run typecheck
npm run test:release
npx --no-install playwright install --with-deps chromium
npm run test:browser
```

The release fixture loads the checked-in auth/CRM SQL and migrations into an
in-memory PGlite database, with generated test passwords and independent accounts.
Original Next HTTP routes and Edge handlers execute against that database under
`service_role`. Outbound fetches are denied, and browser requests are restricted to
the local test origin. No production credentials, records, or synthetic live
appointments are needed. The database is discarded on shutdown.

Coverage includes valid/invalid login, Secure HttpOnly SameSite cookie attributes,
reload, eight-hour expiry, re-login, logout and account suspension. There is no
silent refresh endpoint: normal verification does not extend session expiry.
Reception cannot manage team/audit; marketing cannot read patient records or
record outcomes, while its existing aggregate-report permissions are preserved.

Booking checks cover public intake, receipt, retry deduplication, reception linkage,
confirmation and resource conflicts. Browser checks exercise the booking form and
login, all four services, contact targets and mobile navigation at 320/390/768/1440
pixel widths. HTTP checks crawl every sitemap URL and validate canonical URLs,
JSON-LD, private-path exclusion and the 1200x630 share image.

The GitHub workflow repeats these checks on pull requests and main. After release,
verify the exact main SHA in Vercel, public routes/contact targets, anonymous CRM
rejection, invalid booking rejection and error logs. Do not submit a synthetic
booking to the production backend.
