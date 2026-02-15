import { configStore } from "./config"
import { diagnosticsService } from "./diagnostics"
import { fetchModelsDevData, getModelFromModelsDevByProviderId } from "./models-dev-service"
import type { ModelInfo, EnhancedModelInfo } from "../shared/types"

// Re-export ModelInfo for backward compatibility
export type { ModelInfo, EnhancedModelInfo } from "../shared/types"

interface ModelsResponse {
  data: ModelInfo[]
  object: string
}

// Cache for models to avoid frequent API calls
const modelsCache = new Map<
  string,
  { models: ModelInfo[]; timestamp: number }
>()
const CACHE_DURATION = 5 * 60 * 1000

/**
 * Map our provider IDs to models.dev provider IDs
 * @param providerId - Our provider ID (nemotron)
 * @returns The models.dev provider ID
 */
function mapToModelsDevProviderId(providerId: string): string {
  // Map our provider IDs to models.dev provider IDs
  if (providerId === "nemotron") {
    return "nvidia"
  }
  return providerId
}

/**
 * Enhance a ModelInfo object with data from models.dev
 * @param model - The basic ModelInfo to enhance
 * @param providerId - Our provider ID (nemotron)
 * @returns Enhanced model info with pricing and capabilities
 */
function enhanceModelWithModelsDevData(
  model: ModelInfo,
  providerId: string,
): EnhancedModelInfo {
  const modelsDevProviderId = mapToModelsDevProviderId(providerId)
  const modelsDevModel = getModelFromModelsDevByProviderId(model.id, modelsDevProviderId)

  if (!modelsDevModel) {
    // Return as-is if no models.dev data found
    return model
  }

  const enhanced: EnhancedModelInfo = {
    ...model,
    // Use models.dev name if available, otherwise keep original
    name: model.name,
    family: modelsDevModel.family,

    // Capability flags
    supportsAttachment: modelsDevModel.attachment,
    supportsReasoning: modelsDevModel.reasoning,
    supportsToolCalls: modelsDevModel.tool_call,
    supportsStructuredOutput: modelsDevModel.structured_output,
    supportsTemperature: modelsDevModel.temperature,

    // Metadata
    knowledge: modelsDevModel.knowledge,
    releaseDate: modelsDevModel.release_date,
    lastUpdated: modelsDevModel.last_updated,
    openWeights: modelsDevModel.open_weights,

    // Pricing (USD per million tokens)
    inputCost: modelsDevModel.cost?.input,
    outputCost: modelsDevModel.cost?.output,
    reasoningCost: modelsDevModel.cost?.reasoning,
    cacheReadCost: modelsDevModel.cost?.cache_read,
    cacheWriteCost: modelsDevModel.cost?.cache_write,

    // Limits
    contextLimit: modelsDevModel.limit?.context,
    outputLimit: modelsDevModel.limit?.output,

    // Modalities
    inputModalities: modelsDevModel.modalities?.input,
    outputModalities: modelsDevModel.modalities?.output,
  }

  // Also update context_length if we have it from models.dev and it wasn't set
  if (!enhanced.context_length && modelsDevModel.limit?.context) {
    enhanced.context_length = modelsDevModel.limit.context
  }

  return enhanced
}

/**
 * Fetch available models from NVIDIA NIM API (Nemotron)
 * NVIDIA NIM uses OpenAI-compatible API at https://integrate.api.nvidia.com/v1
 */
async function fetchNemotronModels(
  baseUrl?: string,
  apiKey?: string,
): Promise<ModelInfo[]> {
  if (!apiKey) {
    throw new Error("NVIDIA API key is required")
  }

  const url = `${baseUrl || "https://integrate.api.nvidia.com/v1"}/models`

  diagnosticsService.logInfo(
    "models-service",
    `Fetching Nemotron models from: ${url}`,
    {
      baseUrl,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : "none",
    },
  )

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    diagnosticsService.logError(
      "models-service",
      `Nemotron models API request failed`,
      {
        url,
        status: response.status,
        statusText: response.statusText,
        errorText,
      },
    )
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const data: ModelsResponse = await response.json()

  diagnosticsService.logInfo(
    "models-service",
    `Nemotron models API response`,
    {
      url,
      modelsCount: data.data?.length || 0,
      firstFewModels: data.data?.slice(0, 3).map(m => ({ id: m.id, name: m.name || formatModelName(m.id) })) || [],
    },
  )

  // Filter to Nemotron and related NVIDIA models
  const filteredModels = data.data.filter(
    (model) =>
      model.id &&
      model.id.length > 0 &&
      (model.id.includes("nemotron") || model.id.startsWith("nvidia/"))
  )

  return filteredModels
    .map((model) => ({
      id: model.id,
      name: formatModelName(model.id),
      description: model.description,
      context_length: model.context_length,
      created: model.created,
    }))
    .sort((a, b) => {
      // Prioritize Nemotron models
      const aIsNemotron = a.id.includes("nemotron")
      const bIsNemotron = b.id.includes("nemotron")
      if (aIsNemotron && !bIsNemotron) return -1
      if (!aIsNemotron && bIsNemotron) return 1
      return a.name.localeCompare(b.name)
    })
}

/**
 * Format model ID into a human-readable name
 */
function formatModelName(modelId: string): string {
  // Handle common model naming patterns
  const nameMap: Record<string, string> = {
    // OpenAI models
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4": "GPT-4",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
    "o1-preview": "o1 Preview",
    "o1-mini": "o1 Mini",

    // Anthropic Claude models (OpenRouter format)
    "anthropic/claude-3.5-sonnet": "Claude 3.5 Sonnet",
    "anthropic/claude-3-opus": "Claude 3 Opus",
    "anthropic/claude-3-sonnet": "Claude 3 Sonnet",
    "anthropic/claude-3-haiku": "Claude 3 Haiku",

    // Google models
    "google/gemini-1.5-pro": "Gemini 1.5 Pro",
    "google/gemini-1.5-flash": "Gemini 1.5 Flash",
    "google/gemini-1.0-pro": "Gemini 1.0 Pro",
    "gemini-1.5-pro": "Gemini 1.5 Pro",
    "gemini-1.5-flash": "Gemini 1.5 Flash",
    "gemini-1.0-pro": "Gemini 1.0 Pro",

    // Meta Llama models
    "meta-llama/llama-3.1-405b-instruct": "Llama 3.1 405B Instruct",
    "meta-llama/llama-3.1-70b-instruct": "Llama 3.1 70B Instruct",
    "meta-llama/llama-3.1-8b-instruct": "Llama 3.1 8B Instruct",
    "meta-llama/llama-3-70b-instruct": "Llama 3 70B Instruct",
    "meta-llama/llama-3-8b-instruct": "Llama 3 8B Instruct",

    // Groq models
    "moonshotai/kimi-k2-instruct": "Kimi K2 Instruct (Moonshot AI)",
    "openai/gpt-oss-20b": "GPT-OSS 20B (OpenAI)",
    "openai/gpt-oss-120b": "GPT-OSS 120B (OpenAI)",
    "gemma2-9b-it": "Gemma2 9B IT",
    "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
    "llama-3.1-70b-versatile": "Llama 3.1 70B Versatile",
    "mixtral-8x7b-32768": "Mixtral 8x7B",

    // Mistral models
    "mistralai/mistral-7b-instruct": "Mistral 7B Instruct",
    "mistralai/mixtral-8x7b-instruct": "Mixtral 8x7B Instruct",
    "mistralai/mixtral-8x22b-instruct": "Mixtral 8x22B Instruct",

    // NVIDIA Nemotron models
    "nvidia/llama-3.1-nemotron-70b-instruct": "Nemotron 70B Instruct",
    "nvidia/llama-3.1-nemotron-nano-8b-v1": "Nemotron Nano 8B",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1": "Nemotron Ultra 253B",
    "nvidia/nemotron-4-340b-instruct": "Nemotron-4 340B Instruct",
    "nvidia/nemotron-mini-4b-instruct": "Nemotron Mini 4B Instruct",
  }

  // Check for exact match first
  if (nameMap[modelId]) {
    return nameMap[modelId]
  }

  // Handle OpenRouter format (provider/model-name)
  if (modelId.includes("/")) {
    const [provider, model] = modelId.split("/")
    const providerNames: Record<string, string> = {
      anthropic: "Anthropic",
      openai: "OpenAI",
      google: "Google",
      "meta-llama": "Meta",
      mistralai: "Mistral",
      cohere: "Cohere",
      perplexity: "Perplexity",
      nvidia: "NVIDIA",
    }

    const formattedProvider =
      providerNames[provider] ||
      provider.charAt(0).toUpperCase() + provider.slice(1)
    const formattedModel = model
      .split("-")
      .map((part) => {
        // Handle special cases
        if (part === "instruct") return "Instruct"
        if (part === "turbo") return "Turbo"
        if (part.match(/^\d+b$/)) return part.toUpperCase() // 70b -> 70B
        if (part.match(/^\d+\.\d+$/)) return part // version numbers like 3.1
        return part.charAt(0).toUpperCase() + part.slice(1)
      })
      .join(" ")

    return `${formattedModel} (${formattedProvider})`
  }

  // Fallback: capitalize each part
  return modelId
    .split("-")
    .map((part) => {
      // Handle special cases
      if (part === "instruct") return "Instruct"
      if (part === "turbo") return "Turbo"
      if (part.match(/^\d+b$/)) return part.toUpperCase() // 70b -> 70B
      if (part.match(/^\d+\.\d+$/)) return part // version numbers like 3.1
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

/**
 * Main function to fetch available models for a provider
 */
export async function fetchAvailableModels(
  providerId: string,
): Promise<ModelInfo[]> {
  const config = configStore.get()

  // Include base URL and API key hash in cache key so changing credentials invalidates cache
  // This ensures switching between presets with the same URL but different keys fetches fresh models
  const cacheKeyParts = [providerId]
  if (providerId === "nemotron") {
    const baseUrl = config.nemotronBaseUrl || "https://integrate.api.nvidia.com/v1"
    const apiKey = config.nemotronApiKey || ""
    cacheKeyParts.push(baseUrl)
    // Include a simple hash of API key (first 8 chars) to invalidate cache on key change
    // without exposing the full key in logs/debug output
    if (apiKey) {
      cacheKeyParts.push(apiKey.slice(0, 8))
    }
  }

  const cacheKey = cacheKeyParts.join("|")
  const cached = modelsCache.get(cacheKey)
  const now = Date.now()
  const cacheValid =
    !!cached &&
    now - cached.timestamp < CACHE_DURATION &&
    cached.models.length > 0

  // Log the request
  diagnosticsService.logInfo(
    "models-service",
    `Fetching models for provider: ${providerId}`,
    {
      providerId,
      cacheKey,
      hasCached: !!cached,
      cacheAge: cached ? now - cached.timestamp : null,
      cacheValid,
    },
  )

  // Return cached result if still valid
  if (cacheValid) {
    diagnosticsService.logInfo(
      "models-service",
      `Returning cached models for ${providerId}`,
      { count: cached?.models.length || 0 },
    )
    return cached!.models
  }

  try {
    let models: ModelInfo[] = []

    // Log config details for debugging
    diagnosticsService.logInfo(
      "models-service",
      `Config for ${providerId}`,
      {
        providerId,
        hasNemotronApiKey: !!config.nemotronApiKey,
      },
    )

    // Only nemotron provider is supported
    if (providerId !== "nemotron") {
      throw new Error(`Unsupported provider: ${providerId}`)
    }

    const baseUrl = config.nemotronBaseUrl
    models = await fetchNemotronModels(baseUrl, config.nemotronApiKey)

    // Trigger models.dev cache population in background (don't await)
    fetchModelsDevData().catch((err) => {
      diagnosticsService.logInfo(
        "models-service",
        `Background models.dev fetch failed (non-blocking)`,
        { error: err instanceof Error ? err.message : String(err) }
      )
    })

    // Enhance models with models.dev data
    const enhancedModels = models.map((model) =>
      enhanceModelWithModelsDevData(model, providerId)
    )

    // Log successful fetch
    diagnosticsService.logInfo(
      "models-service",
      `Successfully fetched ${enhancedModels.length} models for ${providerId}`,
      {
        providerId,
        count: enhancedModels.length,
        modelIds: enhancedModels.map(m => m.id),
      },
    )

    // Cache the result only if we have at least one model
    if (enhancedModels.length > 0) {
      modelsCache.set(cacheKey, {
        models: enhancedModels,
        timestamp: now,
      })
    } else {
      diagnosticsService.logInfo(
        "models-service",
        `Not caching empty models list for ${providerId}`,
        {
          providerId,
          cacheKey,
        },
      )
    }

    return enhancedModels
  } catch (error) {
    diagnosticsService.logError(
      "models-service",
      `Failed to fetch models for ${providerId}`,
      {
        providerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    )

    // Return fallback models if API call fails
    // Try async fallback first, then sync fallback
    try {
      const fallbackModels = await getFallbackModelsAsync(providerId)
      diagnosticsService.logInfo(
        "models-service",
        `Returning ${fallbackModels.length} fallback models (from models.dev) for ${providerId}`,
        {
          providerId,
          fallbackCount: fallbackModels.length,
          fallbackIds: fallbackModels.map(m => m.id),
        },
      )
      return fallbackModels
    } catch {
      const fallbackModels = getFallbackModels(providerId)
      diagnosticsService.logInfo(
        "models-service",
        `Returning ${fallbackModels.length} fallback models (hardcoded) for ${providerId}`,
        {
          providerId,
          fallbackCount: fallbackModels.length,
          fallbackIds: fallbackModels.map(m => m.id),
        },
      )
      return fallbackModels
    }
  }
}

/**
 * Minimal hardcoded fallback models - only used when BOTH provider API
 * AND models.dev cache are unavailable. Keep this list minimal since
 * models.dev is the primary source for fallback model data.
 */
const HARDCODED_FALLBACK_MODELS: Record<string, ModelInfo[]> = {
  nvidia: [
    { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B Instruct" },
    { id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B" },
  ],
}

/**
 * Get fallback models when API calls fail.
 * First tries to get models from models.dev cache, then falls back to hardcoded models.
 */
async function getFallbackModelsAsync(providerId: string): Promise<ModelInfo[]> {
  const modelsDevProviderId = mapToModelsDevProviderId(providerId)

  try {
    // Try to get models from models.dev cache
    const modelsDevData = await fetchModelsDevData()
    const provider = modelsDevData[modelsDevProviderId]

    if (provider && provider.models && Object.keys(provider.models).length > 0) {
      const models = Object.entries(provider.models).map(([modelId, modelData]) => {
        const model: ModelInfo = {
          id: modelId,
          name: modelData.name || formatModelName(modelId),
          context_length: modelData.limit?.context,
        }
        return enhanceModelWithModelsDevData(model, providerId)
      })

      diagnosticsService.logInfo(
        "models-service",
        `Using ${models.length} fallback models from models.dev for ${modelsDevProviderId}`,
        { providerId, modelsDevProviderId, count: models.length }
      )

      return models
    }
  } catch (error) {
    diagnosticsService.logInfo(
      "models-service",
      `Failed to get fallback models from models.dev, using hardcoded fallbacks`,
      { providerId, error: error instanceof Error ? error.message : String(error) }
    )
  }

  // Fall back to hardcoded models
  return HARDCODED_FALLBACK_MODELS[modelsDevProviderId] || []
}

/**
 * Get fallback models synchronously (for backwards compatibility)
 * This uses the synchronous getModelFromModelsDevByProviderId which requires cache to be loaded
 */
function getFallbackModels(providerId: string): ModelInfo[] {
  // Use hardcoded fallbacks for synchronous access
  const modelsDevProviderId = mapToModelsDevProviderId(providerId)
  return HARDCODED_FALLBACK_MODELS[modelsDevProviderId] || []
}

/**
 * Clear the models cache (useful for testing or when credentials change)
 */
export function clearModelsCache(): void {
  modelsCache.clear()
}

/**
 * Fetch models for a specific preset (base URL + API key combination)
 * This is used by the preset manager to show available models when configuring a preset
 */
export async function fetchModelsForPreset(
  baseUrl: string,
  apiKey: string,
): Promise<ModelInfo[]> {
  if (!baseUrl || !apiKey) {
    throw new Error("Base URL and API key are required")
  }

  // Use fetchNemotronModels since we only support Nemotron provider
  try {
    const models = await fetchNemotronModels(baseUrl, apiKey)
    return models
  } catch (error) {
    diagnosticsService.logError(
      "models-service",
      `Failed to fetch models for preset`,
      {
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
      },
    )
    throw error
  }
}
