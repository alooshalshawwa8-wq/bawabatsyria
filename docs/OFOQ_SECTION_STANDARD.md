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
