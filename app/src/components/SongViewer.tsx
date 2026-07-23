import { useState } from 'react'
import type { SongRecord } from '../lib/song'
import { ChordSheet } from './ChordSheet'

export interface SetlistNav {
  position: string
  onPrev?: () => void
  onNext?: () => void
}

export function SongViewer({
  song,
  onBack,
  onEdit,
  onDelete,
  onPlay,
  setlistNav,
}: {
  song: SongRecord
  onBack: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onPlay: (id: string, transposeSemitones: number) => void
  setlistNav?: SetlistNav
}) {
  const [transpose, setTranspose] = useState(0)

  return (
    <div className="song-viewer">
      <div className="song-viewer-header">
        <button onClick={onBack}>&larr; Back</button>
        <div className="song-viewer-actions">
          <button onClick={() => onPlay(song.id, transpose)}>Play</button>
          <button onClick={() => onEdit(song.id)}>Edit</button>
          <button className="danger" onClick={() => onDelete(song.id)}>
            Delete
          </button>
        </div>
      </div>

      {setlistNav && (
        <div className="setlist-nav">
          <button onClick={setlistNav.onPrev} disabled={!setlistNav.onPrev}>
            &larr; Prev song
          </button>
          <span className="play-mode-position">{setlistNav.position}</span>
          <button onClick={setlistNav.onNext} disabled={!setlistNav.onNext}>
            Next song &rarr;
          </button>
        </div>
      )}

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
