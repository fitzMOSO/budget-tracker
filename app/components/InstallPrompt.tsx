'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const [platformInstructions, setPlatformInstructions] = useState<'android' | 'ios' | null>(null)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const checkInstalled = () => {
            const standalone = window.matchMedia('(display-mode: standalone)').matches
            setIsInstalled(standalone)
        }

        checkInstalled()

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt()
                const { outcome } = await deferredPrompt.userChoice
                if (outcome === 'accepted') {
                    setIsInstalled(true)
                }
            } catch (err) {
                console.error('Install prompt failed:', err)
            } finally {
                setDeferredPrompt(null)
            }
            return
        }

        setShowInstructions((s) => !s)
    }

    const handlePlatformClick = async (platform: 'android' | 'ios') => {
        // Try to use the deferred prompt if available (works on supported Android browsers)
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt()
                const { outcome } = await deferredPrompt.userChoice
                if (outcome === 'accepted') setIsInstalled(true)
            } catch (err) {
                console.error('Install prompt failed:', err)
            } finally {
                setDeferredPrompt(null)
            }
            return
        }

        // If a store URL is configured via env, open it
        const envKey = platform === 'android' ? process.env.NEXT_PUBLIC_ANDROID_URL : process.env.NEXT_PUBLIC_IOS_URL
        if (envKey) {
            try {
                window.open(envKey, '_blank')
                // After opening the store, show instructions so user can confirm installation
                setPlatformInstructions(platform)
                setShowInstructions(true)
                return
            } catch (e) {
                console.error('Failed opening store URL', e)
            }
        }

        // Fallback: show platform-specific manual instructions
        setPlatformInstructions(platform)
        setShowInstructions(true)
    }

    if (isInstalled) return null

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="flex items-center gap-3 bg-white/95 border border-gray-200 shadow-md rounded-lg p-2">
                <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    title="Install app"
                >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Install</span>
                </button>

                <button
                    onClick={() => handlePlatformClick('android')}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
                    title="Install on Android"
                >
                    🤖 Android
                </button>

                <button
                    onClick={() => handlePlatformClick('ios')}
                    className="px-3 py-2 bg-black text-white rounded-md hover:opacity-90 transition text-sm"
                    title="Install on iOS"
                >
                     iOS
                </button>

                <button
                    onClick={() => { setShowInstructions((s) => !s); setPlatformInstructions(null) }}
                    className="px-2 py-1 text-xs text-gray-700 hover:underline"
                >
                    {showInstructions ? 'Hide' : 'How'}
                </button>
            </div>

            {showInstructions && (
                <div className="mt-2 max-w-xs bg-white border border-gray-200 shadow-sm rounded-md p-3 text-sm text-gray-800">
                    <p className="font-medium mb-2">Manual install</p>
                    {platformInstructions === 'android' && (
                        <>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Open Chrome menu (⋮)</li>
                                <li>Choose "Install app" or "Add to Home screen"</li>
                                <li>Confirm and add to your home screen</li>
                            </ol>
                        </>
                    )}

                    {platformInstructions === 'ios' && (
                        <>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Open Safari's share menu (the square + arrow)</li>
                                <li>Tap "Add to Home Screen"</li>
                                <li>Confirm to add the icon to your home screen</li>
                            </ol>
                        </>
                    )}

                    {!platformInstructions && (
                        <>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Open your browser menu (⋮ or ⋯)</li>
                                <li>Choose "Install app" or "Add to Home screen"</li>
                                <li>Follow the browser prompts to add the app</li>
                            </ol>
                            <p className="mt-2 text-xs text-gray-500">If you recently uninstalled the app, the browser may block the native prompt—use the manual steps above.</p>
                        </>
                    )}

                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={() => {
                                setIsInstalled(true)
                                setShowInstructions(false)
                                setPlatformInstructions(null)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                        >
                            I've installed
                        </button>

                        <button
                            onClick={() => {
                                setShowInstructions(false)
                                setPlatformInstructions(null)
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
