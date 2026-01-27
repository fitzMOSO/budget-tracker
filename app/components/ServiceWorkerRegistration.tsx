'use client'

import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'

export function ServiceWorkerRegistration() {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
    const [showUpdateBanner, setShowUpdateBanner] = useState(false)

    useEffect(() => {
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered with scope:', registration.scope)

                    // Check if there's already a waiting worker
                    if (registration.waiting) {
                        setWaitingWorker(registration.waiting)
                        setShowUpdateBanner(true)
                    }

                    // Listen for new service worker updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New update available
                                    setWaitingWorker(newWorker)
                                    setShowUpdateBanner(true)
                                    showUpdateNotification(newWorker)
                                }
                            })
                        }
                    })

                    // Check for updates periodically
                    setInterval(() => {
                        registration.update()
                    }, 60 * 60 * 1000) // Check every hour

                    // Also check on visibility change (when user returns to app)
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') {
                            registration.update()
                        }
                    })
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error)
                })

            // Handle controller change (after skip waiting)
            let refreshing = false
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true
                    window.location.reload()
                }
            })
        }
    }, [])

    const showUpdateNotification = (worker: ServiceWorker) => {
        Swal.fire({
            title: 'Update Available!',
            text: 'A new version of Budget Tracker is available. Would you like to update now?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Update Now',
            cancelButtonText: 'Later',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: false,
        }).then((result) => {
            if (result.isConfirmed) {
                worker.postMessage({ type: 'SKIP_WAITING' })
            }
        })
    }

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' })
        }
    }

    // Show a persistent update banner as fallback
    if (showUpdateBanner && waitingWorker) {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 flex items-center justify-between z-9999 shadow-lg">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="font-medium">A new version is available!</span>
                </div>
                <button
                    onClick={handleUpdate}
                    className="bg-white text-blue-600 px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                    Update Now
                </button>
            </div>
        )
    }

    return null
}
