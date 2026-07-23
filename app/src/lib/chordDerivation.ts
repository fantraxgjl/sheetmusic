import { getEssentia } from './essentiaEngine'
import { matchChordTemplate, medianVector, modeOf } from './chordTemplates'
import { analyzeFrame } from './hpcpAnalysis'

export interface ChordSegment {
  /** e.g. 'C', 'Am', 'F#m' — already valid ChordPro syntax — or 'N' for no chord detected (silence). */
  chord: string
  startTime: number
  endTime: number
  strength: number
}

export const ANALYSIS_SAMPLE_RATE = 44100
// A 4096-sample frame at 44.1kHz gives ~10.8Hz/bin — coarser than the ~10-20Hz
// gaps between bass-register notes, so bass notes were smearing across
// adjacent pitch classes (confirmed empirically: sub-200Hz test chords
// misidentified even from clean, non-decaying sine tones). 8192 halves that
// to ~5.4Hz/bin at the cost of coarser time resolution (~0.19s/frame), an
// easy trade since chords last well over that regardless.
const FRAME_SIZE = 8192
const HOP_SIZE = 4096

const FIXED_WINDOW_SECONDS = 2

/**
 * Derives a chord timeline from a mono Float32 PCM signal sampled at
 * ANALYSIS_SAMPLE_RATE. Pipeline: per-frame HPCP (harmonic pitch-class
 * profile, a more accurate chroma-like feature than a naive FFT-bin mapping)
 * -> beat tracking -> per-beat-segment median HPCP -> custom chord-template
 * matching (see chordTemplates.ts) -> falling back to fixed 2s windows if
 * beat tracking can't find enough beats (e.g. a very short or rhythmically
 * ambiguous recording).
 *
 * essentia's own ChordsDetection/ChordsDetectionBeats only recognize
 * major/minor triads; this derives the chord estimate itself from the raw
 * HPCP vectors instead, against an extended vocabulary (7, maj7, m7, sus2,
 * sus4, dim, aug). More chord qualities means more ways to misread a noisy
 * real-world vector, so expect this to need more correction on
 * extended-harmony songs than a plain major/minor chart would.
 */
export async function deriveChordsFromAudio(signal: Float32Array): Promise<ChordSegment[]> {
  const essentia = await getEssentia()
  const duration = signal.length / ANALYSIS_SAMPLE_RATE

  const frames = essentia.FrameGenerator(signal, FRAME_SIZE, HOP_SIZE)
  const numFrames = frames.size()
  const hpcpFrames: number[][] = []
  const bassClasses: (number | null)[] = []
  const silentFrame: number[] = new Array(12).fill(0)

  for (let i = 0; i < numFrames; i++) {
    // frames.get(i) is essentia's own VectorFloat wrapper, not a plain typed
    // array — convert once so analyzeFrame has one calling convention
    // regardless of whether the samples came from FrameGenerator or a raw
    // buffer (as in the live-listening path).
    const frame = essentia.vectorToArray(frames.get(i)) as Float32Array
    const analysis = analyzeFrame(essentia, frame)
    if (analysis) {
      hpcpFrames.push(analysis.hpcp)
      bassClasses.push(analysis.bassPitchClass)
    } else {
      hpcpFrames.push(silentFrame)
      bassClasses.push(null)
    }
  }

  const beatResult = essentia.BeatTrackerMultiFeature(essentia.arrayToVector(signal))
  const ticks = essentia.vectorToArray(beatResult.ticks) as Float32Array

  let bounds: number[]
  if (ticks.length >= 2) {
    bounds = Array.from(ticks)
    // Extend the outer edges to cover the whole recording rather than just
    // first-beat..last-beat.
    bounds[0] = 0
    bounds[bounds.length - 1] = duration
  } else {
    // No reliable beat grid (e.g. a very short clip) — fall back to fixed windows.
    bounds = []
    for (let t = 0; t < duration; t += FIXED_WINDOW_SECONDS) bounds.push(t)
    bounds.push(duration)
  }

  const segments: ChordSegment[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const startTime = bounds[i]
    const endTime = bounds[i + 1]
    const frameIndices: number[] = []
    for (let frameIdx = 0; frameIdx < hpcpFrames.length; frameIdx++) {
      const frameTime = (frameIdx * HOP_SIZE) / ANALYSIS_SAMPLE_RATE
      if (frameTime >= startTime && frameTime < endTime) frameIndices.push(frameIdx)
    }
    const framesInSegment = frameIndices.length > 0 ? frameIndices.map((idx) => hpcpFrames[idx]) : [silentFrame]
    const bassInSegment = frameIndices.map((idx) => bassClasses[idx])
    const aggregated = medianVector(framesInSegment)
    const match = matchChordTemplate(aggregated, modeOf(bassInSegment))
    segments.push({ chord: match.chord, startTime, endTime, strength: Math.max(0, match.score) })
  }

  return mergeAdjacentSegments(segments)
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
    '# Extended chords (7/sus/etc.) are more error-prone than plain major/minor — double-check against what you played.',
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
