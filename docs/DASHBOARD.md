# Sama Scan dashboard on Vercel

Production path: https://samascan.vercel.app/dashboard

The public medical website remains under `app/(site)`. The private Arabic dashboard has its own layout and style, and uses the center's established administrator login.

## Authentication

The `admin` account authenticates through the `samascan-admin` Supabase Edge Function and its dedicated `samascan_auth` schema. The service stores bcrypt password verifiers, opaque session digests and rate-limit state; it never shares directory tables or accounts. Sessions expire after eight hours. The browser receives a Secure, HttpOnly, SameSite=Lax cookie. Logout revokes the session and clears the cookie. Cross-origin login and logout requests are rejected. No password or secret is committed to Git.

## Report data

`lib/dashboard/snapshot.ts` contains the values from the center's administrative report issued 29 September 2026. Google Business Profile compares two complete 32-day periods: 25 July–25 August and 26 August–26 September. Search Console values run through 29 September, and the weekly search comparison uses two complete weeks. The separate Google Business Profile review provides the nine September profile chat clicks; it does not measure website WhatsApp clicks. The UI displays source dates instead of requesting fresh provider data. Historic values are not presented as live analytics.

The former Windsor OAuth connection, refresh calls, publishing routes and provider storage workflow were removed. The publishing screen is a visual distribution preview with a local image preview and a copy-text action. It does not upload images or send social posts. The campaign screen expresses planned goals, not measured ad outcomes. Competitor cards cite their own public websites; their layout is not a ranking or private-performance comparison.

The overview offers direct preview cards for all seven other sections, and the sidebar groups them by performance and growth. The greeting is attached to the header notification bell; it closes automatically 45 seconds after the dashboard loads. The footer credits the developer, engineer Eslam Elshikh.

## Validation

Run `npm run lint`, `npm run build`, and inspect the authenticated dashboard at desktop and mobile sizes. The private route must redirect anonymous visitors to login. Verify login and logout without sending social content.
