'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * `beforeinstallprompt` is not in the TypeScript DOM lib because it is not a
 * cross-browser standard — Chromium fires it, Safari and Firefox do not.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari predates display-mode and reports installation via a
  // non-standard property on navigator.
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * Single source of truth for install state. Every consumer reads the same
 * captured prompt event, so the button and any other affordance cannot
 * disagree about whether the app is installable.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // Initialised lazily so the very first render is already correct on the
  // client. Under SSR/static export this is false, and the effect corrects it.
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setIsInstalled(detectStandalone())

    const onBeforeInstallPrompt = (e: Event) => {
      // Suppress the browser's own mini-infobar so the app can choose where
      // and when to offer installation.
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // The browser only fires this when the app is not installed, so an
      // earlier false positive from display-mode can be corrected here.
      setIsInstalled(false)
    }

    const onInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return 'unavailable'

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    // A prompt event can only be used once, whatever the outcome. Clearing it
    // unconditionally prevents a second call from prompting with a spent event.
    setDeferredPrompt(null)
    if (outcome === 'accepted') setIsInstalled(true)
    return outcome
  }, [deferredPrompt])

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    isIOS,
    install,
  }
}
