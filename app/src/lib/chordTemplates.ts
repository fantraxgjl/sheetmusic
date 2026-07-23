import { parseChordName } from './chordName'

/**
 * Cosine-similarity chord-template matching over a 12-bin pitch-class
 * (HPCP/chroma) vector — extends essentia's built-in chord detector, which
 * only recognizes major/minor triads, to a small practical vocabulary of
 * qualities. More chord qualities means more ways for a noisy real-world
 * vector to be misclassified (a sus4 and a major triad differ by one scale
 * degree), so this is a real accuracy/coverage tradeoff, not a free upgrade —
 * see PLAN.md for the reasoning.
 *
 * Bin order matches essentia's HPCP default (referenceFrequency=440Hz -> A):
 * A, A#, B, C, C#, D, D#, E, F, F#, G, G#.
 */
const PITCH_CLASSES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']

interface ChordQuality {
  suffix: string
  intervals: number[]
}

const TRIAD_SUFFIXES = new Set(['', 'm'])

const QUALITIES: ChordQuality[] = [
  { suffix: '', intervals: [0, 4, 7] }, // major
  { suffix: 'm', intervals: [0, 3, 7] }, // minor
  { suffix: '7', intervals: [0, 4, 7, 10] }, // dominant 7th
  { suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { suffix: 'm7', intervals: [0, 3, 7, 10] },
  { suffix: 'sus2', intervals: [0, 2, 7] },
  { suffix: 'sus4', intervals: [0, 5, 7] },
  { suffix: 'dim', intervals: [0, 3, 6] },
  { suffix: 'aug', intervals: [0, 4, 8] },
]

interface ChordTemplate {
  name: string
  root: number
  isTriad: boolean
  unitVector: number[]
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return norm > 0 ? vector.map((v) => v / norm) : vector
}

function buildTemplates(): ChordTemplate[] {
  const templates: ChordTemplate[] = []
  for (let root = 0; root < 12; root++) {
    for (const quality of QUALITIES) {
      const vector = new Array(12).fill(0)
      for (const interval of quality.intervals) vector[(root + interval) % 12] = 1
      templates.push({
        name: `${PITCH_CLASSES[root]}${quality.suffix}`,
        root,
        isTriad: TRIAD_SUFFIXES.has(quality.suffix),
        unitVector: normalize(vector),
      })
    }
  }
  return templates
}

const CHORD_TEMPLATES = buildTemplates()

// Vectors quieter than this (after normalization would be meaningless) are
// reported as no-chord rather than an arbitrary best-guess match.
const MIN_ENERGY = 1e-6

// Some chord qualities are literally the same pitch-class set as a different
// chord built on a different root — e.g. Fsus4 {F,Bb,C} and Bbsus2 {Bb,C,F}
// are identical once folded into a chroma vector, and Am7 {A,C,E,G} equals
// C6 {C,E,G,A} the same way. Chroma content alone can never break that tie;
// only the bass note (which chroma folding discards) can. When the top two
// candidates are within this margin, the one whose root matches the
// detected bass note (if any) wins instead of an arbitrary tiebreak.
const BASS_TIE_BREAK_MARGIN = 0.03

// Most real playing is triadic, and extended qualities add templates that
// can accidentally out-score the correct simple triad on an otherwise plain
// chord (a decaying overtone or a blended transition frame is enough) —
// confirmed empirically: adding the 7/sus/etc. vocabulary measurably
// increased spurious extended-chord labels on audio that was actually just
// plain major/minor. An extended-quality match only wins if it beats the
// best triad match by more than this margin; otherwise the simpler reading
// wins, matching the statistical prior that most chords are plain triads.
const EXTENDED_QUALITY_MARGIN = 0.10

export interface ChordMatch {
  chord: string
  score: number
}

/**
 * Matches a 12-bin pitch-class vector against the chord template vocabulary
 * via cosine similarity, biased toward simpler (triad) readings unless an
 * extended quality clearly fits better (EXTENDED_QUALITY_MARGIN).
 * `bassPitchClass`, when available, then breaks near-ties between
 * chroma-identical chords in favor of whichever has that root — see
 * BASS_TIE_BREAK_MARGIN above for why that's necessary at all.
 */
export function matchChordTemplate(pitchClassVector: number[], bassPitchClass?: number | null): ChordMatch {
  const energy = pitchClassVector.reduce((sum, v) => sum + v * v, 0)
  if (energy < MIN_ENERGY) return { chord: 'N', score: 0 }

  const unitVector = normalize(pitchClassVector)
  type Scored = ChordMatch & { root: number; isTriad: boolean }
  let bestOverall: Scored = { chord: 'N', score: -Infinity, root: -1, isTriad: false }
  let bestTriad: Scored = { chord: 'N', score: -Infinity, root: -1, isTriad: true }
  const scored: Scored[] = []
  for (const template of CHORD_TEMPLATES) {
    let score = 0
    for (let i = 0; i < 12; i++) score += unitVector[i] * template.unitVector[i]
    const entry: Scored = { chord: template.name, score, root: template.root, isTriad: template.isTriad }
    scored.push(entry)
    if (score > bestOverall.score) bestOverall = entry
    if (template.isTriad && score > bestTriad.score) bestTriad = entry
  }

  let chosen = bestOverall
  if (!bestOverall.isTriad && bestOverall.score - bestTriad.score < EXTENDED_QUALITY_MARGIN) {
    chosen = bestTriad
  }

  if (bassPitchClass != null) {
    const nearTies = scored.filter((m) => chosen.score - m.score < BASS_TIE_BREAK_MARGIN)
    const bassMatch = nearTies.find((m) => m.root === bassPitchClass)
    if (bassMatch) chosen = bassMatch
  }

  return { chord: chosen.chord, score: chosen.score }
}

/** Component-wise median across a set of same-length vectors — robust to a few transient/outlier frames. */
export function medianVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return new Array(12).fill(0)
  const dims = vectors[0].length
  const result = new Array(dims).fill(0)
  for (let d = 0; d < dims; d++) {
    const values = vectors.map((v) => v[d]).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)
    result[d] = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]
  }
  return result
}

const BASS_MIN_FREQUENCY = 50
const BASS_MAX_FREQUENCY = 400
const BASS_MIN_MAGNITUDE_FRACTION = 0.15

/**
 * Estimates the pitch class of the lowest prominent spectral peak in a
 * frame — a cheap stand-in for "bass note," used only to break the chroma
 * ties described above. Ignores anything above BASS_MAX_FREQUENCY (not
 * trying to find a global lowest peak, just a plausible bass note) and
 * anything too faint relative to the frame's strongest peak (avoids locking
 * onto noise-floor peaks).
 */
export function estimateBassPitchClass(frequencies: ArrayLike<number>, magnitudes: ArrayLike<number>): number | null {
  let maxMag = 0
  for (let i = 0; i < magnitudes.length; i++) maxMag = Math.max(maxMag, magnitudes[i])
  if (maxMag <= 0) return null

  let bestFreq: number | null = null
  for (let i = 0; i < frequencies.length; i++) {
    const freq = frequencies[i]
    const mag = magnitudes[i]
    if (freq < BASS_MIN_FREQUENCY || freq > BASS_MAX_FREQUENCY) continue
    if (mag < maxMag * BASS_MIN_MAGNITUDE_FRACTION) continue
    if (bestFreq === null || freq < bestFreq) bestFreq = freq
  }
  if (bestFreq === null) return null

  const semitonesFromA440 = 12 * Math.log2(bestFreq / 440)
  return ((Math.round(semitonesFromA440) % 12) + 12) % 12
}

// Fallback template for a chord quality outside the recognized vocabulary
// (add9, 6, m7b5, 9/11/13, etc.) — root + fifth is present in nearly every
// chord quality, so it's a reasonable "is roughly the right chord" check
// when we can't score the exact quality.
const ROOT_AND_FIFTH_INTERVALS = [0, 7]

/**
 * Scores how well a live pitch-class vector matches one *specific* named
 * chord (as opposed to matchChordTemplate's open-ended search across the
 * whole vocabulary) — this is the "is the expected chord present right now"
 * check play-along mode needs, a bounded problem against a known target
 * rather than open classification. Accepts arbitrary user-written chord
 * spellings via parseChordName; qualities outside chordTemplates.ts's
 * vocabulary fall back to a root+fifth check rather than failing outright.
 */
export function scoreChordPresence(pitchClassVector: number[], chordText: string): number {
  const parsed = parseChordName(chordText)
  if (!parsed) return 0

  const energy = pitchClassVector.reduce((sum, v) => sum + v * v, 0)
  if (energy < MIN_ENERGY) return 0

  const quality = parsed.quality != null ? QUALITIES.find((q) => q.suffix === parsed.quality) : undefined
  const intervals = quality ? quality.intervals : ROOT_AND_FIFTH_INTERVALS

  const templateVector = new Array(12).fill(0)
  for (const interval of intervals) templateVector[(parsed.rootPitchClass + interval) % 12] = 1
  const templateUnitVector = normalize(templateVector)

  const unitVector = normalize(pitchClassVector)
  let score = 0
  for (let i = 0; i < 12; i++) score += unitVector[i] * templateUnitVector[i]
  return Math.max(0, score)
}

/** Most common value in a list, ignoring nulls — used to pick a segment's bass pitch class from its frames. */
export function modeOf(values: (number | null)[]): number | null {
  const counts = new Map<number, number>()
  for (const v of values) {
    if (v === null) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best: number | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}
