const CACHE_NAME = 'budget-tracker-v1'
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS)
        })
    )
    self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            )
        })
    )
    self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return

    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) return

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response before caching
                const responseClone = response.clone()

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone)
                    })
                }

                return response
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse
                    }

                    // Return offline fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/')
                    }

                    return new Response('Offline', { status: 503 })
                })
            })
    )
})

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData())
    }
})

async function syncData() {
    // Placeholder for future offline sync functionality
    console.log('Background sync triggered')
}

// Handle push notifications (placeholder for future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json()
        const options = {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/android-launchericon-72-72.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/',
            },
        }
        event.waitUntil(
            self.registration.showNotification(data.title || 'Budget Tracker', options)
        )
    }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    )
})
