export interface Setlist {
  id: string
  name: string
  /** Ordered song IDs — order is the whole point of a setlist. */
  songIds: string[]
  createdAt: number
  updatedAt: number
}

export function createSetlist(name: string, songIds: string[] = []): Setlist {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled setlist',
    songIds,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateSetlist(existing: Setlist, input: { name: string; songIds: string[] }): Setlist {
  return {
    ...existing,
    name: input.name.trim() || 'Untitled setlist',
    songIds: input.songIds,
    updatedAt: Date.now(),
  }
}
