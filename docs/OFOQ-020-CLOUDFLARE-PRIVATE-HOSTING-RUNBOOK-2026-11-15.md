# OFOQ-020 — Cloudflare Pages + Access: private single-owner hosting runbook
**Date:** 2026-11-15  
**Status:** Prepared in a non-production branch; not deployed.  
**Related:** OFOQ-007, OFOQ-008, OFOQ-017, OFOQ-018, OFOQ-019.

## 1. Decision

The current GitHub Pages URL is a public static website and the GitHub repository is public. A JavaScript login panel, robots.txt, CORS, or hiding the UI cannot make static files private.

The selected free candidate is:
- Cloudflare Pages for static hosting.
- Cloudflare Access in front of the production Pages hostname.
- One Access Allow policy for the owner's verified email; no public Allow rule.
- GitHub repository converted to Private only after the protected deployment and full app flows have been verified.

Cloudflare Pages Git integration officially supports both public and private GitHub repositories. Cloudflare Access Free is listed at $0 for teams under 50 users. This is suitable for a single-owner deployment, subject to the provider's current terms and account eligibility.

## 2. Prepared in this branch

### Private build artifact
- `scripts/build-private-pages.mjs` builds `dist/` from an explicit allowlist of public front-end files and `assets/`.
- It excludes `backend/`, `supabase/`, migrations, tests, scripts, workflows, documentation, and repository metadata.
- It changes the artifact's robots meta to `noindex,nofollow,noarchive`, removes canonical/JSON-LD public indexing metadata, rewrites `robots.txt` to disallow crawlers, omits the public sitemap, and copies the Pages `_headers` file.
- It removes registration of the legacy public PWA service worker and, on the first authenticated online visit, unregisters old same-origin service workers and clears only `ofoq-shell-*` caches. This prevents an old offline app-shell cache from being the intended access path to the private deployment. Offline availability is intentionally disabled for the private build.
- `tests/private-pages-build-contract.mjs` verifies the output shape and that source-only folders and service-worker registration are absent.
- The GitHub Pages workflow now requires both a public repository and the explicit repository variable `OFOQ_PUBLIC_PAGES_ENABLED=true`; unset/false prevents a later push from accidentally republishing the old public app after retirement.
- A separate manual-only `retire-github-pages.yml` workflow builds and deploys a minimal retirement page after an explicit boolean confirmation and the final protected Pages URL. It clears the old origin's service worker and OFOQ caches when each owner device visits it online.
- Static-validation CI now runs the private build and contract test.

These controls reduce accidental exposure and artifact contents. **They do not replace Cloudflare Access.** The current GitHub Pages deployment remains public until the migration is completed.

## 3. Cloudflare Pages project settings

In Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git:

| Setting | Value |
|---|---|
| Git provider | GitHub |
| Repository | `alooshalshawwa8-wq/bawabatsyria` |
| Production branch | `main` |
| Framework preset | None |
| Root directory | `/` (repository root) |
| Build command | `node scripts/build-private-pages.mjs` |
| Build output directory | `dist` |
| Node version | 22 (current Pages build image includes Node 22; pin `NODE_VERSION=22` if the dashboard/build image requires it) |

Important:
- Choose the project name carefully. Cloudflare documents that the `*.pages.dev` subdomain cannot currently be changed after project creation; changing it requires deleting and recreating the project.
- Keep preview deployments disabled until preview Access policies are configured, or explicitly protect all preview URLs. Cloudflare states that preview deployments are public by default.
- Do not use Direct Upload for this plan: Git integration supports the existing GitHub workflow and private repositories.
- The Cloudflare GitHub App must be installed only for this repository if possible, following least-privilege repository access.

## 4. Protect every Cloudflare hostname

After the first successful production deployment:

1. In Pages → Settings → General, enable the Access policy for preview deployments.
2. In Zero Trust → Access → Applications, ensure preview deployments are protected.
3. Follow Cloudflare's current Pages known-issues procedure to protect the exact production `<project>.pages.dev` hostname. The auto-created wildcard Access policy may cover preview hostnames rather than the production hostname; edit the public hostname and remove the wildcard where Cloudflare instructs.
4. Create an Allow policy that matches only the owner's verified email address. Do not create an Allow rule for Everyone or all authenticated users.
5. Verify both the production URL and every enabled preview/branch alias from a clean browser session. Unauthenticated requests must be redirected to Access or denied.
6. If a custom domain is ever added, create a separate Access application for that exact hostname too. Do not assume protection of `pages.dev` automatically protects custom domains.

## 5. Required application-origin migration (critical)

The current production app and all three Supabase functions use the old origin `https://alooshalshawwa8-wq.github.io`:

- `site-assistant` v21
- `membership-api` v23
- `football-data` v46

Their CORS headers/Origin checks are not yet configured for a new Pages hostname. The membership function also has a `SITE_URL` environment default pointing at the GitHub Pages URL. The app's canonical metadata, structured data, sitemap, and Auth redirect allowlist also refer to the old URL.

After the new Pages project name is chosen, before declaring the site operational:

1. Update the allowed origin in all three Edge Functions to the exact new production `https://<project>.pages.dev` origin. Keep the old origin only during the controlled migration window; do not use wildcard `*.pages.dev` or reflect arbitrary Origin values.
2. Update membership `SITE_URL` and all Auth Site URL / Redirect URL allowlists to the exact Pages origin and required callback paths.
3. Update canonical/manifest/sitemap metadata as appropriate for the private artifact. The prepared build intentionally strips public canonical and JSON-LD metadata and applies noindex.
4. Redeploy the three Edge Functions only after source review and a rollback plan. Test CORS preflight and actual requests for allowed and disallowed origins, login, session refresh, logout, password recovery, membership/portal, assistant and football endpoints.
5. Confirm all requests use the intended Supabase project and that no service-role secret is present in the static artifact.

No Cloudflare hostname has been selected, so hardcoding a guessed Pages origin or deploying function changes now would be unsafe.

### Legacy GitHub Pages offline cache

The new `pages.dev` hostname is a different origin from `alooshalshawwa8-wq.github.io`. Therefore, the private artifact's service-worker cleanup can clear only caches on the new origin; it cannot remotely erase an old PWA cache stored under the GitHub Pages origin.

Before unpublishing GitHub Pages, prepare and deploy a temporary retirement page on the old origin that:
- displays that the public site has moved to a private address;
- unregisters only the service worker scoped to the OFOQ Pages path (so other GitHub Pages projects on the same `github.io` origin are not disturbed);
- deletes only caches whose names start with `ofoq-shell-`;
- does not register a replacement worker;
- optionally links to the new Access-protected hostname after it is known.

Open the retirement page online on every owner device/browser profile that previously installed or visited the PWA, and verify the old worker and OFOQ caches are gone. Devices that never reconnect to receive the retirement page may retain a local offline copy; this is a local-device cleanup limitation, not a server-side public bypass.

## 6. Final cutover sequence

Do not change repository visibility until all preceding tests pass.

1. Confirm the Cloudflare production hostname is Access-protected.
2. Confirm owner sign-in and core app functionality work through Cloudflare.
3. Confirm preview deployments cannot be reached anonymously.
4. Confirm the app no longer relies on a cached service worker for access.
5. Convert the GitHub repository to Private. GitHub documents that on GitHub Free, a published Pages site is automatically unpublished when a repository becomes private.
6. Cloudflare Pages Git integration supports private GitHub repositories; verify the next Cloudflare build still succeeds after the visibility change.
7. Verify the old GitHub Pages URL is no longer served and cannot bypass Access.
8. Re-run all browser/mobile smoke and Edge Function contract tests; record the new deployment URL and build SHA.

If any step fails, stop the cutover, keep the current source intact, and restore the prior hosting route only as a temporary fallback. Do not claim privacy while the old public URL remains accessible.

### GitHub Actions free-quota note

GitHub's current pricing documentation lists 2,000 Actions minutes/month for GitHub Free personal accounts; public-repository standard runner usage is free, while private-repository hosted-runner usage consumes the included allowance and may be billed if it exceeds the account's allowance. The exact allowance must be checked in the owner's GitHub billing settings before making the repository private.

To reduce avoidable usage, this branch scopes:
- database migration replay to migration/config/seed changes;
- membership/payment checks to relevant backend, portal, test, and Supabase source changes;
- static validation to application, backend, tests, scripts, Supabase, and workflow changes.

The read-only autopilot schedule remains separate and should be reviewed against the actual monthly quota after the repository becomes private.

## 7. Remaining external requirements

The following cannot be completed through the currently connected GitHub/Supabase tools:
- Owner must create or connect a Cloudflare account and authorize the Cloudflare GitHub App for the repository.
- Owner must choose the permanent Pages project name and verify the login email.
- Supabase Auth SMTP/Site URL/Redirect URL settings are not writable through the available connector.
- The Auth leaked-password protection setting still requires the Supabase dashboard.
- Legal confirmation about Syrian personal-use and cross-border processing remains separate from technical hosting.

Never paste Cloudflare API tokens, Supabase service-role keys, SMTP credentials, or other secrets into chat or GitHub.

## 8. Official provider references

- Cloudflare Pages Git integration (private and public GitHub repositories): https://developers.cloudflare.com/pages/get-started/git-integration/
- Cloudflare Pages GitHub integration: https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- Cloudflare Pages known issues, including production `pages.dev` Access steps: https://developers.cloudflare.com/pages/platform/known-issues/
- Cloudflare preview deployments and their default public access: https://developers.cloudflare.com/pages/configuration/preview-deployments/
- Cloudflare Pages build image / Node version: https://developers.cloudflare.com/pages/configuration/build-image/
- Cloudflare Access pricing: https://www.cloudflare.com/sase/products/access/
- GitHub private-repository visibility behavior on GitHub Free: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
- GitHub Pages unpublishing behavior: https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site

## Final state

Prepared only. No Cloudflare project, Access policy, CORS origin, Auth redirect, repository visibility, production deployment, or DNS setting was changed. The live GitHub Pages site remains public until the complete cutover is verified.
