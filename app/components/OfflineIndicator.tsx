'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
    // Starts false rather than reading navigator.onLine during render, so the
    // static export and the first client render agree; the effect corrects it.
    const [isOffline, setIsOffline] = useState(false)

    useEffect(() => {
        setIsOffline(!navigator.onLine)
        const goOffline = () => setIsOffline(true)
        const goOnline = () => setIsOffline(false)
        window.addEventListener('offline', goOffline)
        window.addEventListener('online', goOnline)
        return () => {
            window.removeEventListener('offline', goOffline)
            window.removeEventListener('online', goOnline)
        }
    }, [])

    if (!isOffline) return null

    // The copy reassures rather than warns: offline is a supported state for a
    // local-first app, not an error.
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed top-0 left-0 right-0 bg-slate-800 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 z-50"
        >
            <WifiOff className="w-4 h-4" />
            <span>Offline — your data is saved on this device.</span>
        </div>
    )
}
