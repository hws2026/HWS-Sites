HUSKY SUITE — COMPLETE SOURCE UPLOAD — OCTOBER 23, 2026
HONEYBOOK UPDATE

This ZIP is a source update. Its HoneyBook changes are NOT deployed live yet.
No subscription or real payment has been created. Existing server secrets stay
in Cloudflare and are not included in this ZIP. No new global secret is needed.

1. In VS Code, Fetch and Pull the latest main branch first.
2. Extract the ZIP. Copy its CONTENTS into your repository root, beside
   package.json. Include hidden .github and .githooks. Keep the .git folder.
   Your repaired checkout is /Users/imac/Documents/HWS-Suite.
3. Run npm run verify:source and npm run typecheck. The source check now catches
   an old .github workflow folder as well as missing files.
4. Commit and use normal Push / Sync Changes. Do not force-push.
5. GitHub -> Actions -> Deploy suite to GitHub Pages starts automatically.
   It builds the frontend and calls Deploy Cloudflare backend for the SAME commit.
   The backend applies pending database migrations, including 0014, and deploys
   the Worker with existing secrets preserved. Pages publishes only after both
   jobs succeed. If backend setup fails, the previous frontend stays live.
6. Wait for the latest workflow to turn green, then refresh suite.huskysol.com.
   Open Website payments -> HoneyBook. See HONEYBOOK-SETUP.txt for each option.

For a retry, run a NEW Deploy suite to GitHub Pages workflow from latest main;
do not rerun a historical revision. Deploy Cloudflare backend remains available
as a manual workflow for backend-only maintenance.

Links and manual payment history need no additional integration subscription.
Automatic payment updates need the customer's supported HoneyBook/Zapier plans
and a tested connection. Nothing in this package activates paid services.

Use COMPLETE source ZIPs for folder-based uploads. Do not replace the project
with a partial ZIP. Customer content is in the database, not in this package.
The upload guard protects against missing source and ordinary force-push mistakes.
For a new checkout, run npm run setup:upload once.

Create a future complete ZIP with npm run package:source.
Output: exports/HWS-Sites-COMPLETE.zip
Update SOURCE-FILES.txt when intentionally adding/removing source files. Keep
.env files, private keys, node_modules, .git and builds out of source packages.
