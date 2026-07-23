import type { ChordSegment } from './chordDerivation'
import type { SyncedLyricLine } from './lyrics'

function chordAt(segments: ChordSegment[], time: number): ChordSegment | undefined {
  return (
    segments.find((s) => time >= s.startTime && time < s.endTime) ??
    // Fall back to the nearest segment for times just past the last boundary
    // (floating-point edges, or a lyric line after the last detected chord).
    segments[segments.length - 1]
  )
}

/**
 * Aligns derived chord segments to synced (timestamped) lyric lines: each
 * line gets prefixed with whichever chord was active at that line's start
 * time. This is a real time-based alignment (not a guess), possible only
 * because LRCLIB's synced lyrics carry per-line timestamps on the same time
 * axis as the recording the chords were derived from.
 */
export function mergeChordsWithSyncedLyrics(segments: ChordSegment[], lines: SyncedLyricLine[]): string {
  if (segments.length === 0) return lines.map((l) => l.text).join('\n')
  return lines
    .map((line) => {
      const chord = chordAt(segments, line.time)
      const prefix = chord ? `[${chord.chord}]` : ''
      return line.text ? `${prefix}${line.text}` : prefix
    })
    .join('\n')
}

/**
 * Fallback for plain (unsynced) lyrics: no timestamps to align to, so chord
 * segments are distributed proportionally across the existing lines by
 * position instead — a rough starting skeleton, not a real alignment.
 */
export function mergeChordsWithPlainLyrics(segments: ChordSegment[], lyricLines: string[]): string {
  const nonEmptyLines = lyricLines.filter((l) => l.trim().length > 0)
  if (segments.length === 0 || nonEmptyLines.length === 0) {
    return lyricLines.join('\n')
  }
  let segmentIndex = 0
  let nonEmptySeen = 0
  return lyricLines
    .map((line) => {
      if (!line.trim()) return line
      const targetIndex = Math.floor((nonEmptySeen / nonEmptyLines.length) * segments.length)
      segmentIndex = Math.min(targetIndex, segments.length - 1)
      nonEmptySeen++
      return `[${segments[segmentIndex].chord}]${line}`
    })
    .join('\n')
}
