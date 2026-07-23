export interface LyricsSearchResult {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

const LRCLIB_BASE = 'https://lrclib.net/api'

/** Searches LRCLIB's open, personal-use-oriented lyrics database by track/artist. */
export async function searchLyrics(trackName: string, artistName: string): Promise<LyricsSearchResult[]> {
  const params = new URLSearchParams({ track_name: trackName })
  if (artistName) params.set('artist_name', artistName)

  const res = await fetch(`${LRCLIB_BASE}/search?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Lyrics search failed (HTTP ${res.status}).`)
  }
  return res.json()
}

/** Strips leading [mm:ss.xx] timestamps from LRC-format synced lyrics, leaving plain lines. */
export function stripLrcTimestamps(syncedLyrics: string): string {
  return syncedLyrics
    .split('\n')
    .map((line) => line.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, ''))
    .join('\n')
}
