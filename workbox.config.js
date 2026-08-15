module.exports = {
  globDirectory: 'out',
  globPatterns: ['**/*.{html,js,css,png,svg,ico,json,woff,woff2}'],
  // sw.js is the output itself; _headers is Netlify config; .txt files are
  // per-route RSC payloads that are not needed for offline navigation.
  // 404.html is excluded deliberately: '/404' is not guaranteed to resolve on
  // every static host, and a single failed URL rejects the whole cache.addAll
  // and aborts the install. '/' is the offline fallback instead.
  globIgnores: ['sw.js', '_headers', '404.html', '**/*.txt'],
  modifyURLPrefix: { '': '/' },
  // Next's static export writes flat files ('expenses.html'), but both `serve`
  // and Netlify's Pretty URLs 301 those to the extensionless form. Precaching
  // the '.html' URL would therefore store a *redirected* response, and serving
  // a redirected response for a navigation request throws "a redirected
  // response was used for a request whose redirect mode is not 'follow'".
  // Rewrite to the URLs the hosts actually serve, so precache keys match the
  // navigation request URL exactly and no redirect is ever followed.
  manifestTransforms: [
    (entries) => ({
      manifest: entries.map((entry) =>
        entry.url.endsWith('.html')
          ? {
              ...entry,
              url:
                entry.url === '/index.html'
                  ? '/'
                  : entry.url.slice(0, -'.html'.length),
            }
          : entry
      ),
      warnings: [],
    }),
  ],
  dontCacheBustURLsMatching: /^\/_next\/static\//,
  swSrc: 'app/sw.js',
  swDest: 'out/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
}
