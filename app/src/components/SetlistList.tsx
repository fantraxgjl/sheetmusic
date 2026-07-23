import type { Setlist } from '../lib/setlist'

export function SetlistList({
  setlists,
  onSelect,
  onCreate,
  onBack,
}: {
  setlists: Setlist[]
  onSelect: (id: string) => void
  onCreate: () => void
  onBack: () => void
}) {
  return (
    <div className="song-list">
      <div className="song-list-header">
        <h1>Setlists</h1>
        <div className="song-list-actions">
          <button onClick={onBack}>&larr; Songs</button>
          <button onClick={onCreate}>+ New setlist</button>
        </div>
      </div>

      {setlists.length === 0 ? (
        <p className="empty-state">
          No setlists yet. Group songs into an ordered setlist for a practice session or gig.
        </p>
      ) : (
        <ul>
          {setlists.map((setlist) => (
            <li key={setlist.id}>
              <button className="song-list-item" onClick={() => onSelect(setlist.id)}>
                <span className="song-title">{setlist.name}</span>
                <span className="song-artist">
                  {setlist.songIds.length} song{setlist.songIds.length === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
