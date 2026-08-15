import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * `app/sw.js` runs in a ServiceWorkerGlobalScope and cannot export anything —
 * workbox-cli's injectManifest substitutes a token but does not bundle, so the
 * file must stay import/export free. To test the real shipped logic rather than
 * a copy of it, we extract the `documentKeyFor` declaration from the source and
 * evaluate just that function. If the function is renamed or removed, this test
 * fails loudly instead of silently testing nothing.
 */
function loadDocumentKeyFor(): (url: string) => string {
  const source = readFileSync(
    path.resolve(__dirname, '..', 'sw.js'),
    'utf8'
  )
  const match = source.match(/function documentKeyFor\(url\) \{[\s\S]*?\n\}/)
  if (!match) {
    throw new Error('documentKeyFor not found in app/sw.js')
  }
  // eslint-disable-next-line no-new-func
  return new Function(`${match[0]}; return documentKeyFor`)()
}

describe('documentKeyFor', () => {
  const documentKeyFor = loadDocumentKeyFor()
  const at = (p: string) => documentKeyFor(`https://example.com${p}`)

  it('maps the root to the root precache key', () => {
    expect(at('/')).toBe('/')
  })

  it('maps a route to its extensionless precache key', () => {
    expect(at('/expenses')).toBe('/expenses')
    expect(at('/credit-cards')).toBe('/credit-cards')
  })

  it('strips a trailing slash so /expenses/ hits the same entry', () => {
    expect(at('/expenses/')).toBe('/expenses')
  })

  it('normalises an explicit .html URL to the extensionless key', () => {
    // Hosts 301 /expenses.html -> /expenses; if a user lands on the .html form
    // directly we must still resolve it to the precached entry.
    expect(at('/expenses.html')).toBe('/expenses')
  })

  it('normalises /index.html to the root key', () => {
    expect(at('/index.html')).toBe('/')
  })

  it('ignores query strings and hashes, which are not part of the key', () => {
    expect(at('/quick-add?type=expense')).toBe('/quick-add')
    expect(at('/quick-add#top')).toBe('/quick-add')
  })

  it('returns a key that is not precached for unknown routes', () => {
    // The worker falls back to '/' when the key misses; the mapping itself
    // stays honest and does not invent a match.
    expect(at('/does-not-exist')).toBe('/does-not-exist')
  })
})
