'use client'

import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(onChange: () => void) {
    window.addEventListener('online', onChange)
    window.addEventListener('offline', onChange)
    return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
    }
}

const getSnapshot = () => navigator.onLine
// The static export has no notion of connectivity; assume online so the
// prerendered markup matches the first client render and nothing flashes.
const getServerSnapshot = () => true

export function OfflineIndicator() {
    // useSyncExternalStore rather than useState + useEffect: connectivity is
    // external browser state, and subscribing to it directly avoids setting
    // state during an effect (which triggers a cascading render).
    const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    if (isOnline) return null

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
