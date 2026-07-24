import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SongRecord } from './song'
import type { Setlist } from './setlist'

interface LibraryDB extends DBSchema {
  songs: {
    key: string
    value: SongRecord
    indexes: { 'by-title': string }
  }
  setlists: {
    key: string
    value: Setlist
    indexes: { 'by-name': string }
  }
}

const DB_NAME = 'piano-improv-library'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<LibraryDB>> | undefined

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LibraryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('songs', { keyPath: 'id' })
          store.createIndex('by-title', 'title')
        }
        if (oldVersion < 2) {
          const store = db.createObjectStore('setlists', { keyPath: 'id' })
          store.createIndex('by-name', 'name')
        }
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

export async function listSetlists(): Promise<Setlist[]> {
  const db = await getDB()
  const setlists = await db.getAllFromIndex('setlists', 'by-name')
  return setlists.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getSetlist(id: string): Promise<Setlist | undefined> {
  const db = await getDB()
  return db.get('setlists', id)
}

export async function saveSetlist(setlist: Setlist): Promise<void> {
  const db = await getDB()
  await db.put('setlists', setlist)
}

export async function deleteSetlist(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('setlists', id)
}

/** Upserts by id — used to restore/merge a library backup. */
export async function saveSetlists(setlists: Setlist[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('setlists', 'readwrite')
  await Promise.all(setlists.map((setlist) => tx.store.put(setlist)))
  await tx.done
}
