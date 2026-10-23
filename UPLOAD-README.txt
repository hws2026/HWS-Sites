HUSKY SUITE — COMPLETE SOURCE UPLOAD — OCTOBER 23, 2026

THIS UPDATE NEEDS BOTH BACKEND AND FRONTEND DEPLOYMENT.
The new backend/database changes in this package have not been deployed live.
No new paid service or secret is required. Existing Cloudflare server secrets
stay in Cloudflare; this ZIP does not include them.

1. Extract this ZIP and copy its CONTENTS into your repository root (beside
   package.json), including the hidden .github folder. Keep your .git folder.
2. Commit and use normal Push / Sync Changes in VS Code.
3. GitHub -> Actions -> Deploy Cloudflare backend -> Run workflow -> main.
   Start a NEW run using the latest commit; do not rerun a historical job.
   It applies pending migrations 0012 and 0013 and deploys the matching backend.
4. Confirm Deploy suite to GitHub Pages is green for that same latest commit.
   Refresh suite.huskysol.com after both deployments finish.

See UPDATE-NOTES.txt and SECURITY-REVIEW.txt for the change list and security
limitations. Pricing cards need this matching backend before they can be saved.
Security email: security@huskysol.com -> awilson2951@gmail.com.
HoneyBook sync is on hold.

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
5. Check BOTH current backend and GitHub Pages workflows for a green result.

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
