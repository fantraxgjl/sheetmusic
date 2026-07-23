import { ChordLyricsPair, ChordProParser } from 'chordsheetjs'

/**
 * Extracts the ordered sequence of chord tokens from a song's ChordPro body
 * (skipping blank/no-chord positions) — this is the "what chord should be
 * happening at position N" reference that both the PlaySheet renderer and
 * the live-listening engine need, so both walk chordsheetjs's parsed
 * line/item structure the same way to stay in sync with each other.
 *
 * `transposeSemitones` must match whatever the viewer is currently showing —
 * otherwise live listening would match against the original chords while
 * you're reading (and playing) a transposed chart.
 */
export function parseChordSequence(body: string, transposeSemitones = 0): string[] {
  let song = new ChordProParser().parse(body)
  if (transposeSemitones) song = song.transpose(transposeSemitones)
  const sequence: string[] = []
  for (const line of song.lines) {
    for (const item of line.items) {
      if (item instanceof ChordLyricsPair && item.chords.trim() !== '') {
        sequence.push(item.chords.trim())
      }
    }
  }
  return sequence
}
