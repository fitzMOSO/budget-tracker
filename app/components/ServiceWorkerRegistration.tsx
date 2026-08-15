'use client'

import { useEffect, useRef, useState } from 'react'
import { UpdatePrompt } from './UpdatePrompt'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function ServiceWorkerRegistration() {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
    const [dismissed, setDismissed] = useState(false)
    // A ref, not a local `let`: the previous version reset its guard on every
    // effect run, so a controllerchange could trigger repeated reloads.
    const reloadingRef = useRef(false)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        let registration: ServiceWorkerRegistration | undefined
        let intervalId: ReturnType<typeof setInterval> | undefined

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') registration?.update()
        }

        const onControllerChange = () => {
            if (reloadingRef.current) return
            reloadingRef.current = true
            window.location.reload()
        }

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

        navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
                registration = reg

                // The controller check matters: without it, the very first
                // install (where there is no previous version to replace)
                // would announce an "update" to a first-time visitor.
                if (reg.waiting && navigator.serviceWorker.controller) {
                    setWaitingWorker(reg.waiting)
                }

                reg.addEventListener('updatefound', () => {
                    const installing = reg.installing
                    if (!installing) return
                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            setWaitingWorker(installing)
                            setDismissed(false)
                        }
                    })
                })

                intervalId = setInterval(() => reg.update(), UPDATE_CHECK_INTERVAL_MS)
                document.addEventListener('visibilitychange', onVisibilityChange)
            })
            .catch((error) => {
                console.error('Service worker registration failed:', error)
            })

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
            document.removeEventListener('visibilitychange', onVisibilityChange)
            if (intervalId) clearInterval(intervalId)
        }
    }, [])

    if (!waitingWorker || dismissed) return null

    return (
        <UpdatePrompt
            onUpdate={() => waitingWorker.postMessage({ type: 'SKIP_WAITING' })}
            onDismiss={() => setDismissed(true)}
        />
    )
}
