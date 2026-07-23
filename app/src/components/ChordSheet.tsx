import { useMemo } from 'react'
import { ChordProParser, HtmlDivFormatter } from 'chordsheetjs'
import DOMPurify from 'dompurify'
import './ChordSheet.css'

export function ChordSheet({ body }: { body: string }) {
  const html = useMemo(() => {
    try {
      const song = new ChordProParser().parse(body)
      const rendered = new HtmlDivFormatter().format(song)
      return DOMPurify.sanitize(rendered)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return DOMPurify.sanitize(`<p class="chord-sheet-error">Couldn't render this song: ${message}</p>`)
    }
  }, [body])

  // chordsheetjs doesn't escape lyric/title text, so pasted chart content is
  // sanitized before being injected as HTML.
  return <div className="chord-sheet-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
}
