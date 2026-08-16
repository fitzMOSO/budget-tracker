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

        // `sw.js` is emitted by `workbox injectManifest` into `out/` during
        // `build:web`, so it does not exist under `next dev`. Registering it
        // there fetches the dev server's 404 HTML page, which the browser
        // rejects with "unsupported MIME type ('text/html')" on every load.
        // Tear down instead: a worker left registered by an earlier build keeps
        // serving cached assets on localhost and quietly defeats hot reload.
        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((reg) => reg.unregister())
            })
            caches?.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
            return
        }

        let registration: ServiceWorkerRegistration | undefined
        let intervalId: ReturnType<typeof setInterval> | undefined

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') registration?.update()
        }

        // Captured before registering: `sw.js` calls `clients.claim()` on
        // activate, and claiming a page that loaded uncontrolled fires
        // `controllerchange` on it. So a first-ever visit reaches the handler
        // below with nothing stale on the page — the assets it is already
        // showing ARE the ones the new worker just cached.
        //
        // Reloading there is not merely redundant: it is a visible reload for
        // every first-time visitor, and it destroyed Lighthouse's execution
        // context during the Netlify deploy audit, since headless Chrome is
        // permanently a first-time visitor.
        //
        // Same distinction the update prompt already draws below via
        // `navigator.serviceWorker.controller` — it just was never applied here.
        const hadController = Boolean(navigator.serviceWorker.controller)

        const onControllerChange = () => {
            // No previous controller means this is the initial claim, not a
            // version handover. Nothing to discard, so nothing to reload.
            if (!hadController) return
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
