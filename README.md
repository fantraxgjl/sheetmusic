# Piano Improv

A personal-use web app for playing piano with chord/lyric charts: pull up a
song, play the chords while improvising the melody, and have the app follow
along by listening to what you're playing.

No account, no backend — everything (your song library, audio analysis)
runs locally in the browser. See [`PLAN.md`](./PLAN.md) for the full design
rationale, phased build history, and known limitations/tradeoffs found along
the way.

## Features

- **Chord/lyric charts** in [ChordPro](https://www.chordpro.org/) format,
  with transpose, search, and setlists.
- **Three ways to get chords into a song**: paste ChordPro directly, paste a
  chords-over-lyrics chart copied from any lyrics site, or record yourself
  playing a song out loud and let the app derive the chords automatically.
- **Live-play mode**: listens via your microphone while you play and
  auto-scrolls the chart to follow along, with manual override (spacebar/
  arrow keys) always available regardless of what it hears.
- **Fully offline-capable** once loaded — installable as a PWA (add to
  home screen / install as an app).
- **Your data stays on your device.** Export/import (with OS share-sheet
  support where available) to move your library between devices.

## Requirements

- Node.js 20+ and npm — only needed to build/run it; once deployed, end
  users just open it in a browser.
- A modern browser. Chrome/Edge is the most tested; some conveniences (like
  the share-sheet export) depend on browser support and silently fall back
  to a plain download where unavailable.
- Microphone access for recording-derived chords and live-play mode.

## Run it locally (development)

```bash
cd app
npm install
npm run dev
```

Opens at `http://localhost:5173` (or the next free port).

## Build for production

```bash
cd app
npm install
npm run build      # outputs to app/dist/
npm run preview    # serve the built app locally to sanity-check it
```

## Installing it as an app on your phone or laptop

This is a Progressive Web App: once it's reachable at a URL over HTTPS,
your browser will let you "install" it — a home-screen icon that opens
full-screen and works offline. Two ways to get there:

1. **Deploy `app/dist/` to a static host.** Free options that all work well
   for this: Netlify, Vercel, Cloudflare Pages, GitHub Pages. Any of them
   can build straight from this repo — build command `npm run build` run
   inside `app/`, publish directory `app/dist`. Once deployed, open the URL
   on your phone:
   - **iOS Safari**: Share button → "Add to Home Screen"
   - **Android Chrome**: menu (⋮) → "Install app" (often offered
     automatically via a banner)
   - **Desktop Chrome/Edge**: an install icon appears in the address bar
2. **Run it on your home network for testing.** `npm run dev -- --host`,
   then open `http://<your-computer's-LAN-IP>:5173` from your phone on the
   same Wi-Fi. Fine for trying it out, but it isn't HTTPS, so installing to
   home screen and full offline caching won't work properly — not meant for
   daily use.

This hasn't been deployed anywhere yet — it only exists in this repo so
far. Say the word and a Netlify or Vercel deployment can be set up directly
from this session.

## Privacy

Song library storage and all audio analysis (chord derivation, live-play
listening) happen entirely on-device — no audio or library data is ever
uploaded anywhere. The one exception: searching for lyrics queries
[LRCLIB](https://lrclib.net)'s public API, and only when you explicitly use
that feature.

## Project layout

```
PLAN.md       — full requirements, phased build plan, design notes
app/          — the actual application (Vite + React + TypeScript PWA)
  src/lib/    — song/setlist models, storage, chord-derivation & live-
                listening engines, ChordPro/lyrics integration
  src/components/ — UI
```
