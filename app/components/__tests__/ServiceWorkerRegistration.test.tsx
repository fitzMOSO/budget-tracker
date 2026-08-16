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

function mockServiceWorkerContainer(
    registrations: Array<{ unregister: () => Promise<boolean> }> = [],
    { controller = null }: { controller?: object | null } = {}
) {
    const register = vi.fn().mockResolvedValue({
        waiting: null,
        installing: null,
        addEventListener: vi.fn(),
        update: vi.fn(),
    })
    const getRegistrations = vi.fn().mockResolvedValue(registrations)

    // Real listener bookkeeping rather than a bare `vi.fn()`: these tests need
    // to fire `controllerchange` the way the browser does, which means holding
    // the handler the component actually registered.
    const listeners = new Map<string, Set<EventListener>>()

    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
            register,
            getRegistrations,
            // `null` models a first-ever visit; a non-null value models a page
            // already controlled by a previous version of the worker.
            controller,
            addEventListener: vi.fn((type: string, fn: EventListener) => {
                if (!listeners.has(type)) listeners.set(type, new Set())
                listeners.get(type)!.add(fn)
            }),
            removeEventListener: vi.fn((type: string, fn: EventListener) => {
                listeners.get(type)?.delete(fn)
            }),
        },
    })

    const fireControllerChange = () => {
        listeners
            .get('controllerchange')
            ?.forEach((fn) => fn(new Event('controllerchange')))
    }

    return { register, getRegistrations, fireControllerChange }
}

/**
 * jsdom's `location.reload` is not writable, so spying on it fails — the whole
 * `location` object has to be swapped and put back.
 */
function mockReload() {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, reload },
    })
    return reload
}

describe('ServiceWorkerRegistration', () => {
    let originalLocation: PropertyDescriptor | undefined

    beforeEach(() => {
        originalLocation = Object.getOwnPropertyDescriptor(window, 'location')
        vi.stubGlobal('caches', {
            keys: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(true),
        })
    })

    afterEach(() => {
        if (originalLocation) {
            Object.defineProperty(window, 'location', originalLocation)
        }
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

    /**
     * The first-visit reload bug.
     *
     * `app/sw.js` calls `self.clients.claim()` on activate. Claiming a page that
     * loaded without a controller fires `controllerchange` on it — so on a first
     * ever visit the sequence is: register → install → activate → claim →
     * controllerchange. Reloading there throws away a page that is already
     * showing the newest assets, and every first-time visitor sees it.
     *
     * It also broke CI: headless Chrome is permanently a first-time visitor, so
     * `@netlify/plugin-lighthouse` navigated, got reloaded mid-audit, and failed
     * the deploy's plugin step with "Protocol error (Runtime.evaluate):
     * Execution context was destroyed."
     */
    it('does not reload when the first-ever worker claims the page', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const reload = mockReload()
        // No controller: this page was never controlled, so the claim that
        // follows activation is the initial install, not an update.
        const { register, fireControllerChange } = mockServiceWorkerContainer([], {
            controller: null,
        })

        render(<ServiceWorkerRegistration />)
        await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'))

        fireControllerChange()

        expect(reload).not.toHaveBeenCalled()
    })

    it('reloads when a new worker replaces the one already controlling the page', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const reload = mockReload()
        // A controller was already present, so this controllerchange is a real
        // version handover — the open page is running superseded assets.
        const { register, fireControllerChange } = mockServiceWorkerContainer([], {
            controller: {},
        })

        render(<ServiceWorkerRegistration />)
        await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'))

        fireControllerChange()

        expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads at most once even if controllerchange fires repeatedly', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const reload = mockReload()
        const { register, fireControllerChange } = mockServiceWorkerContainer([], {
            controller: {},
        })

        render(<ServiceWorkerRegistration />)
        await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'))

        fireControllerChange()
        fireControllerChange()
        fireControllerChange()

        expect(reload).toHaveBeenCalledTimes(1)
    })
})
