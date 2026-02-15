/**
 * AI SDK Provider Adapter
 * Provides a unified interface for creating language models using Vercel AI SDK
 * Only NVIDIA Nemotron is supported.
 */

import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import { configStore } from "./config"
import { isDebugLLM, logLLM } from "./debug"

// Only Nemotron is supported
export type ProviderType = "nemotron"

interface ProviderConfig {
  apiKey: string
  baseURL?: string
  model: string
}

/**
 * Get provider configuration from app config
 */
function getProviderConfig(
  _providerId: ProviderType,
  modelContext: "mcp" | "transcript" = "mcp"
): ProviderConfig {
  const config = configStore.get()

  // Only Nemotron is supported
  return {
    apiKey: config.nemotronApiKey || "",
    baseURL: config.nemotronBaseUrl || "https://integrate.api.nvidia.com/v1",
    model:
      modelContext === "mcp"
        ? config.mcpToolsNemotronModel || "nvidia/llama-3.1-nemotron-70b-instruct"
        : config.transcriptPostProcessingNemotronModel ||
          "nvidia/llama-3.1-nemotron-70b-instruct",
  }
}

/**
 * Create a language model instance (always Nemotron)
 */
export function createLanguageModel(
  _providerId?: ProviderType,
  modelContext: "mcp" | "transcript" = "mcp"
): LanguageModel {
  const providerConfig = getProviderConfig("nemotron", modelContext)

  if (!providerConfig.apiKey) {
    throw new Error("NVIDIA Nemotron API key is required")
  }

  if (isDebugLLM()) {
    logLLM("Creating Nemotron model:", {
      model: providerConfig.model,
      baseURL: providerConfig.baseURL,
    })
  }

  // Nemotron uses OpenAI-compatible API
  const openai = createOpenAI({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseURL,
  })
  return openai.chat(providerConfig.model)
}

/**
 * Get the current provider ID from config (always nemotron)
 */
export function getCurrentProviderId(): ProviderType {
  return "nemotron"
}

/**
 * Get the transcript post-processing provider ID from config (always nemotron)
 */
export function getTranscriptProviderId(): ProviderType {
  return "nemotron"
}

/**
 * Get the current model name for the provider
 */
export function getCurrentModelName(
  _providerId?: ProviderType,
  modelContext: "mcp" | "transcript" = "mcp"
): string {
  return getProviderConfig("nemotron", modelContext).model
}
