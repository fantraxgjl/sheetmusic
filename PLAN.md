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

## 8. Status (phases 0-4)

Phases 0-4 are implemented (`app/`). Notable findings from building phase 4
(mic-capture chord derivation):

- **essentia.js's default/Node entry point silently fails under Vite** — it
  imports without error but never actually finishes instantiating its WASM,
  so calling any algorithm throws. The fix was importing its browser-targeted
  factory build directly (`essentia.js/dist/essentia-wasm.web.js` +
  `essentia.js/dist/essentia.js-core.es.js`) with the `.wasm` binary copied
  into `public/` and an explicit `locateFile` — see `src/lib/essentiaEngine.ts`
  for the full explanation.
- **`getUserMedia`'s default speech-call DSP** (echo cancellation, noise
  suppression, auto gain control) meaningfully distorts music and was
  disabled explicitly. **`MediaRecorder`'s default lossy Opus encoding** was
  also swapped for uncompressed PCM (`audio/webm;codecs=pcm`) — both were
  measurable accuracy losses, not just theoretical ones (see
  `src/lib/audioCapture.ts`).
- **Extended chord vocabulary** (`src/lib/chordTemplates.ts`): essentia's
  built-in `ChordsDetection`/`ChordsDetectionBeats` only recognize major/minor
  triads. Replaced them with a custom cosine-similarity template matcher over
  the same HPCP vectors, covering major/minor/7/maj7/m7/sus2/sus4/dim/aug.
  Three real issues turned up while building and tuning this, all fixed:
  - **Frequency resolution**: 4096-sample frames at 44.1kHz gave only
    ~10.8Hz/bin — coarser than the 10-20Hz gaps between bass-register notes,
    so bass chords were smearing across adjacent pitch classes even from
    clean, non-decaying test tones. Fixed by increasing to 8192 samples
    (~5.4Hz/bin), trading time resolution for frequency resolution (an easy
    call — chords last well over the resulting ~0.19s/frame regardless).
  - **Fundamental sus/6th ambiguity**: some chord qualities are *literally
    the same pitch-class set* as a different chord on a different root —
    e.g. Fsus4 {F,Bb,C} and Bbsus2 {Bb,C,F} are identical once folded into a
    chroma vector; no amount of chroma-matching can ever tell them apart.
    Fixed by estimating a cheap "bass note" from the lowest strong spectral
    peak per segment and using it to break near-ties toward the chord whose
    root matches the bass.
  - **More qualities means more false positives**: confirmed empirically —
    adding the extended vocabulary measurably increased spurious 7th/sus
    labels on audio that was actually plain major/minor (a decaying overtone
    or a blended transition frame was enough to tip a template match). Fixed
    with a margin requiring an extended-quality match to clearly beat the
    best plain-triad match before it's accepted, rather than treat all
    qualities as equally likely candidates.
  - This is a real coverage/noise tradeoff, not a free upgrade: 7th/sus
    chords are now recognized when actually present, but expect more
    correction on extended-harmony songs than a plain major/minor chart
    would need.
- **Validation performed**: synthetic-but-musically-structured test signals
  (decaying, harmonically-rich notes on a real rhythmic grid, one using plain
  triads and one using G7/Fsus4) run through the full pipeline and
  cross-checked between a clean direct-file test and the complete
  record→encode→decode→resample→analyze browser pipeline. Final tuned result:
  all chords in both progressions are correctly recovered at least once
  (several segments cleanly and consistently), with some boundary noise and
  occasional alternation on the extended chords — an honest reflection of
  real ambiguity, not a pipeline bug.
- **Not validated**: real commercial recordings. This environment has no
  network access to legally obtain one, and downloading copyrighted audio
  isn't something to route around that with. Testing against real playing is
  the real proof and needs to happen once this runs on your own device.

## 9. Status (phase 5 — live play)

Phase 5 (mic listening + autoscroll while playing) is implemented: a "Play"
button on the song viewer opens a full-screen play-along mode
(`src/components/PlayMode.tsx`) that highlights the current chord/lyric
position (`PlaySheet.tsx`, a custom renderer built directly from
chordsheetjs's parsed line/item structure rather than its HTML formatter, so
each chord can be given a sequence index and scrolled into view), listens via
the mic, and auto-advances when the expected chord is confidently sustained.
Manual override (Space/→ to advance, ← to go back) always works, whether or
not listening is active, and works from any position.

Design notes:

- **Bounded matching, not classification**: at each ~300ms tick, a ~1s
  rolling audio snapshot is scored against *one specific expected chord*
  (`chordTemplates.scoreChordPresence`) rather than run through open-ended
  classification — confirming "is this chord present" is a much easier,
  lower-noise problem than "what chord is this," which is what makes
  real-time confirmation tractable on top of an already-approximate
  detection pipeline.
- **Arbitrary chord-spelling support**: expected chords come from whatever
  the user actually typed in the ChordPro body (any spelling — flats, slash
  bass, add9, etc.), not just the vocabulary chordTemplates.ts can derive
  from scratch. `chordName.ts` uses chordsheetjs's own `Chord.parse()` to
  turn arbitrary chord text into a root pitch class + quality, falling back
  to a root+fifth check for qualities outside the recognized vocabulary
  (add9, 6, m7b5, 9/11/13, etc.) rather than failing outright.
  `Chord.parse()` also correctly handles slash-bass chords (C/E) and
  enharmonic spellings (Bb == A#).
- **Transpose-aware**: live matching uses whatever transposition is
  currently displayed, not the song's stored original — otherwise a
  transposed chart would show one chord while matching against another.
- **Dwell requirement**: two consecutive confident ticks (~600ms sustained)
  are required before advancing, so a single stray overtone or passing note
  can't trigger a false advance.
- A real implementation gotcha: essentia's `Windowing` needs its own vector
  wrapper (`essentia.arrayToVector(...)`), not a plain `Float32Array`, even
  though `FrameGenerator` elsewhere hands out that wrapper directly for free
  — passing a raw array through silently computed garbage rather than
  erroring, until it was checked deliberately. The frame-analysis logic
  (windowing → spectrum → peaks → HPCP → bass estimate) was factored into
  one shared function (`hpcpAnalysis.ts`) used by both phase 4's offline
  derivation and phase 5's live listening, specifically so a bug like that
  only has one place to hide rather than two copies silently drifting apart.

**Validation performed**: end-to-end in a real browser, using Chromium's
fake-audio-capture-device flag to feed a synthetic C→G7→Am→Fsus4 recording as
live "microphone" input against a song with a matching chord chart —
position correctly advanced through all four chords in order, in sync with
the actual audio, with confidence rising and falling sensibly at
transitions. As a negative control, the same audio was fed against a song
with a *deliberately wrong* chord chart (Dm/Bb/E/F#) — confidence never
crossed the advance threshold and the position correctly never moved,
confirming the first result wasn't a false pass. Manual override (Next/
Previous) was confirmed to work independent of listening state.

**Not validated**: real playing on a real piano through a real microphone —
same caveat as phase 4. Background noise, room acoustics, and actual
playing dynamics (sustain pedal blur, passing tones during improvisation)
are exactly the conditions this was designed to tolerate but can't be tested
here; the confidence threshold and dwell timing (0.65, 2×300ms) are
reasonable starting points, not empirically tuned against real playing, and
likely the first things worth adjusting once you've tried it.

## 10. Status (phase 6 — partial)

Phase 6 bundles four things that don't all belong in the same bucket: three
are pure client-side features with no new decisions attached, and one (cross-
device sync) needs a real infrastructure choice — hosting, possibly recurring
cost, an account somewhere — that isn't mine to make unilaterally. The three
client-side pieces are done:

- **Setlists**: create a named, ordered list of songs (`lib/setlist.ts`, a
  second IndexedDB store alongside `songs`, version-bumped with an additive
  upgrade path so existing libraries aren't disturbed). Opening a song from
  a setlist carries that context through the whole flow — Prev/Next song
  navigation in the viewer, Play mode's Back button returns to the song
  (not the plain list), and the song's own Back button returns to the
  setlist. Verified end-to-end in a browser: order preserved, navigation
  correct in both directions, context survives a trip through Play mode.
- **Offline resilience**: added an online/offline banner
  (`lib/useOnlineStatus.ts`) since lyrics search is the only feature that
  needs a network. More importantly, actually verified the PWA offline
  claim rather than assuming vite-plugin-pwa's config was sufficient: built
  the production bundle, served it, loaded once (installing the service
  worker), then went offline and reloaded — the app shell, a previously
  saved song, and its rendered chord sheet all came back with zero network
  access.
- **Stage mode**: a per-session toggle in Play mode (persisted via
  localStorage) that substantially increases font size and contrast for
  glancing at a chart under stage lighting — verified visually via
  screenshot.

**Cross-device sync — decided (for now)**: manual sync via export/import
(option 1 above), no new infrastructure. Two gaps found while finalizing
this were fixed:
- **Setlists weren't included in export/import** — the backup code
  (`lib/backup.ts`) predates setlists and only ever handled songs.
  `exportLibraryJson`/`parseLibraryImport` now bundle both, with
  backward-compatible parsing of old export files (a bare song array, or
  `{songs: [...]}` with no `setlists` key) — verified an old-format file
  still imports cleanly.
- **Export now prefers the OS share sheet** (`navigator.share` with files —
  AirDrop, Drive, Messages, etc.) when the device supports it, falling back
  to a plain file download everywhere else (confirmed: not supported in
  this environment's headless Chromium, and the fallback path was what
  actually fired and worked).

Verified end-to-end: created songs + a setlist, exported, deleted
everything, re-imported, and both the songs and the setlist's order came
back correctly.

Known limits of this approach, worth remembering: it's a manual step every
time (nothing pushes automatically), merge semantics are "last import wins"
per song ID with no conflict detection, and deletions don't propagate
(importing an old backup can resurrect a song you deleted elsewhere). If
that becomes a real friction point, options #2/#3 from the original
list — a small hosted backend, or a managed backend-as-a-service — are
still on the table.
