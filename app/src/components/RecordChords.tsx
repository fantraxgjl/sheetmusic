import { useEffect, useRef, useState } from 'react'
import { startRecording, decodeToMonoPCM, type ActiveRecording } from '../lib/audioCapture'
import { ANALYSIS_SAMPLE_RATE, deriveChordsFromAudio, type ChordSegment } from '../lib/chordDerivation'

type Status =
  | { phase: 'idle' }
  | { phase: 'recording'; seconds: number }
  | { phase: 'processing' }
  | { phase: 'error'; message: string }

export function RecordChords({ onDerived }: { onDerived: (segments: ChordSegment[]) => void }) {
  const [status, setStatus] = useState<Status>({ phase: 'idle' })
  const recordingRef = useRef<ActiveRecording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recordingRef.current?.cancel()
    }
  }, [])

  async function handleStart() {
    try {
      setStatus({ phase: 'recording', seconds: 0 })
      recordingRef.current = await startRecording()
      timerRef.current = setInterval(() => {
        setStatus((prev) => (prev.phase === 'recording' ? { phase: 'recording', seconds: prev.seconds + 1 } : prev))
      }, 1000)
    } catch (err) {
      setStatus({
        phase: 'error',
        message: `Couldn't access the microphone: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  async function handleStop() {
    if (timerRef.current) clearInterval(timerRef.current)
    const recording = recordingRef.current
    if (!recording) return
    setStatus({ phase: 'processing' })
    try {
      const blob = await recording.stop()
      const pcm = await decodeToMonoPCM(blob, ANALYSIS_SAMPLE_RATE)
      const segments = await deriveChordsFromAudio(pcm)
      setStatus({ phase: 'idle' })
      onDerived(segments)
    } catch (err) {
      setStatus({
        phase: 'error',
        message: `Couldn't derive chords from that recording: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  function handleCancel() {
    if (timerRef.current) clearInterval(timerRef.current)
    recordingRef.current?.cancel()
    recordingRef.current = null
    setStatus({ phase: 'idle' })
  }

  return (
    <details className="quick-paste">
      <summary>Record audio to derive chords</summary>
      <p className="record-chords-hint">
        Play the song out loud near this device (from any speaker), then stop when you're done. This
        analyzes the recording locally in your browser — nothing is uploaded.
      </p>

      {status.phase === 'idle' && (
        <div className="form-actions record-chords-actions">
          <button onClick={handleStart}>Start recording</button>
        </div>
      )}

      {status.phase === 'recording' && (
        <div className="form-actions record-chords-actions">
          <span className="record-chords-timer">&#9679; Recording&hellip; {status.seconds}s</span>
          <button onClick={handleStop}>Stop &amp; analyze</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      )}

      {status.phase === 'processing' && (
        <div className="form-actions record-chords-actions">
          <span className="record-chords-timer">Analyzing recording&hellip; this can take a little while.</span>
        </div>
      )}

      {status.phase === 'error' && <p className="form-error">{status.message}</p>}
    </details>
  )
}
