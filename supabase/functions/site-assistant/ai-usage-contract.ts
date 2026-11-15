/**
 * Provider-neutral usage and quota contract.
 *
 * This module deliberately contains no persistence or pricing guesses. It
 * normalizes observed provider usage; unknown values remain null.
 */
export type AiExecutionStatus = "success" | "quota_exhausted" | "failed";

export interface AiUsageEvent {
  schemaVersion: 1;
  providerId: string;
  modelId: string;
  task: string;
  status: AiExecutionStatus;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  observedAt: string;
}

export interface ProviderQuotaPolicy {
  freeOnly: true;
  allowPaidFallback: false;
  dailyRequestLimit: number;
  minuteRequestLimit: number;
  dailyTokenLimit: number | null;
  minuteTokenLimit: number | null;
}

export const GEMINI_QUOTA_POLICY: ProviderQuotaPolicy = Object.freeze({
  freeOnly: true,
  allowPaidFallback: false,
  dailyRequestLimit: 30,
  minuteRequestLimit: 5,
  dailyTokenLimit: null,
  minuteTokenLimit: null,
});

function safeCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function normalizeAiUsageEvent(input: {
  providerId: string;
  modelId: string;
  task: string;
  status: AiExecutionStatus;
  latencyMs: number;
  usage?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown; totalTokenCount?: unknown } | null;
  observedAt?: string;
}): AiUsageEvent {
  const inputTokens = safeCount(input.usage?.promptTokenCount);
  const outputTokens = safeCount(input.usage?.candidatesTokenCount);
  const reportedTotal = safeCount(input.usage?.totalTokenCount);
  const totalTokens = reportedTotal ?? (
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  );
  return {
    schemaVersion: 1,
    providerId: input.providerId,
    modelId: input.modelId,
    task: input.task,
    status: input.status,
    latencyMs: Number.isFinite(input.latencyMs) ? Math.max(0, Math.round(input.latencyMs)) : 0,
    inputTokens,
    outputTokens,
    totalTokens,
    // Pricing is intentionally unknown until an authoritative free-tier or
    // paid rate is verified for this exact model/account.
    costUsd: null,
    observedAt: input.observedAt ?? new Date().toISOString(),
  };
}
