'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { showSuccess, showInfo } from '../utils/swal'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isIOS, setIsIOS] = useState(false)

    // Initialize state based on install status
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window === 'undefined') return true
        return window.matchMedia('(display-mode: standalone)').matches
    })

    useEffect(() => {
        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
        setIsIOS(isIOSDevice)

        // Update install status for iOS
        if (isIOSDevice) {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            if (!isStandalone) {
                setIsInstalled(false)
            }
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsInstalled(false)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
            showSuccess('App installed successfully!')
        })

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstall = async () => {
        if (isIOS) {
            showInfo('To install on iOS: Tap the Share button (⎋) in Safari, then tap "Add to Home Screen"')
            return
        }

        if (!deferredPrompt) {
            showInfo('To install: Open the browser menu and look for "Install App" or "Add to Home Screen"')
            return
        }

        try {
            await deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice

            if (outcome === 'accepted') {
                setIsInstalled(true)
                showSuccess('App installed successfully!')
            }
            setDeferredPrompt(null)
        } catch (error) {
            console.error('Error installing app:', error)
        }
    }

    // Don't show button if app is already installed
    if (isInstalled) {
        return null
    }

    return (
        <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md active:scale-95"
            title="Install App"
        >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Install</span>
        </button>
    )
}
