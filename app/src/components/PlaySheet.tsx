import { useEffect, useMemo, useRef } from 'react'
import { ChordLyricsPair, ChordProParser } from 'chordsheetjs'
import './PlaySheet.css'

export function PlaySheet({
  body,
  currentIndex,
  transposeSemitones = 0,
}: {
  body: string
  currentIndex: number
  transposeSemitones?: number
}) {
  const song = useMemo(() => {
    const parsed = new ChordProParser().parse(body)
    return transposeSemitones ? parsed.transpose(transposeSemitones) : parsed
  }, [body, transposeSemitones])
  const currentRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex])

  let seqIndex = 0

  return (
    <div className="play-sheet">
      {song.lines.map((line, lineIdx) => {
        const pairs = line.items.filter((item): item is ChordLyricsPair => item instanceof ChordLyricsPair)
        if (pairs.length === 0) return null

        return (
          <div className="play-row" key={lineIdx}>
            {pairs.map((pair, pairIdx) => {
              const hasChord = pair.chords.trim() !== ''
              const myIndex = hasChord ? seqIndex++ : null
              const isCurrent = myIndex !== null && myIndex === currentIndex
              return (
                <span
                  className={`play-pair${isCurrent ? ' current' : ''}`}
                  key={pairIdx}
                  ref={isCurrent ? currentRef : undefined}
                >
                  <span className="play-chord">{pair.chords}</span>
                  <span className="play-lyrics">{pair.lyrics}</span>
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
