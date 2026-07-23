import { useState } from 'react'
import { validateChordPro } from '../lib/song'
import { convertChordsOverWordsToChordPro } from '../lib/chordsOverWords'
import { LyricsSearch } from './LyricsSearch'

const CHORDPRO_PLACEHOLDER = `{title: Song Title}
{artist: Artist Name}

[C]Lyrics go [G]here, chords [Am]above the [F]words`

const QUICK_PASTE_PLACEHOLDER = `  G          C           G
Amazing grace how sweet the sound
        G                D
That saved a wretch like me`

export function AddSongForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { title: string; artist: string; body: string }
  onSave: (input: { title: string; artist: string; body: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [artist, setArtist] = useState(initial?.artist ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [quickPaste, setQuickPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(initial)

  function handleConvert() {
    if (!quickPaste.trim()) {
      setError('Paste a chord chart (chords on their own line above the lyrics) first.')
      return
    }
    if (
      body.trim() &&
      !window.confirm('This will replace the ChordPro text below with the converted chart. Continue?')
    ) {
      return
    }
    try {
      const converted = convertChordsOverWordsToChordPro(quickPaste)
      setBody(converted)
      setError(null)
    } catch (err) {
      setError(`Couldn't convert that chart: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function handleInsertLyrics(lyrics: string) {
    if (
      body.trim() &&
      !window.confirm(
        'This will replace the ChordPro text below with the fetched lyrics (no chords yet — add those after). Continue?'
      )
    ) {
      return
    }
    setBody(lyrics)
    setError(null)
  }

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
      <h1>{isEdit ? 'Edit song' : 'Add a song'}</h1>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" />
      </label>
      <label>
        Artist
        <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist (optional)" />
      </label>

      <LyricsSearch title={title} artist={artist} onInsert={handleInsertLyrics} />

      <details className="quick-paste" open={!isEdit}>
        <summary>Paste a chord chart from a lyrics site (chords above the words)</summary>
        <label>
          Chords-over-lyrics text
          <textarea
            value={quickPaste}
            onChange={(e) => setQuickPaste(e.target.value)}
            placeholder={QUICK_PASTE_PLACEHOLDER}
            rows={8}
          />
        </label>
        <div className="form-actions">
          <button onClick={handleConvert}>Convert to ChordPro &darr;</button>
        </div>
      </details>

      <label>
        ChordPro text
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={CHORDPRO_PLACEHOLDER}
          rows={14}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleSave}>{isEdit ? 'Save changes' : 'Save'}</button>
      </div>
    </div>
  )
}
