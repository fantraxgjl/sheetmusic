import { useEffect, useState } from 'react'
import { SongList } from './components/SongList'
import { AddSongForm } from './components/AddSongForm'
import { SongViewer } from './components/SongViewer'
import { createSongRecord, type SongRecord } from './lib/song'
import { deleteSong, listSongs, saveSong } from './lib/db'
import './App.css'

type View = { name: 'list' } | { name: 'add' } | { name: 'song'; id: string }

function App() {
  const [songs, setSongs] = useState<SongRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })

  useEffect(() => {
    listSongs().then((loadedSongs) => {
      setSongs(loadedSongs)
      setLoaded(true)
    })
  }, [])

  async function handleSave(input: { title: string; artist: string; body: string }) {
    const song = createSongRecord(input)
    await saveSong(song)
    setSongs(await listSongs())
    setView({ name: 'song', id: song.id })
  }

  async function handleDelete(id: string) {
    await deleteSong(id)
    setSongs(await listSongs())
    setView({ name: 'list' })
  }

  if (!loaded) {
    return <div className="app-shell loading">Loading your library&hellip;</div>
  }

  return (
    <div className="app-shell">
      {view.name === 'list' && (
        <SongList songs={songs} onSelect={(id) => setView({ name: 'song', id })} onAdd={() => setView({ name: 'add' })} />
      )}
      {view.name === 'add' && <AddSongForm onSave={handleSave} onCancel={() => setView({ name: 'list' })} />}
      {view.name === 'song' &&
        (() => {
          const song = songs.find((s) => s.id === view.id)
          if (!song) return null
          return <SongViewer song={song} onBack={() => setView({ name: 'list' })} onDelete={handleDelete} />
        })()}
    </div>
  )
}

export default App
