import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from '../useInstallPrompt'

function mockDisplayMode(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(display-mode: standalone)' ? standalone : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia
}

type MockPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function makePromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as MockPromptEvent
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}

describe('useInstallPrompt', () => {
  beforeEach(() => mockDisplayMode(false))

  it('reports installed when running standalone', () => {
    mockDisplayMode(true)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('becomes installable once beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)

    act(() => {
      window.dispatchEvent(makePromptEvent())
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('returns "unavailable" when install is called with no captured prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.install()
    })
    expect(outcome).toBe('unavailable')
  })

  it('resolves the browser choice and marks the app installed on accept', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const event = makePromptEvent('accepted')
    act(() => {
      window.dispatchEvent(event)
    })

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.install()
    })

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(outcome).toBe('accepted')
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('consumes the prompt on dismissal, since it cannot be reused', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      window.dispatchEvent(makePromptEvent('dismissed'))
    })

    let first: string | undefined
    await act(async () => {
      first = await result.current.install()
    })
    expect(first).toBe('dismissed')
    expect(result.current.isInstalled).toBe(false)

    // A beforeinstallprompt event can only be prompted once. A second call must
    // report 'unavailable' rather than re-prompting with a spent event.
    let second: string | undefined
    await act(async () => {
      second = await result.current.install()
    })
    expect(second).toBe('unavailable')
  })

  it('marks installed when the appinstalled event fires', () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      window.dispatchEvent(makePromptEvent())
    })
    expect(result.current.canInstall).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('removes its listeners on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useInstallPrompt())
    unmount()

    const removed = remove.mock.calls.map((c) => c[0])
    expect(removed).toContain('beforeinstallprompt')
    // The previous InstallButton registered 'appinstalled' without cleanup,
    // leaking a listener on every remount.
    expect(removed).toContain('appinstalled')
    remove.mockRestore()
  })
})
