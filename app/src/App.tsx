import { useEffect, useState } from 'react'
import { SongList } from './components/SongList'
import { AddSongForm } from './components/AddSongForm'
import { SongViewer } from './components/SongViewer'
import { createSongRecord, updateSongRecord, type SongRecord } from './lib/song'
import { deleteSong, listSongs, saveSong, saveSongs } from './lib/db'
import './App.css'

type View = { name: 'list' } | { name: 'add' } | { name: 'song'; id: string } | { name: 'edit'; id: string }

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

  async function handleCreate(input: { title: string; artist: string; body: string }) {
    const song = createSongRecord(input)
    await saveSong(song)
    setSongs(await listSongs())
    setView({ name: 'song', id: song.id })
  }

  async function handleUpdate(id: string, input: { title: string; artist: string; body: string }) {
    const existing = songs.find((s) => s.id === id)
    if (!existing) return
    const updated = updateSongRecord(existing, input)
    await saveSong(updated)
    setSongs(await listSongs())
    setView({ name: 'song', id })
  }

  async function handleDelete(id: string) {
    await deleteSong(id)
    setSongs(await listSongs())
    setView({ name: 'list' })
  }

  async function handleImportRequested(imported: SongRecord[]) {
    await saveSongs(imported)
    setSongs(await listSongs())
  }

  if (!loaded) {
    return <div className="app-shell loading">Loading your library&hellip;</div>
  }

  return (
    <div className="app-shell">
      {view.name === 'list' && (
        <SongList
          songs={songs}
          onSelect={(id) => setView({ name: 'song', id })}
          onAdd={() => setView({ name: 'add' })}
          onImportRequested={handleImportRequested}
        />
      )}
      {view.name === 'add' && <AddSongForm onSave={handleCreate} onCancel={() => setView({ name: 'list' })} />}
      {view.name === 'song' &&
        (() => {
          const song = songs.find((s) => s.id === view.id)
          if (!song) return null
          return (
            <SongViewer
              song={song}
              onBack={() => setView({ name: 'list' })}
              onEdit={(id) => setView({ name: 'edit', id })}
              onDelete={handleDelete}
            />
          )
        })()}
      {view.name === 'edit' &&
        (() => {
          const song = songs.find((s) => s.id === view.id)
          if (!song) return null
          return (
            <AddSongForm
              initial={{ title: song.title, artist: song.artist, body: song.body }}
              onSave={(input) => handleUpdate(song.id, input)}
              onCancel={() => setView({ name: 'song', id: song.id })}
            />
          )
        })()}
    </div>
  )
}

export default App
