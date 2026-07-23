import { Chord } from 'chordsheetjs'

export interface ParsedChord {
  /** 0=A convention, matching chordTemplates.ts's HPCP bin order. */
  rootPitchClass: number
  /** One of chordTemplates.ts's quality suffixes ('', 'm', '7', ...), or null if this spelling isn't in that vocabulary. */
  quality: string | null
}

// chordsheetjs's Chord.parse() preserves whatever spelling the user typed
// (e.g. "min7" and "-7" both stay as-is) rather than normalizing it, so
// aliases have to be handled here instead of trusting a single canonical form.
const SUFFIX_ALIASES: Record<string, string> = {
  '': '',
  maj: '',
  m: 'm',
  min: 'm',
  mi: 'm',
  '-': 'm',
  '7': '7',
  dom7: '7',
  maj7: 'maj7',
  Maj7: 'maj7',
  M7: 'maj7',
  ma7: 'maj7',
  'Δ': 'maj7',
  m7: 'm7',
  min7: 'm7',
  mi7: 'm7',
  '-7': 'm7',
  sus2: 'sus2',
  sus4: 'sus4',
  sus: 'sus4',
  dim: 'dim',
  dim7: 'dim',
  o: 'dim',
  '°': 'dim',
  aug: 'aug',
  '+': 'aug',
}

/**
 * Parses an arbitrary user-written ChordPro chord token (any spelling —
 * flats, slash bass, add9, whatever) into a root pitch class plus a quality
 * recognized by chordTemplates.ts, when possible. `quality: null` means the
 * chord parsed fine but its quality (e.g. "add9", "13", "m7b5") isn't one
 * chordTemplates.ts models — callers should fall back to a looser check
 * rather than fail outright.
 */
export function parseChordName(chordText: string): ParsedChord | null {
  const trimmed = chordText.trim()
  if (!trimmed) return null

  let chord
  try {
    chord = Chord.parse(trimmed)
  } catch {
    return null
  }
  if (!chord?.root) return null

  // referenceKeyGrade is 0=C regardless of sharp/flat spelling; shift to 0=A
  // to match the HPCP/chordTemplates.ts convention used everywhere else.
  const grade = chord.root.referenceKeyGrade
  if (grade == null) return null
  const rootPitchClass = (((grade - 9) % 12) + 12) % 12

  const suffix = chord.suffix ?? ''
  const quality = suffix in SUFFIX_ALIASES ? SUFFIX_ALIASES[suffix] : null

  return { rootPitchClass, quality }
}
