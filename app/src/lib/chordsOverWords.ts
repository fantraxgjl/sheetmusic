import { ChordProFormatter, ChordsOverWordsParser } from 'chordsheetjs'

/**
 * Converts the common "chords on their own line above the lyric line" format
 * (what you get pasting from most lyrics/chords sites) into canonical
 * ChordPro text. Throws if chordsheetjs can't make sense of it, so callers
 * can surface a validation error rather than saving garbage.
 */
export function convertChordsOverWordsToChordPro(text: string): string {
  const song = new ChordsOverWordsParser().parse(text)
  return new ChordProFormatter().format(song)
}
