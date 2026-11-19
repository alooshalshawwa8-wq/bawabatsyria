"""Offline regression tests for security_runtime_harness.

Run with:
    python -m unittest discover -s tests -p "test_security_runtime_harness.py" -v

All tests use synthetic values and standard-library facilities only.
"""
from dataclasses import replace
import threading
import unittest

from security_runtime_harness import (
    ApprovalAuthority,
    AuditLog,
    PaymentPolicy,
    RiskLevel,
    SecurityDenied,
    deny_network_access,
    redact_secrets,
    require_level,
    run_policy_check,
)


class SecurityRuntimeHarnessTests(unittest.TestCase):
    def setUp(self):
        self.authority = ApprovalAuthority(b"unit-test-signing-key-32-bytes!!")
        self.approval = self.authority.issue(
            approval_id="approval-001",
            subject="operator-test",
            scope="test:write",
            level=RiskLevel.R3,
            issued_at=100.0,
            expires_at=200.0,
        )

    # R0-R4 authorization boundary tests (6)
    def test_01_r0_allows_r0(self):
        require_level(RiskLevel.R0, RiskLevel.R0)

    def test_02_r0_rejects_r1(self):
        with self.assertRaises(SecurityDenied):
            require_level(RiskLevel.R0, RiskLevel.R1)

    def test_03_r1_allows_r1(self):
        require_level(RiskLevel.R1, RiskLevel.R1)

    def test_04_r2_rejects_r3(self):
        with self.assertRaises(SecurityDenied):
            require_level(RiskLevel.R2, RiskLevel.R3)

    def test_05_r3_allows_r2(self):
        require_level(RiskLevel.R3, RiskLevel.R2)

    def test_06_r4_allows_r4(self):
        require_level(RiskLevel.R4, RiskLevel.R4)

    # Approval integrity, identity, scope, time, level and usage (8)
    def test_07_valid_approval_is_consumed(self):
        self.authority.consume(
            self.approval, subject="operator-test",
            scope="test:write", required_level=RiskLevel.R2, now=150.0
        )

    def test_08_modified_signature_is_rejected(self):
        altered = replace(self.approval, signature="0" * 64)
        with self.assertRaises(SecurityDenied):
            self.authority.consume(
                altered, subject="operator-test", scope="test:write",
                required_level=RiskLevel.R2, now=150.0
            )

    def test_09_wrong_subject_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            self.authority.consume(
                self.approval, subject="other-user", scope="test:write",
                required_level=RiskLevel.R2, now=150.0
            )

    def test_10_wrong_scope_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            self.authority.consume(
                self.approval, subject="operator-test", scope="test:admin",
                required_level=RiskLevel.R2, now=150.0
            )

    def test_11_not_yet_valid_approval_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            self.authority.consume(
                self.approval, subject="operator-test", scope="test:write",
                required_level=RiskLevel.R2, now=99.0
            )

    def test_12_expired_approval_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            self.authority.consume(
                self.approval, subject="operator-test", scope="test:write",
                required_level=RiskLevel.R2, now=200.0
            )

    def test_13_insufficient_approval_level_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            self.authority.consume(
                self.approval, subject="operator-test", scope="test:write",
                required_level=RiskLevel.R4, now=150.0
            )

    def test_14_reused_one_time_approval_is_rejected(self):
        args = dict(
            subject="operator-test", scope="test:write",
            required_level=RiskLevel.R2, now=150.0
        )
        self.authority.consume(self.approval, **args)
        with self.assertRaises(SecurityDenied):
            self.authority.consume(self.approval, **args)

    # Concurrent one-time consumption (4)
    def test_15_concurrent_consumption_has_one_winner(self):
        barrier = threading.Barrier(8)
        outcomes = []
        lock = threading.Lock()

        def worker():
            barrier.wait()
            try:
                self.authority.consume(
                    self.approval, subject="operator-test",
                    scope="test:write", required_level=RiskLevel.R2,
                    now=150.0
                )
                result = "accepted"
            except SecurityDenied:
                result = "denied"
            with lock:
                outcomes.append(result)

        threads = [threading.Thread(target=worker) for _ in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=3)
        self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.assertEqual(outcomes.count("accepted"), 1)
        self.assertEqual(outcomes.count("denied"), 7)

    def test_16_concurrent_workers_all_finish(self):
        barrier = threading.Barrier(4)
        finished = []
        lock = threading.Lock()

        def worker():
            barrier.wait()
            with lock:
                finished.append(True)

        threads = [threading.Thread(target=worker) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=3)
        self.assertEqual(len(finished), 4)

    def test_17_multi_use_approval_respects_limit(self):
        approval = self.authority.issue(
            approval_id="approval-3-use", subject="operator-test",
            scope="test:read", level=RiskLevel.R1, issued_at=1,
            expires_at=10, max_uses=3
        )
        args = dict(
            subject="operator-test", scope="test:read",
            required_level=RiskLevel.R1, now=2
        )
        for _ in range(3):
            self.authority.consume(approval, **args)
        with self.assertRaises(SecurityDenied):
            self.authority.consume(approval, **args)

    def test_18_invalid_approval_lifetime_is_rejected(self):
        with self.assertRaises(ValueError):
            self.authority.issue(
                approval_id="bad", subject="operator-test", scope="x",
                level=RiskLevel.R1, issued_at=5, expires_at=5
            )

    # Paid-service and automatic-transition prohibitions (4)
    def test_19_free_provider_is_allowed(self):
        PaymentPolicy().authorize(provider="free-test", paid=False, auto_switch=False)

    def test_20_paid_provider_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            PaymentPolicy().authorize(provider="paid-test", paid=True, auto_switch=False)

    def test_21_automatic_paid_fallback_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            PaymentPolicy().authorize(provider="free-test", paid=False, auto_switch=True)

    def test_22_missing_provider_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            PaymentPolicy().authorize(provider="", paid=False, auto_switch=False)

    # Audit tamper detection and secret redaction (3)
    def test_23_audit_chain_verifies(self):
        log = AuditLog()
        log.append("approval_checked", "synthetic")
        log.append("action_denied", "synthetic")
        self.assertTrue(log.verify())

    def test_24_audit_mutation_is_detected(self):
        log = AuditLog()
        log.append("event", "original")
        altered = [dict(row) for row in log.snapshot()]
        altered[0]["details"] = "tampered"
        self.assertFalse(log.verify(altered))

    def test_25_secret_values_are_redacted(self):
        text = "api_key=abc123 password:supersecret ghp_" + ("A" * 30)
        cleaned = redact_secrets(text)
        self.assertNotIn("abc123", cleaned)
        self.assertNotIn("supersecret", cleaned)
        self.assertNotIn("A" * 30, cleaned)
        self.assertIn("[REDACTED]", cleaned)

    # Isolation and default-deny composition (3)
    def test_26_network_disabled_is_accepted(self):
        deny_network_access(network_enabled=False)

    def test_27_network_enabled_is_rejected(self):
        with self.assertRaises(SecurityDenied):
            deny_network_access(network_enabled=True)

    def test_28_composed_policy_rejects_paid_or_networked_execution(self):
        with self.assertRaises(SecurityDenied):
            run_policy_check(
                granted=RiskLevel.R4, required=RiskLevel.R1,
                provider="free-test", paid=False, auto_switch=False,
                network_enabled=True
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
