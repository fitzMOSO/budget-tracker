'use client'

import { Download } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { showSuccess, showInfo } from '../utils/swal'

export function InstallButton() {
    const { canInstall, isInstalled, isIOS, install } = useInstallPrompt()

    // The button is shown only when it can actually do something: either the
    // browser has offered an install prompt, or we are on iOS where the user
    // must be walked through the Share-sheet flow manually. Previously it was
    // shown whenever the app was not installed, so on unsupported browsers it
    // rendered a button whose only outcome was an apology.
    if (isInstalled || (!canInstall && !isIOS)) return null

    const handleInstall = async () => {
        if (isIOS) {
            showInfo('To install on iOS: tap the Share button in Safari, then "Add to Home Screen".')
            return
        }

        const outcome = await install()
        if (outcome === 'accepted') {
            showSuccess('App installed successfully!')
        } else if (outcome === 'unavailable') {
            showInfo('To install: open the browser menu and choose "Install App" or "Add to Home Screen".')
        }
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
