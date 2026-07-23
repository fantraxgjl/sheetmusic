import { useState } from 'react'
import { validateChordPro } from '../lib/song'

const PLACEHOLDER = `{title: Song Title}
{artist: Artist Name}

[C]Lyrics go [G]here, chords [Am]above the [F]words`

export function AddSongForm({
  onSave,
  onCancel,
}: {
  onSave: (input: { title: string; artist: string; body: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!body.trim()) {
      setError('Paste some ChordPro text first.')
      return
    }
    try {
      validateChordPro(body)
    } catch (err) {
      setError(`That doesn't look like valid ChordPro: ${err instanceof Error ? err.message : String(err)}`)
      return
    }
    setError(null)
    onSave({ title, artist, body })
  }

  return (
    <div className="add-song-form">
      <h1>Add a song</h1>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" />
      </label>
      <label>
        Artist
        <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist (optional)" />
      </label>
      <label>
        ChordPro text
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleSave}>Save</button>
      </div>
    </div>
  )
}
