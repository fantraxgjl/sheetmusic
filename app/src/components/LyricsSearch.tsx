import { useState } from 'react'
import { parseLrcLines, searchLyrics, stripLrcTimestamps, type LyricsSearchResult, type SyncedLyricLine } from '../lib/lyrics'

export function LyricsSearch({
  title,
  artist,
  onInsert,
}: {
  title: string
  artist: string
  onInsert: (lyrics: string, syncedLines?: SyncedLyricLine[]) => void
}) {
  const [results, setResults] = useState<LyricsSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!title.trim()) {
      setError('Enter a song title above first.')
      return
    }
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const found = await searchLyrics(title.trim(), artist.trim())
      setResults(found)
    } catch (err) {
      setError(
        `Couldn't reach the lyrics service: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setLoading(false)
    }
  }

  function handleInsert(result: LyricsSearchResult) {
    if (result.plainLyrics) {
      onInsert(result.plainLyrics)
      return
    }
    if (result.syncedLyrics) {
      onInsert(stripLrcTimestamps(result.syncedLyrics), parseLrcLines(result.syncedLyrics))
    }
  }

  return (
    <details className="quick-paste">
      <summary>Find lyrics online (LRCLIB)</summary>
      <div className="lyrics-search-actions">
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching…' : 'Search lyrics'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {results && results.length === 0 && <p className="empty-state">No matches found.</p>}
      {results && results.length > 0 && (
        <ul className="lyrics-results">
          {results.slice(0, 8).map((r) => {
            const hasLyrics = Boolean(r.plainLyrics || r.syncedLyrics)
            return (
              <li key={r.id}>
                <span>
                  {r.trackName} &mdash; {r.artistName}
                  {r.albumName ? ` (${r.albumName})` : ''}
                  {r.instrumental ? ' [instrumental]' : !hasLyrics ? ' [no lyrics available]' : ''}
                </span>
                <button onClick={() => handleInsert(r)} disabled={!hasLyrics}>
                  Insert lyrics
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </details>
  )
}
