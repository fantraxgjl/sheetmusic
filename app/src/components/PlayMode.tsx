import { useEffect, useMemo, useRef, useState } from 'react'
import type { SongRecord } from '../lib/song'
import { parseChordSequence } from '../lib/songStructure'
import { startLiveListening, type LiveListeningHandle } from '../lib/liveListening'
import { PlaySheet } from './PlaySheet'

const CONFIDENCE_THRESHOLD = 0.65
const STAGE_MODE_KEY = 'piano-improv-stage-mode'

export function PlayMode({
  song,
  transposeSemitones = 0,
  onBack,
}: {
  song: SongRecord
  transposeSemitones?: number
  onBack: () => void
}) {
  const sequence = useMemo(
    () => parseChordSequence(song.body, transposeSemitones),
    [song.body, transposeSemitones]
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [listening, setListening] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [listenError, setListenError] = useState<string | null>(null)
  const [stageMode, setStageMode] = useState(() => localStorage.getItem(STAGE_MODE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(STAGE_MODE_KEY, String(stageMode))
  }, [stageMode])

  const currentIndexRef = useRef(currentIndex)
  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  const handleRef = useRef<LiveListeningHandle | null>(null)

  function goTo(index: number) {
    setCurrentIndex(Math.max(0, Math.min(sequence.length - 1, index)))
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault()
        goTo(currentIndexRef.current + 1)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        goTo(currentIndexRef.current - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence.length])

  useEffect(() => {
    return () => {
      handleRef.current?.stop()
    }
  }, [])

  async function handleToggleListening() {
    if (listening) {
      handleRef.current?.stop()
      handleRef.current = null
      setListening(false)
      setConfidence(0)
      return
    }
    setListenError(null)
    try {
      handleRef.current = await startLiveListening(
        () => sequence[currentIndexRef.current] ?? null,
        {
          onConfidence: setConfidence,
          onAdvance: () => goTo(currentIndexRef.current + 1),
          onError: setListenError,
        }
      )
      setListening(true)
    } catch (err) {
      setListenError(`Couldn't access the microphone: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const noChords = sequence.length === 0

  return (
    <div className={`play-mode${stageMode ? ' stage-mode' : ''}`}>
      <div className="play-mode-header">
        <button onClick={onBack}>&larr; Back</button>
        <h1>{song.title}</h1>
        <button
          onClick={() => setStageMode((v) => !v)}
          className={stageMode ? 'listening-active' : ''}
          aria-label="Toggle stage mode (larger text, higher contrast)"
        >
          Stage mode
        </button>
      </div>

      {noChords ? (
        <p className="empty-state">This song has no chords to play along with yet.</p>
      ) : (
        <>
          <div className="play-mode-controls">
            <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
              &larr; Previous
            </button>
            <span className="play-mode-position">
              {currentIndex + 1} / {sequence.length}
            </span>
            <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === sequence.length - 1}>
              Next &rarr;
            </button>
            <button onClick={handleToggleListening} className={listening ? 'listening-active' : ''}>
              {listening ? 'Stop listening' : 'Start listening'}
            </button>
          </div>

          {listening && (
            <div className="confidence-meter">
              <div
                className={`confidence-bar${confidence >= CONFIDENCE_THRESHOLD ? ' confident' : ''}`}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
          )}
          {listenError && <p className="form-error">{listenError}</p>}

          <p className="play-mode-hint">
            Space or &rarr; to advance manually, &larr; to go back &mdash; works whether or not listening is on.
          </p>

          <PlaySheet body={song.body} currentIndex={currentIndex} transposeSemitones={transposeSemitones} />
        </>
      )}
    </div>
  )
}
