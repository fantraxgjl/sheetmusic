export interface ActiveRecording {
  stop(): Promise<Blob>
  cancel(): void
}

/** Requests mic access and starts recording immediately. Throws if permission is denied. */
export async function startRecording(): Promise<ActiveRecording> {
  // getUserMedia defaults these speech-call DSP features to *on*, which
  // distorts music (dynamic range compression, spectral notching, high-pass
  // filtering) badly enough to throw off chord detection — turn them off for
  // a much more faithful capture.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
  const chunks: BlobPart[] = []
  // Prefer uncompressed PCM over the default (lossy Opus) — for a short,
  // personal-use recording, file size doesn't matter, but chord detection
  // accuracy is noticeably better without lossy compression in the way.
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=pcm') ? 'audio/webm;codecs=pcm' : undefined
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  recorder.start()

  function releaseStream() {
    stream.getTracks().forEach((track) => track.stop())
  }

  return {
    async stop() {
      recorder.stop()
      await stopped
      releaseStream()
      return new Blob(chunks, { type: recorder.mimeType })
    },
    cancel() {
      if (recorder.state !== 'inactive') recorder.stop()
      releaseStream()
    },
  }
}

/** Decodes a recorded audio blob to mono Float32 PCM at the given sample rate. */
export async function decodeToMonoPCM(blob: Blob, targetSampleRate: number): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    await audioCtx.close()
  }

  const mono = new Float32Array(decoded.length)
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch)
    for (let i = 0; i < decoded.length; i++) mono[i] += data[i] / decoded.numberOfChannels
  }

  if (decoded.sampleRate === targetSampleRate) return mono

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil((decoded.length * targetSampleRate) / decoded.sampleRate),
    targetSampleRate
  )
  const buffer = offlineCtx.createBuffer(1, decoded.length, decoded.sampleRate)
  buffer.copyToChannel(mono, 0)
  const source = offlineCtx.createBufferSource()
  source.buffer = buffer
  source.connect(offlineCtx.destination)
  source.start()
  const rendered = await offlineCtx.startRendering()
  return rendered.getChannelData(0).slice()
}
