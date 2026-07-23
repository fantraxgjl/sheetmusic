import { estimateBassPitchClass } from './chordTemplates'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EssentiaInstance = any

// Peak amplitude (on a [-1, 1] signal) below which a block of samples is
// treated as silence rather than analyzed — near-silent audio both wastes
// time and can trip a native assertion inside essentia's WASM binding
// (observed empirically: a fully-silent block can throw there).
const SILENCE_PEAK_THRESHOLD = 0.005

export interface FrameAnalysis {
  hpcp: number[]
  bassPitchClass: number | null
}

function peakAmplitude(samples: Float32Array): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  return peak
}

/**
 * Runs essentia's Windowing -> Spectrum -> SpectralPeaks -> HPCP pipeline on
 * one block of samples (any length — a fixed offline-analysis frame, or a
 * live rolling snapshot). The single canonical implementation for both
 * chordDerivation.ts (phase 4) and the live-listening engine (phase 5), so
 * a fix in one path can't silently drift from the other.
 */
export function analyzeFrame(essentia: EssentiaInstance, samples: Float32Array): FrameAnalysis | null {
  if (peakAmplitude(samples) < SILENCE_PEAK_THRESHOLD) return null

  try {
    // Windowing/Spectrum expect essentia's own vector wrapper, not a plain
    // Float32Array, even though FrameGenerator elsewhere hands out that
    // wrapper directly — a raw array has to be converted explicitly first.
    const vector = essentia.arrayToVector(samples)
    const windowed = essentia.Windowing(vector, true, samples.length, 'hann').frame
    const spectrum = essentia.Spectrum(windowed, samples.length).spectrum
    const peaks = essentia.SpectralPeaks(spectrum)
    const hpcp = essentia.HPCP(peaks.frequencies, peaks.magnitudes)
    return {
      hpcp: Array.from(essentia.vectorToArray(hpcp.hpcp) as Float32Array),
      bassPitchClass: estimateBassPitchClass(
        essentia.vectorToArray(peaks.frequencies) as Float32Array,
        essentia.vectorToArray(peaks.magnitudes) as Float32Array
      ),
    }
  } catch {
    return null
  }
}
