import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { OfflineIndicator } from '../OfflineIndicator'

function setOnline(value: boolean) {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('OfflineIndicator', () => {
    it('renders nothing while online', () => {
        setOnline(true)
        const { container } = render(<OfflineIndicator />)
        expect(container).toBeEmptyDOMElement()
    })

    it('announces offline state when starting offline', () => {
        setOnline(false)
        render(<OfflineIndicator />)
        expect(screen.getByRole('status')).toHaveTextContent(/offline/i)
    })

    it('reassures rather than warns, because offline is a supported state', () => {
        setOnline(false)
        render(<OfflineIndicator />)
        expect(screen.getByRole('status')).toHaveTextContent(/saved on this device/i)
    })

    it('appears and disappears as connectivity changes', () => {
        setOnline(true)
        render(<OfflineIndicator />)
        expect(screen.queryByRole('status')).toBeNull()

        act(() => {
            setOnline(false)
            window.dispatchEvent(new Event('offline'))
        })
        expect(screen.getByRole('status')).toBeInTheDocument()

        act(() => {
            setOnline(true)
            window.dispatchEvent(new Event('online'))
        })
        expect(screen.queryByRole('status')).toBeNull()
    })

    it('unsubscribes on unmount', () => {
        setOnline(true)
        const remove = vi.spyOn(window, 'removeEventListener')
        const { unmount } = render(<OfflineIndicator />)
        unmount()

        const removed = remove.mock.calls.map((c) => c[0])
        expect(removed).toContain('online')
        expect(removed).toContain('offline')
    })
})
