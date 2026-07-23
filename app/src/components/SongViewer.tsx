import { useState } from 'react'
import type { SongRecord } from '../lib/song'
import { ChordSheet } from './ChordSheet'

export function SongViewer({
  song,
  onBack,
  onEdit,
  onDelete,
}: {
  song: SongRecord
  onBack: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [transpose, setTranspose] = useState(0)

  return (
    <div className="song-viewer">
      <div className="song-viewer-header">
        <button onClick={onBack}>&larr; Back</button>
        <div className="song-viewer-actions">
          <button onClick={() => onEdit(song.id)}>Edit</button>
          <button className="danger" onClick={() => onDelete(song.id)}>
            Delete
          </button>
        </div>
      </div>

      <div className="transpose-control">
        <span>Transpose</span>
        <button onClick={() => setTranspose((t) => t - 1)} aria-label="Transpose down a semitone">
          &minus;
        </button>
        <span className="transpose-value">
          {transpose > 0 ? `+${transpose}` : transpose}
        </span>
        <button onClick={() => setTranspose((t) => t + 1)} aria-label="Transpose up a semitone">
          +
        </button>
        {transpose !== 0 && <button onClick={() => setTranspose(0)}>Reset</button>}
      </div>

      <ChordSheet body={song.body} transposeSemitones={transpose} />
    </div>
  )
}
