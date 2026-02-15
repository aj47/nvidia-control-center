import { ModelPreset } from "./types"

// STT Providers - Only Parakeet (local) is supported
export const STT_PROVIDERS = [
  {
    label: "Parakeet (Local)",
    value: "parakeet",
  },
] as const

export type STT_PROVIDER_ID = (typeof STT_PROVIDERS)[number]["value"]

// Chat/LLM Providers - Only Nemotron is supported
export const CHAT_PROVIDERS = [
  {
    label: "Nemotron",
    value: "nemotron",
  },
] as const

export type CHAT_PROVIDER_ID = (typeof CHAT_PROVIDERS)[number]["value"]

// TTS is not supported (removed OpenAI, Groq, Gemini, Kitten)
export const TTS_PROVIDERS = [] as const

export type TTS_PROVIDER_ID = never

// Helper to check if a provider has TTS support (always false now)
export const providerHasTts = (_providerId: string): boolean => {
  return false
}

// Helper to get TTS models for a provider (empty now)
export const getTtsModelsForProvider = (_providerId: string) => {
  return []
}

// Helper to get TTS voices for a provider (empty now)
export const getTtsVoicesForProvider = (_providerId: string, _ttsModel?: string) => {
  return []
}

// NVIDIA Nemotron Preset (replaces OpenAI Compatible Presets)
export const NEMOTRON_PRESET = {
  label: "Nemotron",
  value: "nemotron",
  description: "NVIDIA Nemotron models via NVIDIA API",
  baseUrl: "https://integrate.api.nvidia.com/v1",
} as const

// Helper to get built-in presets as ModelPreset objects (only Nemotron)
export const getBuiltInModelPresets = (): ModelPreset[] => {
  return [{
    id: "builtin-nemotron",
    name: NEMOTRON_PRESET.label,
    baseUrl: NEMOTRON_PRESET.baseUrl,
    apiKey: "", // API key should be filled by user
    isBuiltIn: true,
  }]
}

// Default preset ID
export const DEFAULT_MODEL_PRESET_ID = "builtin-nemotron"

/**
 * Get the current preset display name from config.
 * Looks up the preset by ID and returns its name.
 */
export const getCurrentPresetName = (
  currentModelPresetId: string | undefined,
  modelPresets: ModelPreset[] | undefined
): string => {
  const presetId = currentModelPresetId || DEFAULT_MODEL_PRESET_ID
  const allPresets = [...getBuiltInModelPresets(), ...(modelPresets || [])]
  return allPresets.find(p => p.id === presetId)?.name || "Nemotron"
}
