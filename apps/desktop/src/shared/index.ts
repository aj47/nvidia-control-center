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

// TTS Providers - Local only (Kitten and Supertonic)
export const TTS_PROVIDERS = [
  {
    label: "Kitten (Local)",
    value: "kitten",
  },
  {
    label: "Supertonic (Local)",
    value: "supertonic",
  },
] as const

export type TTS_PROVIDER_ID = (typeof TTS_PROVIDERS)[number]["value"]

// Kitten TTS Voice Options (8 voices, sid 0-7)
// Based on official docs: https://k2-fsa.github.io/sherpa/onnx/tts/all/English/kitten-nano-en-v0_1.html
// Even IDs (0,2,4,6) are male (-m), odd IDs (1,3,5,7) are female (-f)
export const KITTEN_TTS_VOICES = [
  { label: "Voice 2 - Male (Default)", value: 0 },
  { label: "Voice 2 - Female", value: 1 },
  { label: "Voice 3 - Male", value: 2 },
  { label: "Voice 3 - Female", value: 3 },
  { label: "Voice 4 - Male", value: 4 },
  { label: "Voice 4 - Female", value: 5 },
  { label: "Voice 5 - Male", value: 6 },
  { label: "Voice 5 - Female", value: 7 },
] as const

// Supertonic TTS Voice Options (10 voices: 5 male + 5 female)
export const SUPERTONIC_TTS_VOICES = [
  { label: "Male 1 (M1)", value: "M1" },
  { label: "Male 2 (M2)", value: "M2" },
  { label: "Male 3 (M3)", value: "M3" },
  { label: "Male 4 (M4)", value: "M4" },
  { label: "Male 5 (M5)", value: "M5" },
  { label: "Female 1 (F1)", value: "F1" },
  { label: "Female 2 (F2)", value: "F2" },
  { label: "Female 3 (F3)", value: "F3" },
  { label: "Female 4 (F4)", value: "F4" },
  { label: "Female 5 (F5)", value: "F5" },
] as const

// Supertonic TTS Language Options
export const SUPERTONIC_TTS_LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Korean", value: "ko" },
  { label: "Spanish", value: "es" },
  { label: "Portuguese", value: "pt" },
  { label: "French", value: "fr" },
] as const

// Helper to check if a provider has TTS support
export const providerHasTts = (providerId: string): boolean => {
  return TTS_PROVIDERS.some(p => p.value === providerId)
}

// Helper to get TTS models for a provider
export const getTtsModelsForProvider = (_providerId: string) => {
  // Local TTS providers don't have model selection
  return []
}

// Helper to get TTS voices for a provider
export const getTtsVoicesForProvider = (providerId: string, _ttsModel?: string) => {
  switch (providerId) {
    case 'supertonic':
      return SUPERTONIC_TTS_VOICES
    default:
      return []
  }
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
