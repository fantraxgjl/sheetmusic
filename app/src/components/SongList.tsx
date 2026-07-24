import { useMemo, useRef, useState } from 'react'
import type { SongRecord } from '../lib/song'
import type { Setlist } from '../lib/setlist'
import { exportLibraryJson, parseLibraryImport, type LibraryImport } from '../lib/backup'

export function SongList({
  songs,
  setlists,
  onSelect,
  onAdd,
  onImportRequested,
  onOpenSetlists,
}: {
  songs: SongRecord[]
  setlists: Setlist[]
  onSelect: (id: string) => void
  onAdd: () => void
  onImportRequested: (imported: LibraryImport) => void
  onOpenSetlists: () => void
}) {
  const [query, setQuery] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter(
      (song) => song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)
    )
  }, [songs, query])

  async function handleExport() {
    const json = exportLibraryJson(songs, setlists)
    const filename = `piano-improv-library-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([json], { type: 'application/json' })

    // Prefer the OS share sheet (AirDrop, Drive, Messages, etc.) when
    // available — a plain download works everywhere but is a clunkier way
    // to get a file onto another device, especially on mobile.
    if (navigator.canShare && navigator.share) {
      const file = new File([blob], filename, { type: 'application/json' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Piano Improv library backup' })
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return // user cancelled the share sheet
          // otherwise fall through to a plain download
        }
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const imported = parseLibraryImport(text)
      setImportError(null)
      onImportRequested(imported)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="song-list">
      <div className="song-list-header">
        <h1>Your songs</h1>
        <div className="song-list-actions">
          <button onClick={onOpenSetlists}>Setlists</button>
          <button onClick={handleExport} disabled={songs.length === 0}>
            Export
          </button>
          <button onClick={() => fileInputRef.current?.click()}>Import</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleFileChosen}
          />
          <button onClick={onAdd}>+ Add song</button>
        </div>
      </div>

      {importError && <p className="form-error">{importError}</p>}

      {songs.length === 0 ? (
        <p className="empty-state">
          No songs yet. Add one by pasting a chord chart (ChordPro format), or import a backup.
        </p>
      ) : (
        <>
          <input
            className="song-search"
            type="search"
            placeholder="Search by title or artist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search songs"
          />
          {filtered.length === 0 ? (
            <p className="empty-state">No songs match "{query}".</p>
          ) : (
            <ul>
              {filtered.map((song) => (
                <li key={song.id}>
                  <button className="song-list-item" onClick={() => onSelect(song.id)}>
                    <span className="song-title">{song.title}</span>
                    {song.artist && <span className="song-artist">{song.artist}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
