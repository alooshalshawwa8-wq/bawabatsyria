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
