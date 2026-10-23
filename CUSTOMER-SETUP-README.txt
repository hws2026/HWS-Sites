SECURITY & PRICING UPDATE — OCTOBER 23, 2026
Read UPLOAD-README.txt and SECURITY-REVIEW.txt first. Deploy BOTH services from
this commit. Pending migrations include 0012 (profiles) and 0013 (incidents).
Security emails use security@huskysol.com; onboarding uses onboarding@huskysol.com.
Owner recovery: https://suite.huskysol.com/#/security. HoneyBook remains on hold.
New editable Pricing & plans layout: Editor -> Library -> Pages.
Earlier deployment statements below refer to previous releases.

LATEST UPDATE — OCTOBER 23, 2026
Read UPLOAD-README.txt first. This release requires backend migration 0012 and
both deployment workflows. Earlier deployment statements below are historical.
Onboarding now activates completed customers automatically; profiles, owner-only
audit deletion, clearer geolocation, and refresh persistence are included.
HoneyBook sync is on hold.

HUSKY SUITE — CUSTOMER SERVICES UPDATE
Release prepared October 23, 2026

CURRENT DEPLOYMENT

Cloudflare backend deployed successfully as version
a4543bfe-5ac4-42d6-a6e1-be07417b0cf9. Database migrations 0008 through 0011
are installed. The Resend and encryption secrets are installed. The GitHub Pages
frontend is supplied in this ZIP for the owner to upload; it has not been pushed.

UPLOAD AND ACTIVATE

1. Extract the complete ZIP. Copy its CONTENTS into your existing HWS-Sites
   repository root, including .github and .githooks. Keep the existing .git folder.
   Do not upload the ZIP itself as the website, or put the app in an extra folder.
2. Run npm run verify:source and npm run typecheck. Commit and push normally.
   Do not force-push. Wait for Deploy suite to GitHub Pages to finish successfully.
3. Refresh suite.huskysol.com and sign in as the owner. Open Customers, then
   choose Enable customer setup. This activates policy checks on the backend.
   Only the owner can activate this. It is kept off during the old-frontend rollout.
4. Use Send / resend invitation for existing customers. New customers added
   after activation get their invitation automatically. Existing customer records
   are not mass-emailed by this update.

WELCOME EMAILS

Sender: Husky Suite <onboarding@huskysol.com>.
The domain is verified in Resend. The sending key is restricted to huskysol.com
and is stored in Cloudflare secret storage, not in this ZIP or the browser app.
The provider connection was tested with Resend's official simulated-delivery
address; Resend recorded Delivered. That is not a real customer inbox test.

New accounts receive a random temporary password that expires after 24 hours.
They must replace it before opening private workspace APIs. Resending an
uncompleted invitation renews the temporary password and invalidates the old one.
Existing active accounts receive a sign-in reminder; their password is preserved.
Passwords are not saved in the suite database or security log. The email provider
necessarily processes the invitation email, including the temporary password.
Pending, sending, failed, invited, and active states are shown. Provider acceptance
does not guarantee inbox placement. Failures show their reason and can be retried.
An interrupted send can be retried after five minutes; simultaneous sends are blocked.

POLICY ACCEPTANCE

The release contains unchanged text snapshots of all 25 linked policy documents
from https://www.huskysol.com/legal, captured October 21, 2026. Each snapshot has
a SHA-256 version. Customers and staff open and acknowledge each current policy.
The server stores the account, document version, UTC acceptance timestamp, and
encrypted request context. The owner is exempt from the customer policy gate.
Acceptance records remain available to the owner after customer deletion.
Opening a document is not acceptance, and the system cannot prove actual reading.

Some supplied documents still contain placeholders such as [PRIVACY EMAIL] and
[BUSINESS MAILING ADDRESS]. The wording was preserved. Complete those source
documents before relying on them for customer onboarding. To release revised
policies, capture new snapshots and hashes, retain old files, and update the
manifest. New versions require fresh acceptance. This update is not a legal
compliance certification and does not implement every feature described by the docs.

SECURITY AND AUDIT

The new login screen sends password sign-ins through the backend so it can record
successes, failures, rate limits, the trusted connecting IP, approximate city,
state/region, country, latitude/longitude when available, and browser information.
There are limits of 8 attempts per IP/email pair and 100 per IP per 15-minute
window. Supabase's own authentication protections continue to apply. Direct
Supabase authentication requests do not pass through the suite's audit endpoint.

Authenticated API actions, denied staff permissions, invitations, policy acceptance,
support replies, team changes, and HoneyBook-link changes are recorded. Passwords,
access tokens, secret keys, and full request bodies are excluded. Security and
policy history support loading older records and exporting the loaded records.

IP geolocation is approximate. An optional OpenStreetMap view may show street and
building labels, but those labels do not identify the person or their home. The map
loads only when selected, and the UI explains that its map area is shared with OSM.

New support content, private HoneyBook links, policy request context, and audit
request context use AES-256-GCM application encryption with random nonces and
record-specific authenticated data. HTTPS protects transport. Supabase manages
password hashes. Existing site, customer-directory, form, and billing records
continue using provider-managed storage protection; this release does not retrofit
application encryption to every existing field and is not end-to-end encryption.

HWS_DATA_KEY is stored as a Cloudflare secret. A private recovery copy exists only
on the administrator's computer in website-editor/.local-secrets/hws-data-key.
The directory is excluded from Git and this package. Keep an offline secure backup.
Do not replace this key without migrating existing encrypted records: the old key
is necessary to read them. Audit and acceptance retention is currently indefinite;
review retention requirements before routine production use. No automatic purge
of these records was added.

SUPPORT AND TEAM

Customers can open private support conversations and read/reply to their own
organization's threads. Authorized support staff can reply, assign agents, and
close/reopen threads. Open screens refresh automatically. Stored message text and
subjects are encrypted. This is a suite inbox, not SMS or an external chat service.

The owner can add administrators, support agents, and billing agents by email.
Administrators manage the workspace; support agents access support; billing agents
access suite billing. Only the owner grants/revokes team roles. Server permissions
are checked on each request, so revocation affects an existing session.

HONEYBOOK AND TEMPLATES

Customers use their own HoneyBook account to create invoices/payment links and
save them under Website payments. Links must use HTTPS on honeybook.com or one
of its subdomains. Links are isolated by website/customer and stored encrypted.
Hiding a link in the suite does not cancel an invoice in HoneyBook. Payment status
is not synchronized. No HoneyBook subscription or live Stripe setup was purchased.

Customers have an assigned starting-template selector. It does not overwrite an
existing website. Creating a customer website automatically gives that customer's
contact email editor access, subject to verified sign-in and onboarding.

MOBILE PREVIEW FIXES

Local/root-relative links resolve to the correct website page inside the editor.
Exact URL/ID matches take priority over a matching display name. Nested menus no
longer collapse their parents when toggled; navigation closes the menu after the
selected page opens. Mobile mega menus include a route to the parent overview.
The imported Paradis template's original source files were not modified.

BACKEND DEPLOYMENT FOR OTHER INSTALLATIONS

Use the migrations shipped through 0011, then deploy backend/wrangler.json.
Required secrets: RESEND_API_KEY, HWS_DATA_KEY, SUPABASE_STORAGE_SECRET_KEY.
HWS_DATA_KEY must be 64 hexadecimal characters representing 32 random bytes.
Set EMAIL_FROM to Husky Suite <onboarding@huskysol.com>. Preserve the existing
Cloudflare Pages secret and all other existing settings. Never commit secrets.
HWS_ONBOARDING_ENABLED=false permits a safe old-frontend rollout; the owner then
enables customer setup through the new Customers screen. Setting the environment
flag to true also enables it. Temporary-password restrictions are always enforced.

VERIFICATION

The release was checked with TypeScript, the production frontend build, template
rendering/navigation checks, and isolated backend, customer-security, mobile,
forms, publication, creation, calendar, device, payment, commerce, storage,
inactivity/footer/media, and imported-template checks. Test databases and payment
providers were mocked. No real customer was created or charged during testing.

Cloudflare's dashboard login loop did not invalidate the existing deployment-tool
session. Email setup used that authorized connection. The live DNS authority
remains GoDaddy. The separate pending Cloudflare-zone nameserver notice is not a
failure of the working GitHub Pages/Workers/Pages connections; nameservers and
Google mail routing were not changed by this update.
