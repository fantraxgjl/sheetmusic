import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SongRecord } from './song'

interface LibraryDB extends DBSchema {
  songs: {
    key: string
    value: SongRecord
    indexes: { 'by-title': string }
  }
}

const DB_NAME = 'piano-improv-library'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<LibraryDB>> | undefined

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LibraryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('songs', { keyPath: 'id' })
        store.createIndex('by-title', 'title')
      },
    })
  }
  return dbPromise
}

export async function listSongs(): Promise<SongRecord[]> {
  const db = await getDB()
  const songs = await db.getAllFromIndex('songs', 'by-title')
  return songs.sort((a, b) => a.title.localeCompare(b.title))
}

export async function getSong(id: string): Promise<SongRecord | undefined> {
  const db = await getDB()
  return db.get('songs', id)
}

export async function saveSong(song: SongRecord): Promise<void> {
  const db = await getDB()
  await db.put('songs', song)
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('songs', id)
}

/** Upserts by id — used to restore/merge a library backup. */
export async function saveSongs(songs: SongRecord[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('songs', 'readwrite')
  await Promise.all(songs.map((song) => tx.store.put(song)))
  await tx.done
}
