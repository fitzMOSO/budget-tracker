'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/**
 * `beforeinstallprompt` is not in the TypeScript DOM lib because it is not a
 * cross-browser standard — Chromium fires it, Safari and Firefox do not.
 */
export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

const STANDALONE_QUERY = '(display-mode: standalone)'

function subscribeDisplayMode(onChange: () => void) {
    const mql = window.matchMedia(STANDALONE_QUERY)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
}

function getStandaloneSnapshot(): boolean {
    if (window.matchMedia(STANDALONE_QUERY).matches) return true
    // iOS Safari predates display-mode and reports installation via a
    // non-standard property on navigator.
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

const subscribeNever = () => () => {}
const getIOSSnapshot = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const getFalseOnServer = () => false

/**
 * Single source of truth for install state. Every consumer reads the same
 * captured prompt event, so the button and any other affordance cannot
 * disagree about whether the app is installable.
 */
export function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    // Set from the appinstalled event and from an accepted prompt. Display-mode
    // does not flip until the installed window is opened, so this covers the
    // gap in the current tab.
    const [installedThisSession, setInstalledThisSession] = useState(false)

    // Read as external browser state rather than copied into state by an
    // effect, which would set state synchronously during the effect and
    // trigger a cascading render.
    const isIOS = useSyncExternalStore(subscribeNever, getIOSSnapshot, getFalseOnServer)
    const isStandalone = useSyncExternalStore(
        subscribeDisplayMode,
        getStandaloneSnapshot,
        getFalseOnServer
    )

    useEffect(() => {
        const onBeforeInstallPrompt = (e: Event) => {
            // Suppress the browser's own mini-infobar so the app can choose
            // where and when to offer installation.
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        const onInstalled = () => {
            setInstalledThisSession(true)
            setDeferredPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        window.addEventListener('appinstalled', onInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
            window.removeEventListener('appinstalled', onInstalled)
        }
    }, [])

    const isInstalled = isStandalone || installedThisSession

    const install = useCallback(async (): Promise<InstallOutcome> => {
        if (!deferredPrompt) return 'unavailable'

        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        // A prompt event can only be used once, whatever the outcome. Clearing
        // it unconditionally prevents a second call prompting with a spent event.
        setDeferredPrompt(null)
        if (outcome === 'accepted') setInstalledThisSession(true)
        return outcome
    }, [deferredPrompt])

    return {
        canInstall: deferredPrompt !== null && !isInstalled,
        isInstalled,
        isIOS,
        install,
    }
}
