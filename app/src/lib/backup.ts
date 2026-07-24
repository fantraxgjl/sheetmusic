import type { SongRecord } from './song'
import type { Setlist } from './setlist'

export interface LibraryImport {
  songs: SongRecord[]
  setlists: Setlist[]
}

export function exportLibraryJson(songs: SongRecord[], setlists: Setlist[]): string {
  return JSON.stringify({ version: 2, exportedAt: Date.now(), songs, setlists }, null, 2)
}

function isSongRecord(value: unknown): value is SongRecord {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.title === 'string' &&
    typeof s.artist === 'string' &&
    typeof s.body === 'string' &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number'
  )
}

function isSetlist(value: unknown): value is Setlist {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    Array.isArray(s.songIds) &&
    s.songIds.every((id) => typeof id === 'string') &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number'
  )
}

/**
 * Throws with a user-facing message if the JSON isn't a recognizable library
 * export. Accepts older export formats too: a bare array of songs, or
 * {songs: [...]} with no "setlists" field (from before setlists existed) —
 * both just come back with an empty setlists list.
 */
export function parseLibraryImport(jsonText: string): LibraryImport {
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const songs = Array.isArray(data) ? data : (data as { songs?: unknown } | null)?.songs
  if (!Array.isArray(songs)) {
    throw new Error('Expected a library export containing a "songs" list.')
  }
  if (!songs.every(isSongRecord)) {
    throw new Error('One or more songs in the file are missing required fields.')
  }

  const setlists = Array.isArray(data) ? [] : ((data as { setlists?: unknown } | null)?.setlists ?? [])
  if (!Array.isArray(setlists)) {
    throw new Error('Expected "setlists" in the file to be a list.')
  }
  if (!setlists.every(isSetlist)) {
    throw new Error('One or more setlists in the file are missing required fields.')
  }

  return { songs, setlists }
}
