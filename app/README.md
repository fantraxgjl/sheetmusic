# Piano Improv

Phase 0 scaffold: a PWA for viewing chord/lyric charts while improvising on
piano. See `../PLAN.md` for the full requirements and phased plan.

Currently implemented:

- ChordPro-based song model, stored locally in IndexedDB.
- Paste-in ChordPro text to add a song (validated before saving).
- Chord-over-lyrics rendering.
- Installable PWA (manifest + service worker via `vite-plugin-pwa`).

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
