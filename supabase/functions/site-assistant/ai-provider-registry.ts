/**
 * Server-only AI provider registry.
 * Provider activation is fail-closed until free-tier eligibility is verified.
 */
export type AiProviderId = "gemini";
export type ProviderBlockReason = "missing_key" | "free_tier_unverified" | "disabled";

export interface AiProviderConfig {
  readonly id: AiProviderId;
  readonly modelId: string;
  readonly endpoint: string;
  readonly apiKey: string;
  readonly pricingStatus: "free-tier-unverified";
}

const PROVIDERS: Readonly<Record<AiProviderId, Omit<AiProviderConfig, "apiKey"> & {
  readonly enabled: boolean;
  readonly freeTierVerified: boolean;
}>> = {
  gemini: {
    id: "gemini",
    modelId: "gemini-3.5-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    pricingStatus: "free-tier-unverified",
    enabled: true,
    // Must remain false until the exact account/model quota and billing
    // behavior are verified by the owner. No paid route is permitted.
    freeTierVerified: false,
  },
};

export type ProviderEligibility =
  | { eligible: true; provider: AiProviderConfig }
  | { eligible: false; providerId: AiProviderId; reason: ProviderBlockReason };

/** Returns a safe reason without exposing secrets or provider internals. */
export function checkAiProviderEligibility(
  providerId: unknown,
  apiKey: string,
): ProviderEligibility {
  if (providerId !== "gemini") {
    return { eligible: false, providerId: "gemini", reason: "disabled" };
  }
  const provider = PROVIDERS.gemini;
  if (!apiKey.trim()) return { eligible: false, providerId: "gemini", reason: "missing_key" };
  if (!provider.enabled) return { eligible: false, providerId: "gemini", reason: "disabled" };
  if (!provider.freeTierVerified) {
    return { eligible: false, providerId: "gemini", reason: "free_tier_unverified" };
  }
  const { enabled: _enabled, freeTierVerified: _verified, ...safeConfig } = provider;
  return { eligible: true, provider: { ...safeConfig, apiKey } };
}

/** Legacy resolver now obeys the same free-only eligibility gate. */
export function resolveAiProvider(
  providerId: unknown,
  apiKey: string,
): AiProviderConfig | null {
  const result = checkAiProviderEligibility(providerId, apiKey);
  return result.eligible ? result.provider : null;
}

export function listConfiguredProviderMetadata(apiKey: string) {
  const eligibility = checkAiProviderEligibility("gemini", apiKey);
  return [{
    id: "gemini" as const,
    modelId: "gemini-3.5-flash-lite",
    pricingStatus: "free-tier-unverified" as const,
    eligible: eligibility.eligible,
    blockedReason: eligibility.eligible ? null : eligibility.reason,
  }];
}
