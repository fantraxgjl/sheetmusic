import type { SongRecord } from './song'

export function exportLibraryJson(songs: SongRecord[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), songs }, null, 2)
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

/** Throws with a user-facing message if the JSON isn't a recognizable library export. */
export function parseLibraryImport(jsonText: string): SongRecord[] {
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
  return songs
}
