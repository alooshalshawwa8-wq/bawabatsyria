"""Offline security-policy runtime harness.

This module is deliberately self-contained and uses only the Python standard
library. It models policy decisions; it does not connect to production systems,
read environment secrets, make network requests, or initiate payments.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
import hashlib
import hmac
import json
import re
import threading
import time
from typing import Any, Iterable


class SecurityDenied(PermissionError):
    """Raised whenever a security invariant is not satisfied."""


class RiskLevel(IntEnum):
    R0 = 0  # public/read-only data
    R1 = 1  # personal read
    R2 = 2  # reversible personal write
    R3 = 3  # sensitive or externally visible action
    R4 = 4  # critical/administrative action


def require_level(granted: RiskLevel, required: RiskLevel) -> None:
    if granted < required:
        raise SecurityDenied("insufficient privilege level")


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


@dataclass(frozen=True)
class Approval:
    approval_id: str
    subject: str
    scope: str
    level: RiskLevel
    issued_at: float
    expires_at: float
    max_uses: int
    signature: str


class ApprovalAuthority:
    """Issues and validates one-time, scoped, time-limited approvals."""

    def __init__(self, signing_key: bytes):
        if not isinstance(signing_key, bytes) or len(signing_key) < 16:
            raise ValueError("signing key must contain at least 16 bytes")
        self._key = signing_key
        self._uses: dict[str, int] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _payload(
        approval_id: str, subject: str, scope: str, level: RiskLevel,
        issued_at: float, expires_at: float, max_uses: int
    ) -> bytes:
        return canonical_json({
            "approval_id": approval_id,
            "subject": subject,
            "scope": scope,
            "level": int(level),
            "issued_at": issued_at,
            "expires_at": expires_at,
            "max_uses": max_uses,
        })

    def issue(
        self, *, approval_id: str, subject: str, scope: str,
        level: RiskLevel, issued_at: float, expires_at: float,
        max_uses: int = 1
    ) -> Approval:
        if not approval_id or not subject or not scope:
            raise ValueError("approval identity, subject, and scope are required")
        if expires_at <= issued_at or max_uses < 1:
            raise ValueError("invalid approval lifetime or use count")
        payload = self._payload(
            approval_id, subject, scope, level, issued_at, expires_at, max_uses
        )
        signature = hmac.new(self._key, payload, hashlib.sha256).hexdigest()
        return Approval(
            approval_id, subject, scope, level, issued_at, expires_at,
            max_uses, signature
        )

    def consume(
        self, approval: Approval, *, subject: str, scope: str,
        required_level: RiskLevel, now: float
    ) -> None:
        payload = self._payload(
            approval.approval_id, approval.subject, approval.scope,
            approval.level, approval.issued_at, approval.expires_at,
            approval.max_uses
        )
        expected = hmac.new(self._key, payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, approval.signature):
            raise SecurityDenied("approval integrity check failed")
        if approval.subject != subject or approval.scope != scope:
            raise SecurityDenied("approval subject or scope mismatch")
        if now < approval.issued_at or now >= approval.expires_at:
            raise SecurityDenied("approval is not currently valid")
        require_level(approval.level, required_level)
        with self._lock:
            used = self._uses.get(approval.approval_id, 0)
            if used >= approval.max_uses:
                raise SecurityDenied("approval use limit exhausted")
            self._uses[approval.approval_id] = used + 1


class PaymentPolicy:
    """Default-deny policy: this harness never authorizes paid services."""

    def authorize(self, *, provider: str, paid: bool, auto_switch: bool) -> None:
        if paid or auto_switch:
            raise SecurityDenied("paid services and automatic paid fallback are forbidden")
        if not provider or not isinstance(provider, str):
            raise SecurityDenied("provider must be explicitly identified")


class AuditLog:
    """Append-only in-memory hash chain suitable for tamper-detection tests."""

    def __init__(self):
        self._entries: list[dict[str, str]] = []
        self._lock = threading.Lock()

    def append(self, event: str, details: str = "") -> str:
        with self._lock:
            previous = self._entries[-1]["digest"] if self._entries else "0" * 64
            body = canonical_json({
                "sequence": len(self._entries),
                "event": event,
                "details": details,
                "previous": previous,
            })
            digest = hashlib.sha256(body).hexdigest()
            self._entries.append({
                "event": event, "details": details,
                "previous": previous, "digest": digest,
            })
            return digest

    def snapshot(self) -> tuple[dict[str, str], ...]:
        with self._lock:
            return tuple(dict(entry) for entry in self._entries)

    def verify(self, entries: Iterable[dict[str, str]] | None = None) -> bool:
        rows = list(self.snapshot() if entries is None else entries)
        previous = "0" * 64
        for index, row in enumerate(rows):
            body = canonical_json({
                "sequence": index,
                "event": row["event"],
                "details": row["details"],
                "previous": previous,
            })
            digest = hashlib.sha256(body).hexdigest()
            if row.get("previous") != previous or not hmac.compare_digest(
                digest, row.get("digest", "")
            ):
                return False
            previous = digest
        return True


_SECRET_PATTERNS = (
    re.compile(r"(?i)(api[_-]?key|token|password|secret)\s*[:=]\s*([^\s,;]+)"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
)


def redact_secrets(value: str) -> str:
    """Redact common key/value credentials and GitHub token-like strings."""
    result = value
    result = _SECRET_PATTERNS[0].sub(r"\1=[REDACTED]", result)
    return _SECRET_PATTERNS[1].sub("[REDACTED_TOKEN]", result)


def deny_network_access(*, network_enabled: bool) -> None:
    """Explicit test guard; callers must keep network disabled."""
    if network_enabled:
        raise SecurityDenied("network access is forbidden in isolated tests")


def run_policy_check(
    *, granted: RiskLevel, required: RiskLevel, provider: str,
    paid: bool, auto_switch: bool, network_enabled: bool = False
) -> None:
    deny_network_access(network_enabled=network_enabled)
    require_level(granted, required)
    PaymentPolicy().authorize(
        provider=provider, paid=paid, auto_switch=auto_switch
    )
