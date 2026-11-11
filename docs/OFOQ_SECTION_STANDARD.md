# OFOQ Section Experience Standard

Updated: 2026-11-11

## Reference experience
The football section (`sports_radar`) is the reference for a rich section workspace. Its current navigation includes:
- Home and overview
- Fixtures, live scores, date selection and league search/standings
- Competition directory and season archive
- Major matches and derbies
- Clubs and national teams
- Popularity/social following reference
- Match analysis studio
- API-Football data explorer
- Favorites

## Shared experience now deployed
Every section opened through `openSection` receives a contextual Gemini assistant panel. The panel sends the section's trusted profile key with the request, keeps short conversation context in memory for that open session, and does not store prompts in browser local storage.

The shared catalogue/explorer layer already provides topic discovery, search, topic filters, image galleries, favorites, a local planner and a short activity/challenge. Section-specific tools remain intact.

## Gemini routing
The frontend maps section IDs to a fixed set of trusted specialist profiles. The Edge Function accepts only the known profile keys and adds the relevant instruction to the existing system prompt. Unknown IDs fall back to the general profile.

## Cost and safety controls
- Keep the existing shared daily Gemini reservation limit at 30 requests per UTC day. Do not raise it without explicit approval.
- Keep existing per-runtime rate limiting and input size/message limits.
- Each click on the section assistant makes one Gemini request. No automatic refresh or background generation.
- No Gemini API key is present in frontend code.
- Do not send API-Football requests as part of Gemini assistant usage.
- Keep football provider protection, cache and request budgets unchanged.
- Do not describe assistant output as live data unless the relevant source data is actually supplied.

## Verification status
- GitHub `main/index.html` updated with the shared contextual Gemini panel.
- Supabase Edge Function `site-assistant` deployed as version 17 (ACTIVE).
- `football-data` was not changed; current observed version 43 (ACTIVE).
- No Gemini or API-Football request was sent as a functional test, to avoid consuming provider quota.
- Browser-level end-to-end behavior still needs confirmation on the published GitHub Pages site.

## 2026-11-11 — Cosmic glass interface and navigation upgrade

- Added the `ofoq-cosmic-ui-v2` design layer to `index.html`: glass-like panels, cyan/teal luminous accents, refined hero treatment, responsive section cards, focus states, reduced-motion handling, and mobile layout refinements.
- Added `ofoq-command-center-v2`: a searchable command/navigation dialog built from the existing `sections` collection, with keyboard shortcuts (Ctrl/Cmd+K and /), Escape-to-close, focus handling, quick section opening, reading progress, and a back-to-top control.
- The command center is navigation-only and does not call Gemini, API-Football, or any external API.
- Completed the UI Gemini profile routing for the remaining section IDs: news, terms_of_use, accessibility_center, cars, bikes, phones, laptops, and designs. Each maps to an existing backend-approved profile.
- Preserved the existing section renderers, football module, section explorer, and Gemini endpoint. No backend function, database schema, provider key, daily quota, or API-Football configuration was changed.
- Commits: `1ca74fc0504194b9aa2086bf696547cafee75319` (visual layer and command center); `5844a7b5f3cca00911664765069587726ac443e4` (remaining Gemini routing and keyboard shortcut refinement).
- Verification: fetched the updated `main/index.html` after both commits and confirmed the new style/script markers, existing Gemini script, football renderer, and explorer code remain present. Live browser/mobile interaction testing and a real Gemini request have not yet been performed.


## 2026-11-11 — Gemini failure/retry context fix

- Audited the contextual Gemini panel's request lifecycle in the current frontend.
- Fixed a retry-context issue: when a request fails, its unsatisfied user message is removed from the in-memory conversation history if it is still the latest message. A later attempt therefore does not silently resend the failed prompt as part of the next request.
- Successful conversation turns remain unchanged; the existing 10-message context cap, one-click/one-request behavior, endpoint, specialist routing, and server-side daily reservation limit remain unchanged.
- No Gemini or API-Football request was sent during this code change.
- Commit: 281f826723130844a00aab6ad4a0ea4e7b6fb68c.
- Verification: source change saved to GitHub main; runtime/browser behavior remains untested pending a safe browser test.


## 2026-11-11 — Accessible section workspace tabs

- Improved the shared workspace tabs used across section pages with semantic tablist, tab, and tabpanel roles.
- Added selected-state and panel relationships for assistive technologies, and keyboard navigation using Left/Right arrows plus Home/End.
- Kept the existing tools, knowledge studio, task checklist, notes, local persistence, and section-specific renderers intact.
- This is a frontend-only accessibility improvement; no API, provider quota, database, or secrets were changed.
- Commit: a32ac4700ef0eed839388dd4913db761b57f6e4b.
- Verification: source saved to GitHub main; browser and screen-reader interaction testing remains pending.


## Specialized business and trading knowledge tracks — 2026-11-11

Added first-match specialized knowledge profiles ahead of the broad category profiles in `OFOQ_SECTION_STUDIOS`:
- `ecommerce_studio`: product presentation, full-cost pricing and contribution margin, order operations, and conversion measurement.
- `trading_academy`: market structure, technical-analysis literacy, position sizing and risk, and paper-trading journals. Explicitly educational; no buy/sell recommendations.
- `trader_market`: construction-material catalog units, quantity/waste estimates, landed procurement cost, and quotation terms.
- `accounting_vip`: bookkeeping separation, pricing and margin, stock movement, and operating reports.
- Business/startup/freelance/jobs/directory/marketplace sections receive a dedicated customer, revenue-model, acquisition, and operations profile.

Implementation is front-end content only. No API, Supabase, database, provider key, quota, or external request behavior changed. Existing utility modules and tools were not replaced. The specialized profiles use the existing knowledge-studio renderer and local workspace. Validation is source-level only; no live browser, accessibility, or end-to-end tests were run. GitHub Pages deployment is not asserted.


## Merchant inventory controls — 2026-11-11

Extended the existing `accounting_vip` local inventory ledger without replacing its pricing calculator or backup format:
- Added an optional per-item reorder/low-stock threshold (legacy records and version-1 backups without the field remain supported and default to zero).
- Added low-stock status and a summary listing items at or below their configured threshold.
- Added per-item stock-in and stock-out controls with positive-integer validation and prevention of negative balances.
- Added an accounting workspace checklist covering item entry, reorder thresholds, stock movements, and regular backups.
- Existing JSON backup export/import remains additive; imported items are validated and merged rather than replacing current records.

All inventory data remains in browser localStorage on the current device. No API, Supabase, Gemini, API-Football, provider keys, or quotas were changed. Source-level checks only; no live browser/device test or GitHub Pages deployment verification was performed.
