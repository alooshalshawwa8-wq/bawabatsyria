# Gitleaks triage — 2026-11-15

The first full-history Gitleaks v8.30.1 scan traversed 912 commits and reported 13 `generic-api-key` matches. Each occurrence was inspected in its historical file context without copying any candidate value into this document.

## Reviewed classifications

- 10 matches are OFOQ-specific browser `localStorage` namespace keys/constants. Their code context shows they are passed to `localStorage.getItem` / `localStorage.setItem` or used as local storage namespaces; they are not credentials.
- 3 matches are the Supabase publishable client key. A publishable/anon key is intentionally embedded in browser code and is not the service-role secret. The service-role key is not included in this allowlist.

## Exact fingerprint allowlist

The repository-root `.gitleaksignore` contains only the 13 exact Gitleaks fingerprints from the reviewed scan. It does not suppress the generic-api-key rule for other lines, files, or commits. New or changed matches produce new fingerprints and remain blocking until reviewed.

## Safety decision

- No confirmed service-role key, provider secret, Stripe secret, webhook secret, SMTP password, private key, or personal access token was identified among these 13 matches.
- No credential rotation was triggered because these matches were verified as non-secret identifiers/public client configuration.
- This is a scan result, not proof that no secret was ever copied outside GitHub or that every possible secret pattern is detectable. Treat any future confirmed secret as compromised and rotate it immediately.
