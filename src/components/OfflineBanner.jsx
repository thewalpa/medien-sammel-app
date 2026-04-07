import React, { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onOnline = () => { setOnline(true); setShow(true); setTimeout(() => setShow(false), 3000) }
    const onOffline = () => { setOnline(false); setShow(true) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!show) return null

  return (
    <div className={'offline-toast ' + (online ? 'online' : 'offline')}>
      {online ? '✓ Back online' : '⚡ You are offline — changes are saved locally'}
    </div>
  )
}
