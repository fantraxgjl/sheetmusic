import { useState } from 'react'
import type { SongRecord } from '../lib/song'

export function SetlistEditor({
  allSongs,
  initial,
  onSave,
  onCancel,
}: {
  allSongs: SongRecord[]
  initial?: { name: string; songIds: string[] }
  onSave: (input: { name: string; songIds: string[] }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [songIds, setSongIds] = useState<string[]>(initial?.songIds ?? [])
  const isEdit = Boolean(initial)

  const songById = new Map(allSongs.map((s) => [s.id, s]))
  const availableSongs = allSongs.filter((s) => !songIds.includes(s.id))

  function moveUp(index: number) {
    if (index === 0) return
    setSongIds((ids) => {
      const next = [...ids]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setSongIds((ids) => {
      if (index === ids.length - 1) return ids
      const next = [...ids]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function removeSong(id: string) {
    setSongIds((ids) => ids.filter((existingId) => existingId !== id))
  }

  function addSong(id: string) {
    setSongIds((ids) => [...ids, id])
  }

  return (
    <div className="add-song-form">
      <h1>{isEdit ? 'Edit setlist' : 'New setlist'}</h1>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday session" />
      </label>

      <div>
        <p className="setlist-section-label">Songs in this setlist ({songIds.length})</p>
        {songIds.length === 0 ? (
          <p className="empty-state">No songs added yet — pick some below.</p>
        ) : (
          <ul className="setlist-song-list">
            {songIds.map((id, index) => {
              const song = songById.get(id)
              if (!song) return null
              return (
                <li key={id}>
                  <span className="song-title">{song.title}</span>
                  <div className="setlist-song-actions">
                    <button onClick={() => moveUp(index)} disabled={index === 0} aria-label="Move up">
                      &uarr;
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === songIds.length - 1}
                      aria-label="Move down"
                    >
                      &darr;
                    </button>
                    <button onClick={() => removeSong(id)}>Remove</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {availableSongs.length > 0 && (
        <div>
          <p className="setlist-section-label">Add a song</p>
          <ul className="setlist-song-list">
            {availableSongs.map((song) => (
              <li key={song.id}>
                <span className="song-title">{song.title}</span>
                <button onClick={() => addSong(song.id)}>Add</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onSave({ name, songIds })}>{isEdit ? 'Save changes' : 'Create setlist'}</button>
      </div>
    </div>
  )
}
