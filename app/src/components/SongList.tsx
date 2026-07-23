import type { SongRecord } from '../lib/song'

export function SongList({
  songs,
  onSelect,
  onAdd,
}: {
  songs: SongRecord[]
  onSelect: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="song-list">
      <div className="song-list-header">
        <h1>Your songs</h1>
        <button onClick={onAdd}>+ Add song</button>
      </div>

      {songs.length === 0 ? (
        <p className="empty-state">
          No songs yet. Add one by pasting a chord chart (ChordPro format) to get started.
        </p>
      ) : (
        <ul>
          {songs.map((song) => (
            <li key={song.id}>
              <button className="song-list-item" onClick={() => onSelect(song.id)}>
                <span className="song-title">{song.title}</span>
                {song.artist && <span className="song-artist">{song.artist}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
