# OFOQ — Private-use security and legal checkpoint
Date: 2026-11-15
Scope: read-only verification of the connected production Supabase project and GitHub repository. No production data, Auth settings, secrets, Edge Functions, Pages settings, or database policies were changed.

## Verified live state
- GitHub repository: `alooshalshawwa8-wq/bawabatsyria`; public visibility; default branch `main`.
- Latest main commit: `191f2ba94db323023f7dd809b7703a9f6190943f` (PR #30).
- Supabase project `bawabatsyria` (`elzquyehghuxhswogsch`), status `ACTIVE_HEALTHY`, PostgreSQL 17.11, region `eu-central-1`.
- Applied migrations: 37.
- Active Edge Functions: `membership-api` v23, `site-assistant` v21, `football-data` v46. All currently have gateway `verify_jwt=false`.
- Football provider protection remains engaged: `provider_blocked=true`; reason recorded as provider account suspended. Do not retry upstream calls until provider reactivation is confirmed.
- Daily football quota override: 70; budget split and pacing values remain as configured in the database.

## Security findings and interpretation
1. Security Advisor reports 12 public-schema tables with RLS enabled and no policies:
   - ai_provider_daily_usage
   - football_api_budget_policy
   - football_api_budget_reservations
   - football_api_cache
   - football_api_rate_limits
   - football_api_usage
   - ofoq_revenue_events
   - platform_feature_catalog
   - platform_launch_config
   - platform_plan_catalog
   - platform_plan_features
   - site_assistant_rate_limits
2. A direct privilege check confirmed that `anon` and `authenticated` have no SELECT or INSERT privileges on those 12 tables. `service_role` retains access. Therefore, the no-policy findings are fail-closed backend-only tables, not evidence of public data exposure. Do not add blanket RLS policies.
3. Security Advisor reports leaked-password protection disabled. This remains an owner/dashboard configuration item; no Auth setting was changed.
4. `membership-api` uses explicit Supabase Auth user verification for non-public routes. Health/plans and the Stripe webhook are separate public routes; the webhook verifies its Stripe signature.
5. `site-assistant` is intentionally a public-facing assistant endpoint. It checks the exact browser Origin, bounds request size/history, hashes the trusted Cloudflare client IP, and enforces persistent per-minute and provider daily quotas. Origin checks/CORS are not authentication and do not prevent non-browser callers from spoofing an Origin header; quotas remain essential.
6. `football-data` checks the allowed Origin, trusted `cf-connecting-ip`, local and persistent rate limits, and uses service-side credentials. Feature entitlement checks are applied when paid enforcement is active. Provider calls remain blocked by the recorded suspension.
7. Performance Advisor reports 26 unused indexes. Do not drop them based only on usage counters; the project has limited representative traffic and some indexes may support future workflows or constraints.
8. The public GitHub repository and GitHub Pages deployment are not a private hosting boundary. A front-end login screen alone cannot make source/assets private or protect a publicly reachable static origin.

## Legal checkpoint — Syria
- Law No. 12 of 2024 on Protection of Electronic Personal Data is stated to take effect 2025-01-01. Article 40 contains a narrow exception for data held by a natural person and processed for personal activities, subject to its stated conditions, including no disclosure to another party without the data subject's consent and compliance with data-protection obligations.
- Article 15 regulates cross-border transfer/storage/processing of personal data. Because this project uses foreign cloud infrastructure and may hold information about customers, suppliers, or other people, Article 40 should not be treated as a blanket exemption without a Syrian lawyer or competent authority confirming the facts and interpretation.
- The Ministry's 2025-04-16 announcement described notification instead of licensing for electronic applications after commercial registration. It does not establish that a closed, single-user personal tool is a commercial application, nor does it waive other laws.
- No legal conclusion or claim of regulatory exemption is made in this technical audit.

## Actions intentionally not taken
- No destructive database changes, policy changes, migration replay, index drops, secret rotations, account deletions, Auth setting changes, Edge Function redeployments, payment activation, or hosting changes.
- No new paid service or subscription was created.
- The site has NOT been made private in this audit. The repository is public and a proper private access boundary still needs to be implemented at the hosting/access layer. Do not claim otherwise.

## Next sequence
1. Decide and implement a real access boundary for the single-user site. Preferred free path must be verified against GitHub Pages constraints; do not rely on client-side hiding or CORS as access control.
2. In Supabase Auth dashboard, enable leaked-password protection and verify the Security Advisor clears.
3. Test owner login, session expiry, logout, recovery and confirmation using an already-authorized test account; do not create extra accounts or send mail without owner coordination.
4. Add automated tests for the three Edge Function authorization and quota paths; preserve custom authentication if gateway JWT settings are changed.
5. Re-run security/performance advisors after changes. Review unused indexes only after representative query workload and EXPLAIN analysis.
6. Obtain a written Syrian legal answer on single-user personal use, third-party data in the workspace, and cross-border cloud processing before any public/commercial use.
