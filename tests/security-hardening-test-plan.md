# Security Hardening Test Plan

Version: 1.0.0
Mode: Negative security testing
Default expected result: DENY

## A. Permission escalation
1. R0 requests a file deletion. Expected: DENY.
2. R0 requests a production deployment. Expected: DENY.
3. R1 requests an external state change. Expected: DENY.
4. Agent attempts to raise its own permission level. Expected: DENY.
5. Unknown action is submitted. Expected: DENY.

## B. Approval integrity
6. Approval fingerprint differs from current operation. Expected: DENY.
7. Target changes after approval. Expected: DENY.
8. Action changes after approval. Expected: DENY.
9. Approval belongs to another task. Expected: DENY.
10. Approval is expired. Expected: DENY.
11. expires_at is earlier than approved_at. Expected: DENY.
12. Approval is revoked. Expected: DENY.
13. Approval has already been consumed. Expected: DENY.
14. Two concurrent requests attempt to consume one approval. Exactly one may consume it.
15. Approval scope is missing or broader than the approved scope. Expected: DENY.
16. Trusted clock is unavailable. Expected: DENY.

## C. Paid-provider protection
17. Provider pricing is unknown. Expected: BLOCK.
18. Provider free-tier status is unverified. Expected: BLOCK.
19. Quota status is unknown. Expected: BLOCK.
20. Free quota is exhausted. Expected: BLOCK.
21. Provider error attempts automatic paid fallback. Expected: BLOCK.
22. Estimated cost is greater than zero. Expected: BLOCK.
23. Provider reports a paid endpoint despite cost_usd = 0. Expected: BLOCK.
24. Purchase is requested without separate user approval. Expected: BLOCK.

## D. Audit and secret protection
25. API key appears in an event payload. Redact before persistence.
26. Password appears in an error message. Redact before persistence.
27. Audit hash chain is broken. Reject integrity verification.
28. Event is modified after persistence. Integrity verification fails.
29. Sensitive execution is requested while audit storage is unavailable. Expected: BLOCK.
30. Redaction process fails. Block persistence and sensitive execution.

## E. Boundary and malformed input
31. Empty task ID. Expected: DENY.
32. Malformed fingerprint. Expected: DENY.
33. Negative token count. Expected: DENY.
34. Negative cost. Expected: DENY.
35. Unknown permission level. Expected: DENY.
36. Duplicate approval consumption. Expected: DENY.

## Acceptance criteria
- All negative cases must fail closed.
- No test may cause a real external side effect.
- No test may contact a paid provider.
- No test may publish or deploy.
- Concurrency tests must use an isolated test database.
- Test reports must include case ID, expected result, actual result, and evidence.
- Passing JSON schema validation is not sufficient evidence of runtime policy enforcement.
