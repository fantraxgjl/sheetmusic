import { MUSIC_CAPTURE_AUDIO_CONSTRAINTS, resampleFloat32 } from './audioCapture'
import { getEssentia } from './essentiaEngine'
import { scoreChordPresence } from './chordTemplates'
import { analyzeFrame } from './hpcpAnalysis'

// How often to analyze the rolling buffer. Short enough to feel responsive,
// long enough that essentia's WASM analysis (a few ms for a ~1s window)
// never has trouble keeping up.
const ANALYSIS_INTERVAL_MS = 300
// How much recent audio each analysis tick looks at. Long enough to average
// out a hand moving across keys mid-chord; short enough not to blur a real
// chord change into the confidence check.
const SNAPSHOT_SECONDS = 1.0
// Matches ANALYSIS_SAMPLE_RATE elsewhere (chordDerivation.ts) so the same
// HPCP pipeline behavior applies — resampling a ~1s snapshot is cheap enough
// not to matter for responsiveness.
const TARGET_SAMPLE_RATE = 44100
// Confidence a chord needs to clear before it counts as "detected" at all.
const CONFIDENCE_THRESHOLD = 0.65
// Consecutive ticks above threshold required before firing onAdvance — one
// good tick could just be a passing overtone; two in a row (~600ms) is a
// deliberate, sustained chord.
const DWELL_TICKS_REQUIRED = 2

export interface LiveListeningCallbacks {
  onConfidence: (score: number) => void
  onAdvance: () => void
  onError: (message: string) => void
}

export interface LiveListeningHandle {
  stop(): void
}

/**
 * Listens to the mic and checks, on a timer, whether the chord currently
 * being played matches `getExpectedChord()` — a bounded "is this specific
 * chord present" check (see chordTemplates.scoreChordPresence), not open
 * classification, which is what makes this tractable on top of an
 * already-approximate chord-derivation pipeline. Fires onAdvance once
 * confidence has been sustained for DWELL_TICKS_REQUIRED consecutive ticks.
 */
export async function startLiveListening(
  getExpectedChord: () => string | null,
  callbacks: LiveListeningCallbacks
): Promise<LiveListeningHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: MUSIC_CAPTURE_AUDIO_CONSTRAINTS })
  const audioContext = new AudioContext()
  const sourceNode = audioContext.createMediaStreamSource(stream)

  const bufferSize = 4096
  // ScriptProcessorNode is deprecated in favor of AudioWorklet, but it runs
  // its callback on the main thread with a plain Float32Array in hand — far
  // simpler than AudioWorklet's separate module + postMessage plumbing for
  // this use case, and still supported everywhere.
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
  // ScriptProcessorNode only fires its callback while connected all the way
  // to the destination; route through a muted gain node so the mic audio
  // itself is never actually played back.
  const silentGain = audioContext.createGain()
  silentGain.gain.value = 0

  const chunks: Float32Array[] = []
  const maxChunks = Math.ceil((SNAPSHOT_SECONDS * audioContext.sampleRate) / bufferSize) + 1

  processor.onaudioprocess = (event) => {
    // Copy — the underlying buffer is reused by the audio system next callback.
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
    while (chunks.length > maxChunks) chunks.shift()
  }

  sourceNode.connect(processor)
  processor.connect(silentGain)
  silentGain.connect(audioContext.destination)

  let stopped = false
  let dwellCount = 0
  let analyzing = false

  const essentia = await getEssentia()

  function releaseAll() {
    processor.disconnect()
    sourceNode.disconnect()
    silentGain.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    void audioContext.close()
  }

  const intervalId = setInterval(() => {
    void (async () => {
      if (stopped || analyzing) return
      const expectedChord = getExpectedChord()
      if (!expectedChord) return

      analyzing = true
      try {
        const snapshot = concatFloat32(chunks)
        if (snapshot.length === 0) return

        const resampled = await resampleFloat32(snapshot, audioContext.sampleRate, TARGET_SAMPLE_RATE)
        const analysis = analyzeFrame(essentia, resampled)
        const vector = analysis ? analysis.hpcp : new Array(12).fill(0)
        const score = scoreChordPresence(vector, expectedChord)
        callbacks.onConfidence(score)

        if (score >= CONFIDENCE_THRESHOLD) {
          dwellCount++
          if (dwellCount >= DWELL_TICKS_REQUIRED) {
            dwellCount = 0
            callbacks.onAdvance()
          }
        } else {
          dwellCount = 0
        }
      } catch (err) {
        callbacks.onError(err instanceof Error ? err.message : String(err))
      } finally {
        analyzing = false
      }
    })()
  }, ANALYSIS_INTERVAL_MS)

  return {
    stop() {
      stopped = true
      clearInterval(intervalId)
      releaseAll()
    },
  }
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
