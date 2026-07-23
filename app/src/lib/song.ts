import { ChordProParser } from 'chordsheetjs'

export interface SongRecord {
  id: string
  title: string
  artist: string
  /** Raw ChordPro text — the canonical, portable storage format. */
  body: string
  createdAt: number
  updatedAt: number
}

export function createSongRecord(input: {
  title: string
  artist: string
  body: string
}): SongRecord {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: input.title.trim() || 'Untitled',
    artist: input.artist.trim(),
    body: input.body,
    createdAt: now,
    updatedAt: now,
  }
}

/** Throws if the body isn't parseable ChordPro, so callers can surface a validation error. */
export function validateChordPro(body: string): void {
  new ChordProParser().parse(body)
}
