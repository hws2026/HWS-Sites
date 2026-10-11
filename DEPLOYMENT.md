# GitHub Pages + Cloudflare + Supabase

The editor, your platform admin panel, customer portal and visitor viewer build into `pages-dist`. Hash routes support refreshes under `/HWS-Sites/` without server rewrites. Cloudflare runs the API, D1 database and hourly reminder scheduler. Supabase handles private image storage, email/password sign-in, confirmation and password reset. R2 is not required by this deployment.

The supplied Supabase publishable key is public client configuration in `pages/public-config.ts`. Private storage uses a separate server secret named `SUPABASE_STORAGE_SECRET_KEY`, stored only in Cloudflare encrypted secrets. Never put that secret in GitHub Pages variables, source files or chat. The backend verifies access tokens with Supabase, checks confirmed email, strips browser-supplied identity headers and restricts platform administration to configured Supabase user UUIDs. Website access still uses explicit editor/viewer assignments.

## Current launch status

The confirmed owner account and Cloudflare account are selected in `backend/wrangler.json`. These UUIDs are identifiers, not passwords or API secrets. The `hws-suite` D1 database has been created and all four migrations applied. The API Worker is deployed at `https://hws-suite-api.huskysol.workers.dev`; its live HTTPS health check, unauthenticated admin rejection (401), and suite-domain CORS preflight (204) passed. The private Supabase bucket `hws-suite-media` exists with an 8 MB limit and JPEG/PNG/WebP/GIF allowlist. Cloudflare now shows `SUPABASE_STORAGE_SECRET_KEY` as an encrypted production secret; its value and an actual upload have not been verified. GitHub Pages is serving the suite over HTTPS. Both the automatic README/Jekyll deployment and the suite workflow ran, so select **GitHub Actions** as the Pages source to prevent competing deployments. Supabase redirect settings and email/payment provider configuration still need verification or completion. The owner handles source uploads; the latest login-first changes require a new upload and Pages deployment. Stripe and customer custom domains are optional for the first admin-panel launch.

Public DNS currently returns `suite.huskysol.com CNAME hws2026.github.io`; `huskysol.com` uses `domaincontrol.com` nameservers. GitHub Pages must still claim that custom hostname and provision its certificate. The prepared CNAME file does not mean HTTPS is already enabled.

After deploying the login-first update, `https://suite.huskysol.com/` opens sign-in for signed-out visitors. Signed-in visitors are routed to their account's workspace. Direct admin and customer-portal links also require sign-in, and private editor links open the website-specific login. Normal sign-in routes the configured owner to `#/admin` and customers to `#/portal`; an existing permitted destination, such as billing, is preserved. Customers must have a confirmed Supabase account. Assign their website access under **Access & roles**; use their contact email on the customer record for billing access.

The backend update for empty workspaces and personal websites is deployed. The ten untouched seeded customers and their draft websites were removed from the production database after saving a recovery export; zero customers, zero websites, and the owner's workspace were verified afterward. Supabase contained only the real owner login, which was preserved. Initialization no longer seeds demo accounts or websites, and the frontend no longer substitutes fake customer records while loading or after sign-in errors. Template previews remain available separately.

After uploading the latest frontend source, choose **New website → Website owner → My account**, name the website, and select any of the twelve starting templates. This creates a website owned by the signed-in administrator without a customer record or a separate access grant. These personal websites also appear in the owner's portal. Customer websites still require a customer from the same workspace. The updated code passed 88 backend, 61 commerce, and 16 storage checks; the complete personal-site creation flow was also checked in an isolated local browser preview. No real website was created during that preview.

## Suite domain and HTTPS

The suite's production hostname is `suite.huskysol.com`. `public/CNAME` is copied into the static build, but GitHub Actions deployments also require **Repository Settings → Pages → Custom domain** to be set to this hostname. A CNAME file alone does not enable HTTPS.

Configure the GitHub Pages custom domain before adding its DNS record. At the authoritative DNS provider for `huskysol.com`, add a CNAME named `suite` pointing to `hws2026.github.io` (no repository path). Use DNS-only while GitHub validates the domain and issues its certificate. In GitHub Pages, enable **Enforce HTTPS** when the certificate is ready; this setting redirects HTTP to HTTPS. The option may take time to become available.

The Pages workflow obtains the correct root build path from GitHub's Pages configuration. The backend allows requests from `https://suite.huskysol.com` and returns checkout/billing links there. Supabase Site URL and allowed confirmation/recovery redirects must use the same HTTPS address. Keep previously valid redirects only when they are still needed during migration.

[GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) · [GitHub HTTPS instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

## First deployment

1. The selected owner account is already confirmed and its UUID is configured. For a different deployment, copy the owner UUID from Supabase → Authentication → Users into `ADMIN_SUPABASE_USER_IDS`. Customers must never be added there.
2. Configure Supabase Authentication → URL Configuration: Site URL `https://suite.huskysol.com/`; allow confirmation redirects to that root and recovery redirects to `https://suite.huskysol.com/?recovery=1`, including the optional `&site=SITE-ID` query parameter used by site-specific resets. Password recovery uses PKCE. Reset links should be opened in the same browser that requested them. Add localhost URLs only to a development project.
3. Configure Supabase custom SMTP with a verified sender for reliable customer confirmation and password-reset emails. The built-in mail service is intended for testing and has recipient/rate restrictions. Configure the desired password and authentication rate limits in Supabase.
4. The D1 database and private Supabase bucket already exist; do not create duplicates. Add a Supabase secret API key to the deployed Worker as the encrypted secret `SUPABASE_STORAGE_SECRET_KEY`, as described below. R2 activation is unnecessary.
5. Run `node scripts/configure-backend.mjs`, `npm run db:backend`, then `npm run deploy:backend`. Reapplying migrations skips those already completed. The frontend URL, database ID, account ID, owner UUID, publishable Supabase key, and project URL are already present; environment overrides are supported. On a different machine, sign in with `npx wrangler login` first. This step is for subsequent backend updates; the first deployment is already complete.
6. Select GitHub Actions as the Pages source in repository Settings → Pages. The workflow already uses `https://hws-suite-api.huskysol.workers.dev` and deploys `pages-dist`. Optional repository variable `HWS_API_URL` overrides that URL for a different backend (HTTPS origin, no trailing slash).
7. For backend redeployments through Actions, configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository/environment secrets; configure `HWS_FRONTEND_URL`, `HWS_D1_ID`, and `ADMIN_SUPABASE_USER_IDS` as variables. Use a token scoped to this account's Worker/D1 deployment resources. Never place secrets in source files or chat.

For the first GitHub upload, extract `HWS-Sites-source.zip` and put the contents in the repository root, with `package.json` and `.github/workflows` at the top level. Uploading the ZIP itself does not deploy the suite. Select **GitHub Actions** in Pages, set **Custom domain** to `suite.huskysol.com`, and enable **Enforce HTTPS** when its certificate is ready. The backend URL is already included in the workflow. Then run **Deploy suite to GitHub Pages** from Actions. If an early push runs before these settings are ready, that run will fail safely; rerun it after configuration. Enable **Enforce HTTPS** once GitHub's certificate is available.

## Private Supabase Storage

The standalone Worker is configured with `MEDIA_STORAGE=supabase` and `SUPABASE_STORAGE_BUCKET=hws-suite-media`. The bucket is private with an 8 MB file limit and `image/jpeg`, `image/png`, `image/webp`, `image/gif` allowed. It has no browser upload/read policies: all operations go through HWS, which checks D1 website assignments before using its server key. A public website can fetch only images referenced by its visible published snapshot. Responses stream through the Worker without exposing a storage key or signed URL. The original Sites runtime and local compatibility tests may still use an R2 binding.

To connect storage:

1. In Supabase **Project Settings → API Keys**, use a server-only secret key (`sb_secret_…`) for the HWS backend. A separate key for this backend can be revoked independently. A publishable key cannot perform these privileged storage operations.
2. In Cloudflare **Workers & Pages → hws-suite-api → Settings → Variables and Secrets**, add type **Secret**, name `SUPABASE_STORAGE_SECRET_KEY`, and paste the value directly there. Save/deploy it. Alternatively run `npx wrangler secret put SUPABASE_STORAGE_SECRET_KEY --config backend/wrangler.json` locally and enter the value at its hidden prompt. Do not send it through chat or put it in a `VITE_` variable.
3. Sign in to the deployed suite and upload an image to an assigned site. The API checks the bucket is private before every upload and refuses to write if it is public. Publishing alone does not grant public access; enable it explicitly under Domains.

The admin/database API can run before this key is configured, but image uploads return a service-unavailable error until it is connected. This project had no existing storage bucket or objects to migrate. For another deployment, create a private bucket with the same limits before setting these variables. Do not make the bucket public to fix an authorization error.

[Supabase private bucket access](https://supabase.com/docs/guides/storage/serving/downloads) · [Server secret keys](https://supabase.com/docs/guides/getting-started/api-keys)


## Email reminders

Custom reminders choose an existing customer, subject, plain-text message, send time and one-time/daily/weekly/monthly schedule. Automatic rules cover unfinished onboarding and upcoming published events. Rules start disabled. Onboarding reminders target customers marked Onboarding with an unpublished active website. Event reminders require `startsAt` set using the editor's event date/time control; the system does not guess dates from labels. Both types email the customer contact, not website visitors. Paused customers are skipped. Unpublished/removed events cancel their queued automatic messages. Turning off a rule cancels its queued messages. Stopped automatic jobs remain stopped.

Cloudflare checks due jobs hourly. Configure `RESEND_API_KEY` using `npx wrangler secret put RESEND_API_KEY --config backend/wrangler.json`; set `EMAIL_FROM` to your verified sender in the Worker environment. Resend's SMTP can also serve Supabase authentication mail. No email is sent until sender credentials are configured and a reminder or rule is explicitly enabled. Successful deliveries are recorded, concurrent runs cannot claim the same delivery twice, and uncertain/failed delivery stops the reminder for admin review rather than retrying silently.

## Stripe payments

**Admin → Billing → Assign amount** creates a monthly, yearly, or one-time agreement. Amounts are stored as integer minor units; USD, CAD, EUR, GBP, AUD and SGD are supported. Each agreement belongs to a customer record. A customer can pay only when their verified sign-in email matches that record's contact email. Site editor/viewer access does not grant access to another contact's billing.

1. Start with a separate test deployment/database and Stripe test keys. Keep test and live customers, subscriptions and invoices in separate databases; do not switch a database containing test Stripe IDs to live keys.
2. Set `STRIPE_SECRET_KEY` in Worker secret storage: `npx wrangler secret put STRIPE_SECRET_KEY --config backend/wrangler.json`.
3. In Stripe Workbench, add the backend endpoint `https://YOUR-WORKER/api/stripe/webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, and `invoice.voided`. The API requests use version `2025-03-31.basil`; use that version for the endpoint when offered. The handler retrieves current objects from Stripe, rather than trusting expanded event objects.
4. Store the endpoint's signing secret with `npx wrangler secret put STRIPE_WEBHOOK_SECRET --config backend/wrangler.json`.
5. Create a Stripe billing-portal configuration and set its `bpc_…` ID as `STRIPE_PORTAL_CONFIGURATION_ID` in the Worker configuration or GitHub variable. Enable invoices, payment-method updates, and your chosen cancellation policy. Keep customer price/plan switching disabled when only you should assign prices. [Stripe portal session documentation](https://docs.stripe.com/api/customer_portal/sessions/create).

Checkout takes prices from the backend, checks customer ownership, and reuses an existing open session. A successful return URL is not payment confirmation: signed Stripe webhooks update payment history. Duplicate events are recorded once; out-of-order subscription events are retried until Checkout confirmation arrives. Customer billing offers **Manage subscription** after a subscription exists. One-time payments generate an invoice.

An unpaid agreement can be edited before checkout or disabled. Started checkouts must expire before their price can change. Existing subscriptions are managed in Stripe; creating another agreement adds another charge and does not replace a subscription. Refunds, disputes, tax registration/calculation, and automatic website suspension are not implemented here. No card details pass through or are stored by HWS.

## Public websites and custom domains

Publish from the editor, then enable **Domains → Public website access**. The included address is `https://YOUR-WORKER/sites/SITE-ID/`; inner pages use `/sites/SITE-ID/PAGE-SLUG`. This works without buying a domain. The suite's `#/website/...` review route continues to require assigned access.

For custom domains, configure [Cloudflare for SaaS with a Worker fallback origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/):

1. Add a domain you own to Cloudflare and enable Cloudflare for SaaS on that zone. A domain used for platform routing is needed for custom-domain hosting, even though the admin panel can remain on GitHub Pages.
2. Create the originless fallback record described by Cloudflare (for example a proxied AAAA `customers.your-platform-domain.com` → `100::`) and set it as the SaaS fallback origin. Route SaaS traffic to `hws-suite-api` with a zone Worker route `*/*`. This also captures your zone's own traffic; add more-specific exclusions for any existing services. These DNS and routing settings are not automatically changed by the app.
3. Set non-secret Worker variables `CUSTOM_DOMAIN_ZONE_ID` and `CUSTOM_DOMAIN_TARGET` (the customer CNAME target, e.g. `customers.your-platform-domain.com`). Create a token scoped to this zone with **SSL and Certificates: Edit**, and store it using `npx wrangler secret put CLOUDFLARE_SAAS_TOKEN --config backend/wrangler.json`. Use a separate deployment token for Workers/D1.
4. In **Domains**, select a website and add a hostname such as `www.customer.org`. Add the displayed `_hws-verify` TXT record at the customer's DNS provider and choose **Check connection**. HWS checks ownership before creating a provider hostname. Add the displayed CNAME and any certificate/ownership TXT records returned by Cloudflare. Check again after DNS propagation.
5. A domain is active only when ownership is verified and Cloudflare reports both hostname and certificate active. Choose **Make primary** to redirect aliases and the included public address to it. Leave ownership/certificate records in DNS for subsequent checks and renewal. Certificate TXT challenges can change; refresh the connection status if Cloudflare requests revalidation.

Use a `www` subdomain first. Apex/root support depends on DNS flattening/ALIAS or the provider's apex-proxying configuration; the application does not provision apex-proxying entitlements. Do not add the SaaS zone apex itself as a custom hostname. A disconnected domain stops serving immediately, even if provider cleanup must be retried.

Public routes serve only the published snapshot of a non-archived site with public access enabled. Uploaded images are public only when they belong to that site and are referenced in its visible published blocks/branding. Unpublishing, archiving or disabling public access blocks the pages and images. Hidden navigation pages remain accessible by their URL; hiding a navigation item is not an access restriction. Public pages are rendered by a separate visitor bundle; site Admin links return to the site-specific login on the main suite.

## Local checks

- `npm run typecheck`
- `npm run verify:calendar` — shared calendar synchronization, migration, timezone and validation checks
- `npm run verify:templates` — 377 template/block combinations and 1,356 generated pages
- `PAGES_BASE_PATH=/HWS-Sites/ npm run build:pages`
- `npx wrangler deploy --config backend/wrangler.json --dry-run --outdir backend-dist`
- `npm run verify:backend` — local Miniflare, mock Supabase and mock email delivery
- `npm run verify:commerce` — local Miniflare, mocked Stripe/DNS/Cloudflare, billing isolation and public-publication checks
- `npm run verify:storage` — 16 checks against mocked Supabase Storage, including private-bucket enforcement, upload authorization and published-image access
- `npm run dev:pages` — static frontend preview

The earlier Sites-hosted database is separate from the new Cloudflare database. This deployment does not automatically migrate its customer content. The original hosting manifest is retained for that deployment; GitHub Pages and the standalone Worker do not use it.


## Deploying the expanded template/calendar update

Upload the complete source, including new `lib/`, `app/`, `pages/`, and `scripts/` files. Deploy the backend and Pages frontend from the same source version: the backend validator now accepts up to 600 pages, shared calendars, nested modules, saved sections and expanded color settings. An older backend rejects these drafts. No new database migration is needed for this update; data stays inside the existing website snapshots. Deploy the backend before inviting users to save with the new editor, and finish the Pages deployment promptly.

Existing customer websites retain their saved content. New template structures apply to newly created websites or when choosing a replacement template. Existing websites can enable the calendar without replacing their template. Publishing remains explicit. The suite's signup option is removed; use Supabase's administrative invitation flow to provision an auth account, then assign that email to the appropriate customer/site in HWS.
