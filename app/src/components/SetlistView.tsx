import type { Setlist } from '../lib/setlist'
import type { SongRecord } from '../lib/song'

export function SetlistView({
  setlist,
  allSongs,
  onSelectSong,
  onEdit,
  onDelete,
  onBack,
}: {
  setlist: Setlist
  allSongs: SongRecord[]
  onSelectSong: (index: number) => void
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const songById = new Map(allSongs.map((s) => [s.id, s]))

  return (
    <div className="song-list">
      <div className="song-list-header">
        <h1>{setlist.name}</h1>
        <div className="song-list-actions">
          <button onClick={onBack}>&larr; Setlists</button>
          <button onClick={onEdit}>Edit</button>
          <button className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {setlist.songIds.length === 0 ? (
        <p className="empty-state">This setlist is empty — edit it to add songs.</p>
      ) : (
        <ul>
          {setlist.songIds.map((id, index) => {
            const song = songById.get(id)
            if (!song) return null
            return (
              <li key={id}>
                <button className="song-list-item" onClick={() => onSelectSong(index)}>
                  <span className="song-title">
                    {index + 1}. {song.title}
                  </span>
                  {song.artist && <span className="song-artist">{song.artist}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
