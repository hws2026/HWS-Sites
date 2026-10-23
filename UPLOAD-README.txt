HUSKY SUITE — COMPLETE SOURCE UPLOAD

OCTOBER 23 CUSTOMER SERVICES UPDATE: the Cloudflare backend and database are
already updated. Upload the frontend source below, then see CUSTOMER-SETUP-README.txt
for the owner-only Enable customer setup step and policy-document readiness notes.

The manual "Deploy Cloudflare backend" workflow also needs a separate GitHub
Actions secret named CLOUDFLARE_API_TOKEN. Backend secrets saved in Cloudflare
do not sign GitHub in. The corrected workflow checks this before installing or
building, and reads the public account ID from the included configuration.
For this release the backend/database are already updated; deploy the frontend
with "Deploy suite to GitHub Pages". See DEPLOYMENT.md for future backend setup.

Use HWS-Sites-COMPLETE.zip for folder-based uploads. Update-only ZIPs do not
contain the whole application and must never replace a repository folder.

Your repaired VS Code repository is:
/Users/imac/Documents/HWS-Suite

For future updates:
1. In VS Code, Fetch and Pull the latest main branch BEFORE replacing files.
2. Extract the COMPLETE ZIP. Copy its CONTENTS into the existing repository
   root (the folder containing package.json). Include hidden .github and
   .githooks folders. Keep the existing .git folder.
3. Run npm run verify:source, then npm run typecheck.
4. Stage all changed files, commit, and use normal Push / Sync Changes.
   Do not force-push. If the push is rejected, fetch/pull the newer commits.
5. Check GitHub Actions -> Deploy suite to GitHub Pages for a green result.

The upload guard is installed inside .git in the repaired local checkout,
so replacing source folders cannot remove the installed guard. For another
checkout, run npm run setup:upload once. It blocks missing-source commits
and non-fast-forward pushes to main, including ordinary Force Push attempts.

To create the next complete source ZIP: npm run package:source
Output: exports/HWS-Sites-COMPLETE.zip

SOURCE-FILES.txt records the complete source package. When adding or removing
source files intentionally, update this list in the same commit. Never include
.env files, private keys, node_modules, .git, or generated build folders.

GitHub Pages deploys the frontend. Backend code/database changes have a
separate Cloudflare deployment workflow. Customer content lives in the database
and is not included in this source ZIP. Stripe remains inactive until configured.
