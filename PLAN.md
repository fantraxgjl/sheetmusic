# Piano Improvisation App — Plan

Personal-use app: sit at any piano, pull up a song's chords + lyrics, play the
chords while improvising the melody, and have the app auto-scroll by
listening to what you're playing. Audio-only (no MIDI dependency), usable
from laptop, phone, or tablet.

## 1. Core workflow

```
I want to play song X
   -> search my library
        -> found it            -> open and play (instant)
        -> not found            -> generate a chart, tiered by cost (below)
                                -> play, then it's saved for next time
```

The generate step is the expensive one, which is why the library isn't
optional scaffolding — it's what keeps you from paying that cost twice for
the same song.

## 2. Tiered "generate" flow

1. **Library hit** — instant, no processing.
2. **Paste a chord-over-lyrics text block** you found yourself (copied from
   any lyrics/chords site into the app). Parsed via a chord-alignment
   parser into the internal format. Seconds, no external audio, no legal
   exposure — it's a one-off manual paste, not automated scraping.
3. **Mic-capture derivation** — for songs with no chord chart text
   anywhere, or when you want it derived by ear. You play the track out
   loud (your own Spotify/YouTube/etc. subscription, your own speaker),
   the app listens via the microphone the same way you would, and derives
   a chord timeline from that. Slowest tier, only one that needs zero
   external text source.

Explicitly **not** in scope: programmatically downloading audio from
streaming platforms (YouTube, Spotify, Apple Music, etc.). That violates
their terms of service regardless of personal-use framing, so the only
audio ingestion paths are "you provide/play the audio" ones above.

Every tier writes into the same library entry, so tier 2's cost is paid at
most once per song.

## 3. Requirements

### 3.1 Library (search & retrieval — now a core feature, not backup)
- **Must** Fast search/lookup by title/artist as the first step of "I want
  to play this song."
- **Must** Store songs in a portable, human-readable format (ChordPro).
- **Should** Export/backup the whole library on demand.
- **Could** Setlists — group/order songs for a session.

### 3.2 Import / generation
- **Must** Tier 1: paste chord-over-lyrics text, auto-parse into
  chords+lyrics, with a fast manual-correction editor for parser mistakes.
- **Must** Tier 2: mic-capture a song being played aloud, derive a chord
  timeline (beat tracking → chroma extraction → chord estimation →
  smoothing).
- **Must** Fetch lyrics from an open, personal-use lyrics source (e.g.
  LRCLIB) by title/artist — including **synced/timestamped** lyrics where
  available, since that timestamp axis is exactly what a mic-derived chord
  *timeline* needs to align chords to lyric lines automatically.
- **Must** Fast correction UI for tier 2 output — expect chord-recognition
  errors; fixing one wrong chord should be near-instant, not a re-transcribe.
- **Won't (v1)** Automated downloading from streaming platforms.

### 3.3 Chord/lyric display
- **Must** Lyrics with chords positioned above the correct word, legible
  at arm's length from the piano.
- **Must** Transpose / capo-aware display.
- **Should** Adjustable font size / line spacing per device.
- **Should** Manual scroll and tap-to-jump to any section, as a fallback
  to auto-follow.

### 3.4 Live play: listening & autoscroll
- **Must** Live mic capture while you play, processed locally (audio never
  leaves the device).
- **Must** Match what's sounding against the **expected chord at the
  current song position** — a constrained match against a short candidate
  list, not open-ended classification, and the same chord-matching engine
  built for tier 2 generation, reused in a "confirm expected chord" mode.
- **Must** Tolerate improvised melody notes and passing tones on top of
  the chord — key off chord tones being present/dominant, not an exact
  note-set match.
- **Should** Confidence/dwell threshold before advancing, to avoid a
  single stray note or pedal blur triggering a false scroll.
- **Should** Visible confidence indicator, so you can tell when it's
  tracking well vs struggling.
- **Must** Manual override always available (tap/click/spacebar/Bluetooth
  pedal) — automatic detection is an assist, never a hard gate.

### 3.5 Cross-device
- **Must** Responsive web app / installable PWA — same app on laptop,
  phone, tablet, no separate native builds.
- **Must** Library available from any device (needs a small personal sync
  backend — see open decisions).
- **Should** Usable with weak/no connectivity once a song is loaded;
  library sync resumes when back online.
- **Won't** Multi-user accounts, sharing, collaboration.

### 3.6 Non-functional
- **Privacy** — mic audio is processed locally/ephemerally, never uploaded
  or retained beyond deriving chords for the current session.
- **Latency** — live-play chord confirmation needs to feel near-instant or
  autoscroll will feel laggy and get ignored.
- **Simplicity** — no auth/multi-tenant complexity beyond whatever the
  personal cross-device sync needs.
- **Resilience** — detection will sometimes miss; the app must never leave
  you stuck mid-song — manual controls always work.

## 4. Architecture sketch

- **Frontend**: PWA (React/Vite or similar), Web Audio API for mic capture
  and all chord-matching DSP, runs client-side so audio never needs to
  leave the device.
- **Chord engine (shared logic, two modes)**:
  - *Generation mode* (tier 2): given a captured recording, run beat
    tracking + chroma extraction + chord estimation + Viterbi/HMM
    smoothing to produce a chord timeline.
  - *Live-confirmation mode* (play-along): given a short rolling audio
    buffer and one expected chord (+ a few plausible neighbors), answer
    "is this chord present/dominant right now?" — a much easier, bounded
    problem than open classification.
- **Song format**: ChordPro text as the canonical storage format
  (portable, diffable, human-editable).
- **Sync backend**: minimal personal service (small hosted API + DB, e.g.
  SQLite/Postgres) to keep the library consistent across your devices —
  no multi-user auth needed, just "make sure it's the same everywhere I
  open it."
- **Lyrics source**: LRCLIB (or equivalent open, personal-use-oriented
  lyrics API) for plain and synced lyrics lookups.

## 5. Phased build plan

| Phase | Deliverable |
|---|---|
| 0 | PWA scaffold, ChordPro data model + renderer, local storage (IndexedDB) |
| 1 | Library core: search, view, transpose, manual edit, export/backup |
| 2 | Tier 1 generate: paste-chords parser + correction UI |
| 3 | Lyrics fetch integration (LRCLIB), auto-attach to tier 1/2 songs |
| 4 | Tier 2 generate: mic-capture recording flow, chord timeline derivation, alignment to synced lyrics, correction UI |
| 5 | Live play mode: mic listening, expected-chord confirmation, confidence display, autoscroll, manual override |
| 6 | Cross-device sync backend, offline resilience, setlists, stage/dark mode |

Phase 5 (the original "listen while I play and autoscroll" ask) depends on
the chord-matching engine already built for phase 4, so building generation
first isn't wasted effort even though live-play was the original hook.

## 6. Open decisions / risks

- **Mic-capture fidelity for tier 2**: audio captured off a speaker through
  a room mic is a lossier signal than a clean file (room noise, phone mic
  quality, no source separation from a clean mix). Expect tier 2 output to
  be a rough draft you correct, not a trustworthy first pass — the
  correction UI in 3.2 isn't optional polish, it's load-bearing.
- **Sync backend hosting**: needs a concrete choice (self-hosted small
  service vs a managed backend-as-a-service) before phase 6 — deferred
  until the core generate/play loop is proven out.
- **Live-play latency budget**: needs empirical tuning once phase 5 is
  actually running against a real piano.

## 7. Explicit non-goals (v1)

- Automated audio downloading from any streaming platform.
- Multi-user accounts, sharing, or collaboration features.
- Full melodic transcription / notation output — this is a chord+lyric
  chart tool, not a music notation app.
