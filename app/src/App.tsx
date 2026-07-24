import { useEffect, useState } from 'react'
import { SongList } from './components/SongList'
import { AddSongForm } from './components/AddSongForm'
import { SongViewer, type SetlistNav } from './components/SongViewer'
import { PlayMode } from './components/PlayMode'
import { SetlistList } from './components/SetlistList'
import { SetlistEditor } from './components/SetlistEditor'
import { SetlistView } from './components/SetlistView'
import { createSongRecord, updateSongRecord, type SongRecord } from './lib/song'
import { createSetlist, updateSetlist, type Setlist } from './lib/setlist'
import {
  deleteSetlist,
  deleteSong,
  listSetlists,
  listSongs,
  saveSetlist,
  saveSetlists,
  saveSong,
  saveSongs,
} from './lib/db'
import type { LibraryImport } from './lib/backup'
import { useOnlineStatus } from './lib/useOnlineStatus'
import './App.css'

interface SetlistContext {
  setlistId: string
  index: number
}

type View =
  | { name: 'list' }
  | { name: 'add' }
  | { name: 'song'; id: string; setlistCtx?: SetlistContext }
  | { name: 'edit'; id: string }
  | { name: 'play'; id: string; transposeSemitones: number; setlistCtx?: SetlistContext }
  | { name: 'setlists' }
  | { name: 'setlist'; id: string }
  | { name: 'setlist-edit'; id?: string }

function App() {
  const [songs, setSongs] = useState<SongRecord[]>([])
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })
  const online = useOnlineStatus()

  useEffect(() => {
    Promise.all([listSongs(), listSetlists()]).then(([loadedSongs, loadedSetlists]) => {
      setSongs(loadedSongs)
      setSetlists(loadedSetlists)
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

  async function handleImportRequested(imported: LibraryImport) {
    await saveSongs(imported.songs)
    await saveSetlists(imported.setlists)
    setSongs(await listSongs())
    setSetlists(await listSetlists())
  }

  async function handleCreateSetlist(input: { name: string; songIds: string[] }) {
    const setlist = createSetlist(input.name, input.songIds)
    await saveSetlist(setlist)
    setSetlists(await listSetlists())
    setView({ name: 'setlist', id: setlist.id })
  }

  async function handleUpdateSetlist(id: string, input: { name: string; songIds: string[] }) {
    const existing = setlists.find((s) => s.id === id)
    if (!existing) return
    const updated = updateSetlist(existing, input)
    await saveSetlist(updated)
    setSetlists(await listSetlists())
    setView({ name: 'setlist', id })
  }

  async function handleDeleteSetlist(id: string) {
    await deleteSetlist(id)
    setSetlists(await listSetlists())
    setView({ name: 'setlists' })
  }

  function goToSetlistSong(setlist: Setlist, index: number) {
    const id = setlist.songIds[index]
    if (!id) return
    setView({ name: 'song', id, setlistCtx: { setlistId: setlist.id, index } })
  }

  if (!loaded) {
    return <div className="app-shell loading">Loading your library&hellip;</div>
  }

  return (
    <div className="app-shell">
      {!online && (
        <p className="offline-banner">
          Offline — your library, viewer, recording, and play mode all still work. Online lyrics search won't.
        </p>
      )}
      {view.name === 'list' && (
        <SongList
          songs={songs}
          setlists={setlists}
          onSelect={(id) => setView({ name: 'song', id })}
          onAdd={() => setView({ name: 'add' })}
          onImportRequested={handleImportRequested}
          onOpenSetlists={() => setView({ name: 'setlists' })}
        />
      )}
      {view.name === 'add' && <AddSongForm onSave={handleCreate} onCancel={() => setView({ name: 'list' })} />}
      {view.name === 'song' &&
        (() => {
          const song = songs.find((s) => s.id === view.id)
          if (!song) return null

          let setlistNav: SetlistNav | undefined
          const setlistCtx = view.setlistCtx
          if (setlistCtx) {
            const setlist = setlists.find((s) => s.id === setlistCtx.setlistId)
            if (setlist) {
              const { index } = setlistCtx
              setlistNav = {
                position: `${index + 1} / ${setlist.songIds.length}`,
                onPrev: index > 0 ? () => goToSetlistSong(setlist, index - 1) : undefined,
                onNext: index < setlist.songIds.length - 1 ? () => goToSetlistSong(setlist, index + 1) : undefined,
              }
            }
          }

          return (
            <SongViewer
              song={song}
              onBack={() => setView(setlistCtx ? { name: 'setlist', id: setlistCtx.setlistId } : { name: 'list' })}
              onEdit={(id) => setView({ name: 'edit', id })}
              onDelete={handleDelete}
              onPlay={(id, transposeSemitones) => setView({ name: 'play', id, transposeSemitones, setlistCtx })}
              setlistNav={setlistNav}
            />
          )
        })()}
      {view.name === 'play' &&
        (() => {
          const song = songs.find((s) => s.id === view.id)
          if (!song) return null
          const setlistCtx = view.setlistCtx
          return (
            <PlayMode
              song={song}
              transposeSemitones={view.transposeSemitones}
              onBack={() => setView({ name: 'song', id: song.id, setlistCtx })}
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
      {view.name === 'setlists' && (
        <SetlistList
          setlists={setlists}
          onSelect={(id) => setView({ name: 'setlist', id })}
          onCreate={() => setView({ name: 'setlist-edit' })}
          onBack={() => setView({ name: 'list' })}
        />
      )}
      {view.name === 'setlist' &&
        (() => {
          const setlist = setlists.find((s) => s.id === view.id)
          if (!setlist) return null
          return (
            <SetlistView
              setlist={setlist}
              allSongs={songs}
              onSelectSong={(index) => goToSetlistSong(setlist, index)}
              onEdit={() => setView({ name: 'setlist-edit', id: setlist.id })}
              onDelete={() => handleDeleteSetlist(setlist.id)}
              onBack={() => setView({ name: 'setlists' })}
            />
          )
        })()}
      {view.name === 'setlist-edit' &&
        (() => {
          const existing = view.id ? setlists.find((s) => s.id === view.id) : undefined
          return (
            <SetlistEditor
              allSongs={songs}
              initial={existing ? { name: existing.name, songIds: existing.songIds } : undefined}
              onSave={(input) => (existing ? handleUpdateSetlist(existing.id, input) : handleCreateSetlist(input))}
              onCancel={() => setView(existing ? { name: 'setlist', id: existing.id } : { name: 'setlists' })}
            />
          )
        })()}
    </div>
  )
}

export default App
