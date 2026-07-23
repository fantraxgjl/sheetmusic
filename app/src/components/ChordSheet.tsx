import { useMemo } from 'react'
import { ChordProParser, HtmlDivFormatter } from 'chordsheetjs'
import DOMPurify from 'dompurify'
import './ChordSheet.css'

export function ChordSheet({ body, transposeSemitones = 0 }: { body: string; transposeSemitones?: number }) {
  const html = useMemo(() => {
    try {
      const song = new ChordProParser().parse(body)
      const displayed = transposeSemitones ? song.transpose(transposeSemitones) : song
      const rendered = new HtmlDivFormatter().format(displayed)
      return DOMPurify.sanitize(rendered)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return DOMPurify.sanitize(`<p class="chord-sheet-error">Couldn't render this song: ${message}</p>`)
    }
  }, [body, transposeSemitones])

  // chordsheetjs doesn't escape lyric/title text, so pasted chart content is
  // sanitized before being injected as HTML.
  return <div className="chord-sheet-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
}
