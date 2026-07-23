import type { SongRecord } from '../lib/song'
import { ChordSheet } from './ChordSheet'

export function SongViewer({
  song,
  onBack,
  onDelete,
}: {
  song: SongRecord
  onBack: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="song-viewer">
      <div className="song-viewer-header">
        <button onClick={onBack}>&larr; Back</button>
        <button className="danger" onClick={() => onDelete(song.id)}>
          Delete
        </button>
      </div>
      <ChordSheet body={song.body} />
    </div>
  )
}
