import { useEffect, useState } from 'react'

/** Tracks navigator.onLine — the only network-dependent feature in this app is online lyrics lookup; everything else (library, viewer, recording, play mode) works fully offline. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
