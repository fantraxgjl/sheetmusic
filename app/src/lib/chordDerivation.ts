import { getEssentia } from './essentiaEngine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EssentiaInstance = any

export interface ChordSegment {
  /** e.g. 'C', 'Am', 'F#m' — already valid ChordPro syntax — or 'N' for no chord detected (silence). */
  chord: string
  startTime: number
  endTime: number
  strength: number
}

export const ANALYSIS_SAMPLE_RATE = 44100
const FRAME_SIZE = 4096
const HOP_SIZE = 2048
// Frames quieter than this (peak amplitude on a [-1, 1] signal) are treated as
// silence rather than run through spectral analysis — near-silent frames both
// waste time and occasionally trip a native assertion inside essentia's WASM
// binding (observed empirically: a fully-silent frame can throw there).
const SILENCE_PEAK_THRESHOLD = 0.005

// frames.get(i) below returns essentia's own VectorFloat wrapper (size()/get()),
// not a plain typed array, hence vectorToArray() to get something indexable.
function frameIsSilent(essentia: EssentiaInstance, frame: unknown): boolean {
  const samples = essentia.vectorToArray(frame) as Float32Array
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  return peak < SILENCE_PEAK_THRESHOLD
}

/**
 * Derives a chord timeline from a mono Float32 PCM signal sampled at
 * ANALYSIS_SAMPLE_RATE. Pipeline: per-frame HPCP (harmonic pitch-class
 * profile, a more accurate chroma-like feature than a naive FFT-bin mapping)
 * -> beat tracking -> beat-synchronous chord estimation, falling back to
 * fixed-window estimation if beat tracking can't find enough beats (e.g. a
 * very short or rhythmically ambiguous recording).
 *
 * Only major/minor triads come out of essentia's chord detector — no 7ths,
 * sus chords, etc. Those will be approximated as their nearest major/minor
 * triad. That's a real accuracy ceiling of this algorithm, not a bug; the
 * correction step downstream exists because of exactly this kind of gap.
 */
export async function deriveChordsFromAudio(signal: Float32Array): Promise<ChordSegment[]> {
  const essentia = await getEssentia()
  const duration = signal.length / ANALYSIS_SAMPLE_RATE

  const frames = essentia.FrameGenerator(signal, FRAME_SIZE, HOP_SIZE)
  const numFrames = frames.size()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hpcpFrames: any[] = []
  const silentFrame: number[] = new Array(12).fill(0)

  for (let i = 0; i < numFrames; i++) {
    const frame = frames.get(i)
    if (frameIsSilent(essentia, frame)) {
      hpcpFrames.push(essentia.arrayToVector(new Float32Array(silentFrame)))
      continue
    }
    try {
      const windowed = essentia.Windowing(frame, true, FRAME_SIZE, 'hann').frame
      const spec = essentia.Spectrum(windowed, FRAME_SIZE).spectrum
      const peaks = essentia.SpectralPeaks(spec)
      const hpcp = essentia.HPCP(peaks.frequencies, peaks.magnitudes)
      hpcpFrames.push(hpcp.hpcp)
    } catch {
      // A single bad frame shouldn't take down the whole analysis.
      hpcpFrames.push(essentia.arrayToVector(new Float32Array(silentFrame)))
    }
  }

  const pcpSeq = new essentia.module.VectorVectorFloat()
  for (const row of hpcpFrames) pcpSeq.push_back(row)

  let chordNames: string[]
  let strengths: Float32Array
  let bounds: number[]

  const beatResult = essentia.BeatTrackerMultiFeature(essentia.arrayToVector(signal))
  const ticks = essentia.vectorToArray(beatResult.ticks) as Float32Array

  if (ticks.length >= 2) {
    const beatsResult = essentia.ChordsDetectionBeats(
      pcpSeq,
      beatResult.ticks,
      'interbeat_median',
      HOP_SIZE,
      ANALYSIS_SAMPLE_RATE
    )
    chordNames = []
    for (let i = 0; i < beatsResult.chords.size(); i++) chordNames.push(beatsResult.chords.get(i))
    strengths = essentia.vectorToArray(beatsResult.strength)
    bounds = Array.from(ticks)
    // Extend the outer edges to cover the whole recording rather than just
    // first-beat..last-beat.
    bounds[0] = 0
    bounds[bounds.length - 1] = duration
  } else {
    // No reliable beat grid (e.g. a very short clip) — fall back to a fixed
    // 2s sliding window, chordsheetjs's own default granularity.
    const chordsResult = essentia.ChordsDetection(pcpSeq, HOP_SIZE, ANALYSIS_SAMPLE_RATE, 2)
    chordNames = []
    for (let i = 0; i < chordsResult.chords.size(); i++) chordNames.push(chordsResult.chords.get(i))
    strengths = essentia.vectorToArray(chordsResult.strength)
    bounds = chordNames.map((_, i) => (i * HOP_SIZE) / ANALYSIS_SAMPLE_RATE)
    bounds.push(duration)
  }

  return mergeAdjacentSegments(
    chordNames.map((chord, i) => ({
      chord,
      startTime: bounds[i],
      endTime: bounds[i + 1],
      strength: strengths[i] ?? 0,
    }))
  )
}

function formatTimestamp(seconds: number): string {
  const mm = Math.floor(seconds / 60)
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${mm}:${ss}`
}

const CHORDS_PER_LINE = 4
const TIMESTAMP_EVERY_N_LINES = 2

/**
 * Renders derived chord segments as a chord-only ChordPro skeleton (no
 * lyrics — this is the plain "what chords did I just play" output; merging
 * with fetched lyrics, when available, is a separate step). Periodic
 * timestamp comments make it easier to cross-check a segment against the
 * recording while correcting it.
 */
export function chordSegmentsToChordPro(segments: ChordSegment[]): string {
  const lines: string[] = [
    '# Chords derived from your recording — timestamps are approximate.',
    '# Major/minor triads only (no 7ths/sus/etc.) — double-check against what you played.',
    '',
  ]
  for (let i = 0; i < segments.length; i += CHORDS_PER_LINE) {
    if (i % (CHORDS_PER_LINE * TIMESTAMP_EVERY_N_LINES) === 0) {
      lines.push(`# ${formatTimestamp(segments[i].startTime)}`)
    }
    const group = segments.slice(i, i + CHORDS_PER_LINE)
    lines.push(group.map((s) => `[${s.chord}]`).join('  '))
  }
  return lines.join('\n')
}

/** Collapses consecutive identical chord labels into a single longer segment. */
function mergeAdjacentSegments(segments: ChordSegment[]): ChordSegment[] {
  const merged: ChordSegment[] = []
  for (const seg of segments) {
    const last = merged[merged.length - 1]
    if (last && last.chord === seg.chord) {
      last.endTime = seg.endTime
      last.strength = Math.max(last.strength, seg.strength)
    } else {
      merged.push({ ...seg })
    }
  }
  return merged
}
