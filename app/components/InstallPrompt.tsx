'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        if (isStandalone) return

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
        setIsIOS(isIOSDevice)

        // Check if prompt was dismissed recently
        const dismissedAt = localStorage.getItem('pwa-prompt-dismissed')
        if (dismissedAt) {
            const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
            if (daysSinceDismissed < 7) return // Don't show for 7 days after dismissal
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            // Show prompt after a delay
            setTimeout(() => setShowPrompt(true), 3000)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Show iOS instructions after delay
        if (isIOSDevice) {
            setTimeout(() => setShowPrompt(true), 5000)
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setShowPrompt(false)
        }
        setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setShowPrompt(false)
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    }

    if (!showPrompt) return null

    return (
        <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-4 text-white max-w-md mx-auto">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                        <Download className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">Install Budget Tracker</h3>
                        {isIOS ? (
                            <p className="text-sm text-blue-100 mt-1">
                                Tap <span className="inline-flex items-center px-1 bg-white/20 rounded">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                                    </svg>
                                </span> then &quot;Add to Home Screen&quot;
                            </p>
                        ) : (
                            <p className="text-sm text-blue-100 mt-1">
                                Add to your home screen for quick access and offline use
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!isIOS && deferredPrompt && (
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 px-4 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            Not now
                        </button>
                        <button
                            onClick={handleInstall}
                            className="flex-1 px-4 py-2 text-sm font-medium bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Install
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
