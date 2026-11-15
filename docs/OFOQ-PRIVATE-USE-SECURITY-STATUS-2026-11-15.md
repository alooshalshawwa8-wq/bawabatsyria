# OFOQ — Private-use security and legal checkpoint
Date: 2026-11-15
Scope: live verification of the connected production Supabase project and GitHub repository. No production data, Auth settings, secrets, Edge Functions, Pages settings, or database policies were changed.

## Verified live state
- GitHub repository: `alooshalshawwa8-wq/bawabatsyria`; public visibility; default branch `main`.
- Main includes PR #30 commit `191f2ba94db323023f7dd809b7703a9f6190943f`.
- Supabase project `bawabatsyria` (`elzquyehghuxhswogsch`), `ACTIVE_HEALTHY`, PostgreSQL 17.11, region `eu-central-1`.
- Applied migrations: 37.
- Active Edge Functions: `membership-api` v23, `site-assistant` v21, `football-data` v46. All currently have gateway `verify_jwt=false`.
- Football provider protection remains engaged: `provider_blocked=true`; reason recorded as provider account suspended. Do not retry upstream calls until provider reactivation is confirmed.
- Daily football quota override: 70; existing budget split and pacing values were left unchanged.

## Security findings and interpretation
1. Security Advisor reports 12 public-schema tables with RLS enabled and no policies: `ai_provider_daily_usage`, `football_api_budget_policy`, `football_api_budget_reservations`, `football_api_cache`, `football_api_rate_limits`, `football_api_usage`, `ofoq_revenue_events`, `platform_feature_catalog`, `platform_launch_config`, `platform_plan_catalog`, `platform_plan_features`, and `site_assistant_rate_limits`.
2. A direct privilege check confirmed that `anon` and `authenticated` have no SELECT or INSERT privileges on those 12 tables. `service_role` retains access. These findings are fail-closed backend-only tables, not evidence of public data exposure. Do not add blanket RLS policies.
3. Security Advisor reports leaked-password protection disabled. This remains an owner/dashboard configuration item; no Auth setting was changed.
4. `membership-api` verifies users through Supabase Auth for non-public routes. Health/plans and Stripe webhook are separate public routes; webhook signature verification is present.
5. `site-assistant` is intentionally public-facing. It checks browser Origin, bounds request size/history, hashes trusted Cloudflare client IP, and enforces persistent per-minute and provider daily quotas. CORS/Origin are not authentication and can be spoofed by non-browser callers; quotas remain essential.
6. `football-data` checks allowed Origin, trusted `cf-connecting-ip`, local and persistent rate limits, and uses server-side credentials. Feature entitlements are checked when paid enforcement is active. Provider calls remain blocked by the recorded suspension.
7. Performance Advisor reports 26 unused indexes. Do not drop them based only on counters; representative traffic and query-plan review are needed.
8. A front-end login screen does not secure public source/assets or a public static origin.

## Private hosting decision — verified free path
- GitHub confirms GitHub Pages is public by default. On GitHub Free, changing this public repository to private automatically unpublishes the Pages site; private Pages access control is an Enterprise Cloud capability. Do not switch repository visibility unless accepting that the current hosted site will go offline.
- A viable free candidate is Cloudflare Pages with Cloudflare Access protecting the production `*.pages.dev` hostname. Cloudflare documents enabling Access for the Pages production hostname, and its Zero Trust Free plan is $0 for up to 50 users. This can support the single-owner requirement without buying a domain.
- This alternative has NOT been deployed or connected to the user's Cloudflare account. It requires the owner to create/connect a free Cloudflare account and authorize repository import. After deployment, Access must protect the production hostname (not only preview URLs), and the old GitHub Pages origin must be unpublished or otherwise blocked to prevent bypass.
- Do not call the project private until unauthenticated requests to both the new hostname and the old GitHub Pages URL are denied, and the owner can still sign in from their devices.

## Legal checkpoint — Syria
- Law No. 12 of 2024 on Protection of Electronic Personal Data is stated to take effect 2025-01-01. Article 40 contains a limited exception for data held by a natural person and processed for personal activities, subject to conditions including no disclosure to another party without the data subject's consent and compliance with data-protection obligations.
- Article 15 regulates cross-border transfer/storage/processing. Since this workspace uses foreign cloud infrastructure and may contain information about customers, suppliers, or other people, Article 40 should not be treated as a blanket exemption without written Syrian legal advice or confirmation from the competent authority.
- The Ministry's 2025-04-16 announcement described notification instead of licensing for electronic applications after commercial registration. It does not establish that a closed single-user personal tool is a commercial application, nor waive other laws.
- No legal conclusion or regulatory exemption is certified by this technical audit.

## Actions completed and not completed
- Completed: live database/function inspection; privilege verification; current provider-block verification; GitHub documentation commit; tracking issue #31.
- Not changed: production data/schema/policies, migrations, indexes, secrets, Auth settings, Edge Functions, payment state, GitHub Pages settings, repository visibility, or Cloudflare account.
- No paid service or subscription was created.
- The site is STILL publicly reachable at its existing GitHub Pages URL. This audit does not claim otherwise.

## Next sequence
1. Owner connects a free Cloudflare account; deploy the existing repository to Cloudflare Pages; enable Access on the production `pages.dev` hostname; allow only the owner's verified email. Then test direct old-origin bypass and unpublish the old Pages site only after the protected deployment works.
2. In Supabase Auth dashboard, enable leaked-password protection and verify the Security Advisor clears.
3. Test owner login, session expiry, logout, recovery and confirmation with an already-authorized test account; do not create extra accounts or send mail without coordination.
4. Add automated tests for the three Edge Function authorization and quota paths; preserve custom authentication if gateway JWT settings are changed.
5. Re-run advisors after changes. Review unused indexes only after representative workload and EXPLAIN analysis.
6. Obtain written Syrian legal advice on single-user personal use, third-party data in the workspace, and cross-border cloud processing before public/commercial use.
