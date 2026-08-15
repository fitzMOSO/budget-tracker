import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration'

/**
 * Regression guard for the dev-mode registration failure.
 *
 * `sw.js` is emitted by `workbox injectManifest` into `out/` during
 * `build:web`. It does not exist under `next dev`, so registering it there
 * makes the browser fetch the dev server's 404 HTML page and reject it with
 * "The script has an unsupported MIME type ('text/html')" on every load.
 */

function mockServiceWorkerContainer(registrations: Array<{ unregister: () => Promise<boolean> }> = []) {
    const register = vi.fn().mockResolvedValue({
        waiting: null,
        installing: null,
        addEventListener: vi.fn(),
        update: vi.fn(),
    })
    const getRegistrations = vi.fn().mockResolvedValue(registrations)

    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
            register,
            getRegistrations,
            controller: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        },
    })

    return { register, getRegistrations }
}

describe('ServiceWorkerRegistration', () => {
    beforeEach(() => {
        vi.stubGlobal('caches', {
            keys: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(true),
        })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('does not register the service worker outside production', async () => {
        vi.stubEnv('NODE_ENV', 'development')
        const { register } = mockServiceWorkerContainer()

        render(<ServiceWorkerRegistration />)

        // Give the effect's async work a chance to run before asserting absence.
        await waitFor(() => expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled())
        expect(register).not.toHaveBeenCalled()
    })

    it('unregisters a stale worker left over from a previous build in dev', async () => {
        vi.stubEnv('NODE_ENV', 'development')
        const unregister = vi.fn().mockResolvedValue(true)
        mockServiceWorkerContainer([{ unregister }])

        render(<ServiceWorkerRegistration />)

        await waitFor(() => expect(unregister).toHaveBeenCalled())
    })

    it('registers the service worker in production', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const { register } = mockServiceWorkerContainer()

        render(<ServiceWorkerRegistration />)

        await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'))
    })
})
