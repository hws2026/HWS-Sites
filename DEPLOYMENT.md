# GitHub Pages + Cloudflare + Supabase

The editor, your platform admin panel, customer portal and visitor viewer build into `pages-dist`. Hash routes support refreshes under `/HWS-Sites/` without server rewrites. Cloudflare runs the API, D1 database and hourly reminder scheduler. Supabase handles private image storage, email/password sign-in, confirmation and password reset. R2 is not required by this deployment.

The supplied Supabase publishable key is public client configuration in `pages/public-config.ts`. Private storage uses a separate server secret named `SUPABASE_STORAGE_SECRET_KEY`, stored only in Cloudflare encrypted secrets. Never put that secret in GitHub Pages variables, source files or chat. The backend verifies access tokens with Supabase, checks confirmed email, strips browser-supplied identity headers and restricts platform administration to configured Supabase user UUIDs. Website access still uses explicit editor/viewer assignments.

## Current launch status

The production suite is `https://suite.huskysol.com/` on GitHub Pages, and the backend is `https://hws-suite-api.huskysol.workers.dev`. Supabase provides authentication and the private `hws-suite-media` image bucket. The confirmed owner UUID is in `backend/wrangler.json`; these public identifiers are not credentials.

On October 13, 2026, migration 0005 and Worker version `dbd8d964-6313-46a6-9433-b4bb912d6273` were deployed. This connects publishing to anonymous public access, supports unpublishing, and adds customer archive/delete. The existing published Husky Solutions website was confirmed accessible without signing in. Its current Google Site DNS has not been changed.

The Free Cloudflare Pages project `hws-customer-sites` is deployed with the `HWS_BACKEND` service binding. Its domain target is `hws-customer-sites.pages.dev`. The encrypted backend secret `CLOUDFLARE_PAGES_TOKEN` is saved for automatic domain management, with account-scoped Cloudflare Pages Edit permission. Each customer hostname still requires the displayed DNS records and successful certificate validation. No paid plan or paid add-on was activated. GitHub Pages continues hosting the admin suite.

GitHub Actions still needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for automated backend deployments; the current backend was deployed directly with Wrangler OAuth. Deploy the matching frontend source through the existing Pages workflow. Supabase custom SMTP, reminders and Stripe are separate optional integrations that require their own configuration.

The suite opens sign-in by default. No demo accounts or customers are seeded. Template previews remain available, and **New website → My account** assigns a chosen template or an empty starting page to the administrator. Customer websites require an explicit customer record and access assignment. Published visitor sites use their public address; private editor and inbox routes require sign-in.

Current DNS is `suite.huskysol.com CNAME hws2026.github.io`, with GoDaddy authoritative nameservers. The prepared Cloudflare zone has not been activated. Do not switch nameservers from its partial DNS import.

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

The standalone Worker is configured with `MEDIA_STORAGE=supabase` and `SUPABASE_STORAGE_BUCKET=hws-suite-media`. The bucket is private with a 50 MB (52,428,800 byte) file limit and `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`, `application/pdf` allowed. It has no browser upload/read policies: all operations go through HWS, which checks D1 website assignments before using its server key. A public website can fetch only media referenced by its visible published snapshot. Responses stream through the Worker without exposing a storage key or signed URL. The original Sites runtime and local compatibility tests may still use an R2 binding.

To connect storage:

1. In Supabase **Project Settings → API Keys**, use a server-only secret key (`sb_secret_…`) for the HWS backend. A separate key for this backend can be revoked independently. A publishable key cannot perform these privileged storage operations.
2. In Cloudflare **Workers & Pages → hws-suite-api → Settings → Variables and Secrets**, add type **Secret**, name `SUPABASE_STORAGE_SECRET_KEY`, and paste the value directly there. Save/deploy it. Alternatively run `npx wrangler secret put SUPABASE_STORAGE_SECRET_KEY --config backend/wrangler.json` locally and enter the value at its hidden prompt. Do not send it through chat or put it in a `VITE_` variable.
3. Sign in to the deployed suite and upload an image to an assigned site. The API checks the bucket is private before every upload and refuses to write if it is public. Publishing enables public access to the published website and its referenced images.

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

## Public websites and free customer domains

**Publish website** saves the approved snapshot and enables its public address in one operation. Visitors do not need an HWS account. The editor returns a link under `https://hws-suite-api.huskysol.workers.dev/sites/SITE-ID/`, or the site's active primary domain. Old suite `#/website/SITE-ID` links redirect to the public address. Drafts and saved content-library sections remain private. **Unpublish website** closes public pages, media and forms while preserving the editable draft. Restoring an archived customer does not automatically republish their sites.

The admin suite remains on GitHub Pages. Customer CNAME hosting uses a separate **Cloudflare Pages Free** project and its service binding to the existing backend; Cloudflare for SaaS and R2 are not required. The Free plan allows 100 custom domains per project. HWS refuses additional provisioning at that limit and never starts a paid upgrade. Pages Functions, Workers, D1 and Supabase still have their respective free usage quotas.

1. Create a direct-upload Cloudflare Pages project named `hws-customer-sites` with production branch `main`. Run `npm run deploy:domains` to deploy `customer-host/public` with the `HWS_BACKEND` service binding configured in `customer-host/wrangler.json`. Wrangler needs `pages:write` permission.
2. Set backend variables `CUSTOM_DOMAIN_ACCOUNT_ID`, `CUSTOM_DOMAIN_PROJECT=hws-customer-sites`, and `CUSTOM_DOMAIN_TARGET=hws-customer-sites.pages.dev`. Create a token scoped to this account with **Cloudflare Pages: Edit**, and store it as the encrypted Worker secret `CLOUDFLARE_PAGES_TOKEN`. Never put it in GitHub Pages, source or chat.
3. In **Domains**, choose a website and add a hostname such as `www.customer.org`. Add the displayed `_hws-verify` TXT record at the current DNS provider, then **Check connection**. Ownership proof is required before the backend adds the hostname to Pages.
4. Add the displayed CNAME pointing to `hws-customer-sites.pages.dev`, plus any validation records Cloudflare returns. Check again after DNS propagation. An active domain and certificate are required before HWS serves the website there. Choose **Make primary** if this is the preferred address.

A `www` or other subdomain can use external DNS; moving nameservers is unnecessary. An apex/root domain on Pages requires Cloudflare DNS. Keep the current Google Site's DNS in place until the replacement website is published and approved for cutover. The suite's existing `suite → hws2026.github.io` record stays in place.

The Pages gateway exposes visitor routes and form submissions only. Private admin and inbox APIs remain on the authenticated backend. Domain removal stops serving immediately, even if provider cleanup needs a retry.

[Pages Free limits](https://developers.cloudflare.com/pages/platform/limits/) · [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## Customer archive and deletion

Apply migration `0005_tan_quicksilver.sql` before deploying the customer lifecycle update. It adds the archive state and enables existing published snapshots only when no explicit public-access setting exists.

**Customers → Archive** retains customer data, suspends assigned website access, takes their websites offline and stops reminders. **Restore** returns editing access; publish each website explicitly to bring it online again. The Published status reflects actual public availability.

Permanent deletion is offered for archived customers and requires typing their exact name. It removes the customer, all their websites, assignments, forms and attachments, media files, domains, reminders and local billing records. Unrelated Supabase login accounts and Stripe's records remain. Active subscriptions or unfinished checkouts must be resolved before deletion. If provider or storage cleanup fails, HWS keeps the remaining records in a deleting state and shows the reason so the admin can retry safely.

## Local checks

- `npm run typecheck`
- `npm run verify:calendar` — shared calendar synchronization, migration, timezone and validation checks
- `npm run verify:templates` — 377 template/block combinations and 1,356 generated pages
- `PAGES_BASE_PATH=/HWS-Sites/ npm run build:pages`
- `npx wrangler deploy --config backend/wrangler.json --dry-run --outdir backend-dist`
- `npm run verify:backend` — local Miniflare, mock Supabase and mock email delivery
- `npm run verify:forms` — 41 checks for public submission validation, idempotency, private inbox authorization, attachments, CSV export, rate limits and save-error reasons
- `npm run verify:commerce` — local Miniflare, mocked Stripe/DNS/Cloudflare, billing isolation and public-publication checks
- `npm run verify:storage` — 16 checks against mocked Supabase Storage, including private-bucket enforcement, upload authorization and published-image access
- `npm run dev:pages` — static frontend preview

The earlier Sites-hosted database is separate from the new Cloudflare database. This deployment does not automatically migrate its customer content. The original hosting manifest is retained for that deployment; GitHub Pages and the standalone Worker do not use it.


## Deploying the expanded template/calendar update

The scratch-creation hotfix also works when GitHub Pages updates before the Cloudflare Worker: it verifies the new site's draft and initializes its empty Home page through the existing save endpoint if the older Worker ignored `startMode`. A failed save stays on the creation form with a retry for the same record. Already edited or published sites are preserved. For a site previously created with unwanted demo content, open **Library → Choose a starting template → Start from scratch** and apply it explicitly; that replacement is undoable. The new-site fix does not automatically reset existing websites.

Upload the complete source, including new `lib/`, `app/`, `pages/`, and `scripts/` files. Deploy the backend and Pages frontend from the same source version: the backend validator now accepts up to 600 pages, shared calendars, nested modules, saved sections and expanded color settings. An older backend rejects these drafts. The earlier template/calendar changes need no additional tables; their data stays inside website snapshots. The forms update below adds migration 0004, which must now be applied. Deploy the backend before inviting users to save with the new editor, and finish the Pages deployment promptly.

Existing customer websites retain their saved content. New template structures apply to newly created websites or when choosing a replacement template. Existing websites can enable the calendar without replacing their template. Publishing remains explicit. The suite's signup option is removed; use Supabase's administrative invitation flow to provision an auth account, then assign that email to the appropriate customer/site in HWS.

## Deploying forms and save-error details

The forms backend was deployed directly through the already authenticated local Wrangler session on October 11, 2026. GitHub run 38152142621 passed its code checks but stopped before migration because GitHub had no Cloudflare credentials. The subsequent direct deployment applied migration 0004 and activated Worker version `cfe539ca-d79b-4ea9-bed5-9f6fbcf14e0c`; HTTPS health, suite-origin CORS and unauthenticated inbox rejection passed. The 59 backend/schema/dependency files used matched the source on GitHub at commit `96449f031c45479645bb79c1f2eafd2dfa5a59ba`. GitHub Actions still needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` configured for future workflow deployments.

For other installations, forms require a new database migration: `drizzle/0004_glossy_ma_gnuci.sql`. It adds `form_submissions`, `form_attachments` and `form_rate_limits` without changing existing customer drafts. This additive migration was tested locally before it was applied to production.

Upload the complete source, including the new migration and its metadata. With Cloudflare credentials configured, run **Deploy Cloudflare backend** in GitHub Actions. That workflow builds and verifies the backend, applies pending migrations and deploys the Worker. Alternatively, from the source folder after installing dependencies and signing in to Wrangler, run:

```sh
npm run db:backend
npm run deploy:backend
```

Then run **Deploy suite to GitHub Pages** from the same source version. A frontend-only upload cannot enable forms. If the backend or migration is missing, the inbox explains the required update instead of silently showing no responses. Existing Cloudflare secrets stay in place; this update needs no new provider keys, storage buckets or email service.

To use forms, add a form in **Library**, configure fields and **Accept responses when published** in **Section settings**, then choose **Publish website**. Test at the public website address, not its editor/demo/review preview. Responses appear in **Forms inbox** for the website owner and assigned editors. The inbox supports new/read/archived status, private downloads and CSV export of up to 100 responses from the current list offset. Viewer and other-site access is denied. Archiving a response is reversible. No form email notifications are sent.

Each form accepts up to three optional or required attachment fields (PDF/PNG/JPEG/TXT, 256 KB per file). Answers and attachment bytes are private D1 records; the existing image-upload service remains separate. Form submissions validate the published schema, deduplicate retries, reject honeypot requests and enforce 20 submissions/hour per hashed sender/site and 500/day per site. These initial limits and file types are defined in `backend/forms.ts` and `lib/form-model.ts`; there is no CAPTCHA or file malware-scanning integration. Only authorized inbox users can download attachments, as downloads rather than inline public files.

Save failures now show a persistent reason, preserve the draft in the current editor tab, and offer retry and JSON backup. Validation identifies the page/section; expired sessions allow signing in separately; conflicts require loading the latest draft after preserving current edits. Deploying the new backend is necessary for its more specific validation and service-failure messages. Existing scratch/full-template creation behavior is retained.

After saving the storage secret, sign in as the platform administrator and open **Workspace settings → Test storage connection**. Success verifies actual upload, download, and cleanup. A saved secret name alone does not establish a working connection. If the diagnostic reports a public publishable key, copy from Supabase’s **Secret keys** section (`sb_secret_`), then replace `SUPABASE_STORAGE_SECRET_KEY` in the Cloudflare Worker and deploy it. Keep the bucket private.

Deploy the desktop-only backend gate before the Pages frontend: the new frontend sends `X-HWS-Device` on suite requests, which the backend explicitly allows in CORS. Mobile user agents and client hints are rejected before private API authentication, while published pages/media/forms, health, and Stripe webhooks keep their existing behavior. GitHub Pages serves a static shell, so the pre-login screen is enforced synchronously in the application bootstrap and route guard; device identification is best-effort rather than hardware attestation.

### Template lifecycle release
Run `npm run db:backend` before `npm run deploy:backend -- --keep-vars`, then upload the frontend source to GitHub. Migration 0006 adds the global template-library archive catalog and refreshes stale template identifiers from existing saved drafts. It does not archive, clear, or unpublish any customer website. Deploy backend and frontend together so all site-start modes are available.

## Inactivity, image sizing, and legal footer release

Deploy the updated Worker (website validation) with existing secrets preserved, then the Pages frontend. No database migration or paid Supabase session setting is required. Run `npm run verify:editor-options`, the template render checks, typecheck and the Pages build. Browser inactivity defaults to 30 minutes with a two-minute warning, cross-tab coordination, refresh/sleep checks, local-scope Supabase sign-out and account-scoped draft recovery. Offline logout clears local credentials; existing access tokens keep their normal server expiry. Image sizing and legal link fields are optional and backwards compatible.

## Website payments (optional; setup can stay deferred)

Suite billing charges the administrator's customers. **Website payments** uses Stripe Connect direct charges so each customer business receives its own website payments. A new Payment checkout section is available in every template, including imported templates; original imported source files are unchanged. Prices can be saved before Stripe is activated. With no Stripe secrets, connection and checkout remain disabled.

Apply migration `0007_spicy_xorn.sql`, deploy the backend with `--keep-vars`, and deploy the customer-domain gateway as well as the frontend. Do not activate Stripe or submit business verification until the owner is ready (currently deferred until LLC formation).

When ready:

1. Complete the platform's Stripe business verification and enable Connect. Use a separate test deployment/database to test credentials, never mix live and test accounts in the same database.
2. Configure the existing platform billing secret/webhook described above.
3. Create a **Connected accounts** webhook at `https://hws-suite-api.huskysol.workers.dev/api/stripe/connect-webhook`, API version `2025-03-31.basil`, for `account.updated`, `account.application.deauthorized`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, and `invoice.voided`. Store its signing secret as `STRIPE_CONNECT_WEBHOOK_SECRET`. Do not reuse the platform webhook signing secret.
4. Each business's named customer contact signs into the suite, opens **Website payments**, and connects Stripe through its hosted onboarding. Only that contact can open onboarding; the platform administrator can assign prices and see payment history. Refresh status after returning from Stripe. Existing independent Stripe accounts should follow the options Stripe presents; never manually paste account IDs.
5. Create an offer for a website (amount, currency, one-time/monthly/yearly). Add **Payment checkout** from the editor's content library, select the offer in the right inspector, save and publish. Stripe verification and the server's published website/offer checks must pass before checkout opens.

Prices are immutable; create and select a new offer to change future prices. Disable an offer to stop new checkouts and expire open sessions. This does not cancel existing subscriptions. Refunds, disputes, recurring cancellations and payout management remain in the business's Stripe dashboard. Payment history records verified checkout payments and recurring invoices; it is not a full accounting ledger. One-time website checkout does not enable the optional paid invoice-creation feature. HWS adds no application fee; Stripe's processing/Billing/Connect terms still apply.

`node scripts/verify-website-payments.mjs` uses mocked Stripe and an isolated database; it never charges cards or creates real accounts. The public return URL cannot mark an order paid; only a valid webhook with an independently fetched Stripe session can do so. Card details are never collected by HWS.

## Reliable folder uploads from VS Code

Use the full `HWS-Sites-COMPLETE.zip`, generated by `npm run package:source`. A partial update ZIP cannot replace the project directory: doing so deletes the files omitted from that ZIP. Pull the latest branch before copying a complete package into the repository root; preserve `.git`, include `.github` and `.githooks`, commit, and push normally. See `UPLOAD-README.txt`.

Both deployment workflows run `verify:source` before installing dependencies. `SOURCE-FILES.txt` lists every required packaged file and produces a specific missing-files error for an incomplete upload. Run `npm run setup:upload` once per clone to install the Git pre-push check; it validates the pushed commit and refuses to overwrite remote main history. This catches ordinary force pushes from stale clones as well as commits that delete required source. Hooks can be deliberately bypassed, so normal Push/Sync remains the supported workflow. Existing custom Git hooks are not overwritten.
