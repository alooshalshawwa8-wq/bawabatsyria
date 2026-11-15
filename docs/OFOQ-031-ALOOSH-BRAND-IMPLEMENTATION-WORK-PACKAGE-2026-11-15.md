# OFOQ-031 — ❤️ Aloosh alshawwa ❤️ Brand Implementation Work Package

**Date:** 2026-11-15  
**Branch:** `aloosh/brand-prep-2026-11-15`  
**Base:** `fafb6d5df8b3454053fc9adad84444fca1a9c376`  
**Status:** Engineering preparation and verified inventory. This change does not alter the live site, deploy anything, change repository visibility, or modify production services.

## 1. Canonical identity

- Website display name: **❤️ Aloosh alshawwa ❤️**
- AI assistant display name: **❤️ Aloosh alshawwa ❤️**
- Product mode: private, single-owner personal digital environment.
- Default experience: Arabic, RTL, mobile-first.
- Commercial/public-service assumptions: out of scope.
- Cost: free-first; no paid service, domain, API credit, or subscription without explicit owner approval.

The exact display string must be centralized and reused. Technical identifiers, URLs, database names, storage namespaces, function names, and stable DOM IDs are not display copy and must not be renamed merely for cosmetic consistency.

## 2. Verified source inventory

A read-only inspection of the current development branch confirmed these legacy references:

| File | Approximate file size | Matches found |
|---|---:|---|
| `index.html` | 564 KB | 58 `أُفُق`, 43 `OFOQ`, 10 lines containing `نَبْراس` |
| `manifest.json` | 459 bytes | 2 `أُفُق`, 1 `OFOQ` |
| `ofoq-core.js` | 11 KB | 1 `أُفُق`, 4 `OFOQ` |
| `ofoq-workspaces.js` | 12 KB | 1 `أُفُق`, 5 `OFOQ` |
| `ofoq-profile.js` | 4 KB | 1 `أُفُق`, 11 `OFOQ` |
| `ofoq-metrics.js` | 4 KB | 1 `أُفُق`, 6 `OFOQ` |
| `supabase/functions/site-assistant/index.ts` | 20 KB | 2 `أُفُق`, 1 `نَبْراس`, 2 `Nibras` |

Counts are raw text matches in the inspected files, not a complete semantic classification. Some occurrences are internal identifiers, historical labels, comments, or product-section names and must not be blindly replaced.

### High-impact findings in `index.html`

- Document title, description, author, Open Graph, Twitter metadata and JSON-LD still describe the public OFOQ platform.
- A public GitHub Pages canonical URL and public website/organization structured data remain in the source.
- Header, footer, founder welcome, account wording, and section descriptions retain old public-brand language.
- The page still contains public-facing membership and marketplace concepts that conflict with the private single-owner product direction.
- Assistant launcher, chat header, accessibility labels, welcome copy, export labels, and local helper prompts still use the name نَبْراس.
- One local helper prompt explicitly describes the assistant as a guide to OFOQ.

### High-impact findings in the Edge Function

The current assistant prompt and model identity still frame the assistant as a visitor-facing platform guide. The future rewrite must make the authenticated owner the sole intended user and must preserve server-side authorization, quota reservation/settlement, bounded request handling, and safe operational logging.

## 3. Implementation sequence

### Gate A — private access boundary (must precede public-facing rebrand)

1. Owner configures Cloudflare Pages from the repository.
2. Owner enables Cloudflare Access with only the owner's verified identity allowed.
3. Protect production and every enabled preview hostname.
4. Test anonymous denial and owner success.
5. Independently test Supabase Edge Function and database authorization.
6. Verify the protected replacement and rollback path.
7. Only then consider retiring the old public GitHub Pages origin and changing repository visibility.

**Do not** disable GitHub Pages or change repository visibility before the replacement private host is verified. GitHub Free may disable Pages when a repository is made private.

### Gate B — canonical brand layer

1. Add a small, dependency-free canonical brand configuration.
2. Keep visible brand strings exact: `❤️ Aloosh alshawwa ❤️`.
3. Use the same value for the website and assistant.
4. Preserve stable IDs, route IDs, API contracts, database identifiers, storage keys and PWA scope.
5. Remove public SEO/canonical/JSON-LD metadata from the private build; do not treat `noindex` as access control.
6. Update the manifest and icon assets only with a tested PWA-compatible brand package.

### Gate C — owner-first application and assistant

1. Replace visitor onboarding and public-service language with an owner-only command center.
2. Rewrite the server-side assistant prompt around the authenticated owner's personal workflows.
3. Require explicit confirmation for publishing, sending, purchases, payments, trades, deletion and account/security changes.
4. Distinguish implemented tools, live integrations, static references and planned features.
5. Do not fabricate dashboard values or claim disconnected integrations are active.
6. Preserve the existing 78-section catalogue initially; reorganize into workspaces/library/archive only after route and feature mapping. Do not delete sections or user data as part of a visual rebrand.

### Gate D — quality and release

- Automated tests for exact website and assistant display strings.
- Static checks that active user-facing UI does not reintroduce the retired brand.
- Tests that stable DOM IDs and endpoint contracts remain compatible.
- Arabic RTL, mobile, keyboard, screen-reader, contrast and reduced-motion checks.
- Browser regression tests for existing workflows.
- Secret scan and built-asset inspection.
- Private-host access tests for production and previews.
- Backup, rollback and owner review before release.

## 4. Explicit non-actions and safety boundaries

This work package does not authorize or perform:
- Merge of PR #32 or any other PR.
- Production deployment or release.
- Cloudflare account creation, DNS, Access, or Pages configuration.
- GitHub Pages shutdown or repository visibility change.
- Supabase Auth, RLS, database, Edge Function, or secret changes in production.
- Paid APIs, subscriptions, domains, hosting plans, or credits.
- Public signup, public user accounts, billing, memberships, advertising, or commercial services.

## 5. Current implementation blocker

The private-host cutover requires the owner to connect/configure Cloudflare and verify the Access identity. Until that gate is complete, the visible brand replacement should remain staged on a protected development branch so the new personal identity is not prematurely exposed on the old public origin.

## 6. Next engineering actions

1. Complete a route/section inventory and classify each current section as daily workspace, occasional workspace, reference library, future experiment, or retire candidate.
2. Map all visible identity strings to their UI surfaces and distinguish display text from internal identifiers.
3. Define the canonical brand module and test contract before applying it to the application.
4. Prepare an owner-only assistant system-prompt contract while retaining the existing AI free-tier fail-closed policy.
5. Implement the brand and owner-first UI only after the privacy gate is established, then run the full regression suite.

**Audit baseline:** The private-access PR remains open and unmerged. The current public-facing application source still contains the old brand and visitor-oriented content. This document is a preparation artifact, not a claim that the site has already been rebranded or made private.
