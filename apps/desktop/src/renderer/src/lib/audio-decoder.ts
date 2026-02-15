/**
 * Audio Decoder Utility
 *
 * Decodes audio blobs (webm, mp3, wav, etc.) to raw PCM Float32Array samples
 * using the Web Audio API. This is needed because Parakeet STT expects
 * raw Float32Array samples, not encoded audio formats.
 */

/**
 * Decode an audio blob to raw PCM samples at a target sample rate
 * @param blob - Audio blob from MediaRecorder (webm, etc.)
 * @param targetSampleRate - Target sample rate for output (default: 16000 Hz for Parakeet)
 * @returns Float32Array of audio samples normalized to [-1, 1]
 */
export async function decodeAudioBlob(
  blob: Blob,
  targetSampleRate = 16000
): Promise<Float32Array> {
  // Create an offline audio context with the target sample rate
  // We'll use a reasonable duration estimate - the actual decoded length may differ
  const arrayBuffer = await blob.arrayBuffer()

  // Create an AudioContext to decode the audio
  // Note: We create a temporary context for decoding
  const tempContext = new AudioContext({ sampleRate: targetSampleRate })

  try {
    // Decode the audio data
    const audioBuffer = await tempContext.decodeAudioData(arrayBuffer)

    // Get the audio data - if stereo, mix to mono
    const numberOfChannels = audioBuffer.numberOfChannels
    const length = audioBuffer.length
    const outputSamples = new Float32Array(length)

    if (numberOfChannels === 1) {
      // Mono: copy directly
      audioBuffer.copyFromChannel(outputSamples, 0)
    } else {
      // Stereo or more: mix down to mono
      const channels: Float32Array[] = []
      for (let i = 0; i < numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i))
      }

      for (let i = 0; i < length; i++) {
        let sum = 0
        for (let ch = 0; ch < numberOfChannels; ch++) {
          sum += channels[ch][i]
        }
        outputSamples[i] = sum / numberOfChannels
      }
    }

    // If the decoded sample rate differs from target, resample
    // Note: AudioContext created with targetSampleRate should handle this
    // but the decoded audio might have a different rate
    if (audioBuffer.sampleRate !== targetSampleRate) {
      return resample(outputSamples, audioBuffer.sampleRate, targetSampleRate)
    }

    return outputSamples
  } finally {
    // Close the temporary context
    await tempContext.close()
  }
}

/**
 * Simple linear interpolation resampling
 * For better quality, consider using a more sophisticated algorithm
 */
function resample(
  samples: Float32Array,
  fromSampleRate: number,
  toSampleRate: number
): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return samples
  }

  const ratio = fromSampleRate / toSampleRate
  const newLength = Math.round(samples.length / ratio)
  const result = new Float32Array(newLength)

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1)
    const t = srcIndex - srcIndexFloor

    // Linear interpolation
    result[i] = samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t
  }

  return result
}

