import { ChordProFormatter, ChordProParser } from 'chordsheetjs'

export interface SongRecord {
  id: string
  title: string
  artist: string
  /** Raw ChordPro text — the canonical, portable storage format. */
  body: string
  createdAt: number
  updatedAt: number
}

/**
 * The title/artist form fields are the source of truth (they're always present,
 * even for pasted text with no ChordPro directives), so the {title}/{artist}
 * directives in the body are kept in sync with them on every save — otherwise
 * the rendered chord sheet heading (read from the body) could silently drift
 * from the metadata used for search/listing.
 */
function syncMetadataIntoBody(body: string, title: string, artist: string): string {
  try {
    const song = new ChordProParser().parse(body)
    const withTitle = song.changeMetadata('title', title)
    const withArtist = artist ? withTitle.changeMetadata('artist', artist) : withTitle
    return new ChordProFormatter().format(withArtist)
  } catch {
    // Unparseable body is reported to the user at validation time; save it as-is.
    return body
  }
}

export function createSongRecord(input: {
  title: string
  artist: string
  body: string
}): SongRecord {
  const now = Date.now()
  const title = input.title.trim() || 'Untitled'
  const artist = input.artist.trim()
  return {
    id: crypto.randomUUID(),
    title,
    artist,
    body: syncMetadataIntoBody(input.body, title, artist),
    createdAt: now,
    updatedAt: now,
  }
}

export function updateSongRecord(
  existing: SongRecord,
  input: { title: string; artist: string; body: string }
): SongRecord {
  const title = input.title.trim() || 'Untitled'
  const artist = input.artist.trim()
  return {
    ...existing,
    title,
    artist,
    body: syncMetadataIntoBody(input.body, title, artist),
    updatedAt: Date.now(),
  }
}

/** Throws if the body isn't parseable ChordPro, so callers can surface a validation error. */
export function validateChordPro(body: string): void {
  new ChordProParser().parse(body)
}
