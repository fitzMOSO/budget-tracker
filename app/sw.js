// Precache manifest injected at build time by workbox-cli. Each entry is
// { url, revision }. workbox-cli only substitutes this token; it does not
// bundle, so this file must not import anything.
const MANIFEST = self.__WB_MANIFEST || []

// Derive a cache name from the manifest contents, so any content change
// produces a new cache and a clean full re-precache.
function hashManifest(entries) {
  const input = entries.map((e) => `${e.url}@${e.revision || ''}`).join('|')
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

const CACHE_PREFIX = 'bt-precache-'
const CACHE_NAME = CACHE_PREFIX + hashManifest(MANIFEST)
const PRECACHE_URLS = MANIFEST.map((e) => e.url)

// Map a navigation request to its precached document.
// The build step rewrites the flat export filenames ('expenses.html') to the
// extensionless URLs the host actually serves ('/expenses'), so a navigation's
// pathname IS its precache key. Only trailing slashes and an explicit '.html'
// suffix (which hosts redirect away from) need normalising.
function documentKeyFor(url) {
  let pathname = new URL(url).pathname
  if (pathname.endsWith('.html')) {
    pathname = pathname === '/index.html' ? '/' : pathname.slice(0, -5)
  }
  if (pathname.length > 1) pathname = pathname.replace(/\/$/, '')
  return pathname === '' ? '/' : pathname
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// The update flow depends on this listener. Its absence is why the previous
// implementation's "Update Now" button did nothing.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(documentKeyFor(request.url))
        if (cached) return cached
        try {
          return await fetch(request)
        } catch {
          // App-shell fallback: any uncached route resolves to the root
          // document, which boots the client router offline.
          return (await cache.match('/')) || Response.error()
        }
      })
    )
    return
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached
      try {
        return await fetch(request)
      } catch {
        return Response.error()
      }
    })
  )
})
