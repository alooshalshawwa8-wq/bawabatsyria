/**
 * Server-only AI provider registry.
 *
 * This is intentionally an allowlist, not a dynamic provider/model selector.
 * Never accept provider IDs, model IDs, or provider URLs from browser input.
 */
export type AiProviderId = "gemini";

export interface AiProviderConfig {
  readonly id: AiProviderId;
  readonly modelId: string;
  readonly endpoint: string;
  readonly apiKey: string;
  readonly pricingStatus: "free-tier-limited";
}

const PROVIDERS: Readonly<Record<AiProviderId, Omit<AiProviderConfig, "apiKey">>> = {
  gemini: {
    id: "gemini",
    modelId: "gemini-3.5-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    pricingStatus: "free-tier-limited",
  },
};

/**
 * Resolves only a server-approved provider and requires its server-side key.
 * No default/fallback to a paid model or arbitrary URL is possible here.
 */
export function resolveAiProvider(
  providerId: unknown,
  apiKey: string,
): AiProviderConfig | null {
  if (providerId !== "gemini" || !apiKey.trim()) return null;
  const provider = PROVIDERS.gemini;
  return { ...provider, apiKey };
}

/** Exposes safe registry metadata without returning credentials. */
export function listConfiguredProviderMetadata(apiKey: string) {
  const provider = resolveAiProvider("gemini", apiKey);
  if (!provider) return [];
  return [{
    id: provider.id,
    modelId: provider.modelId,
    pricingStatus: provider.pricingStatus,
  }] as const;
}
