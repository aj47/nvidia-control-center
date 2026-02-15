/**
 * LLM-driven TTS text preprocessing
 * Uses an LLM to intelligently convert text to speech-friendly format
 * for more natural and context-aware speech output.
 *
 * NOTE: TTS is disabled after refactoring to only support Nemotron + Parakeet.
 * These functions are kept for potential future use.
 */

import { makeTextCompletionWithFetch } from "./llm-fetch"
import { configStore } from "./config"
import { diagnosticsService } from "./diagnostics"
import { preprocessTextForTTS as regexPreprocessTextForTTS } from "@nvidia-cc/shared"

/**
 * Builds a TTS preprocessing prompt with default settings.
 */
function buildTTSPreprocessingPrompt(): string {
  const instructions: string[] = [
    "- Remove code blocks and replace with brief description if relevant",
    "- Remove URLs but mention if a link was shared",
    "- Convert markdown formatting to natural speech",
    "- Expand abbreviations and acronyms appropriately (e.g., \"Dr.\" → \"Doctor\", \"API\" → \"A P I\")",
    "- Convert technical symbols to spoken words (e.g., \"&&\" → \"and\", \"=>\" → \"arrow\")",
    "- Remove or describe any content that wouldn't make sense when spoken aloud",
    "- Keep the core meaning but optimize for listening",
    "- Do NOT add any commentary, just output the converted text",
  ]

  return `Convert this AI response to natural spoken text.
${instructions.join("\n")}

Only output the converted text, nothing else.

Text to convert:
`
}

/**
 * Preprocesses text for TTS using an LLM for more natural speech output.
 * Falls back to regex-based preprocessing if LLM call fails.
 *
 * @param text The raw text to preprocess for TTS
 * @param providerId Optional provider ID for the LLM call
 * @returns Preprocessed text suitable for TTS
 */
export async function preprocessTextForTTSWithLLM(
  text: string,
  providerId?: string
): Promise<string> {
  const config = configStore.get()

  // Use Nemotron for LLM preprocessing (the only available provider)
  const llmProviderId = providerId || config.transcriptPostProcessingProviderId || "nemotron"

  try {
    // Build the prompt with default settings, then append the text
    const prompt = buildTTSPreprocessingPrompt() + text

    // Make the LLM call
    const result = await makeTextCompletionWithFetch(prompt, llmProviderId)

    // If we got a result, return it
    if (result && result.trim().length > 0) {
      diagnosticsService.logInfo("tts-llm-preprocessing", "LLM preprocessing succeeded", {
        inputLength: text.length,
        outputLength: result.length,
        provider: llmProviderId
      })
      return result.trim()
    }

    // If empty result, fall back to regex
    throw new Error("LLM returned empty result")
  } catch (error) {
    // Log the error and fall back to regex-based preprocessing
    diagnosticsService.logWarning(
      "tts-llm-preprocessing",
      "LLM preprocessing failed, falling back to regex",
      error
    )

    // Fall back to regex-based preprocessing with default options
    const preprocessingOptions = {
      removeCodeBlocks: true,
      removeUrls: true,
      convertMarkdown: true,
    }
    return regexPreprocessTextForTTS(text, preprocessingOptions)
  }
}

/**
 * Checks if LLM-based TTS preprocessing is available.
 * Returns true if Nemotron API key is configured.
 * NOTE: TTS is currently disabled, this always returns false.
 */
export function isLLMPreprocessingAvailable(): boolean {
  // TTS is disabled - no providers available after refactor
  return false
}

