/**
 * Generates the Kaching icon set from one geometry definition.
 *
 * Three tile forms, because the platforms want different things:
 *   rounded    — the app icon as designed. Favicon, PWA "any" icons.
 *   full-bleed — no corner radius, no transparency. iOS applies its OWN
 *                squircle mask to apple-touch-icon; hand it a pre-rounded PNG
 *                and the transparent corners composite to black.
 *   maskable   — full-bleed, glyph shrunk into the safe zone (the centre 80%
 *                circle). Android crops this to whatever shape the launcher
 *                uses, so anything outside that circle can be cut off.
 */
// Requires sharp, which is NOT a dependency of this app — it is only needed to
// regenerate icons, which happens roughly never. Temp-install it to run:
//   npm i -D sharp --no-save && node scripts/generate-icons.mjs . && rm -rf node_modules/sharp
// `rm -rf` rather than `npm uninstall`: uninstall rewrites package.json even
// when the install was --no-save, re-sorting unrelated dependencies into a diff
// you did not ask for.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'

const OUT = process.argv[2]
if (!OUT) throw new Error('usage: gen-kaching.mjs <repo-root>')

/**
 * The mark: a geometric K whose upper arm launches a gold coin — the "kaching".
 * Tile gradient is the app's own `--gradient-primary` at 135deg; the coin is
 * `--warning-500`'s brighter neighbour, the only warm note in an otherwise
 * entirely blue palette, which is what makes it read at 16px.
 *
 * The K is masked with a disc slightly larger than the coin, so a ring of tile
 * shows between arm and coin. Without that gap the coin reads as a lollipop
 * head welded to the arm rather than an object in flight.
 */
function svg({ radius = 115, scale = 1 } = {}) {
  const c = 256 - 256 * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="0.5" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <mask id="gap">
      <rect width="512" height="512" fill="#ffffff"/>
      <circle cx="312" cy="138" r="62" fill="#000000"/>
    </mask>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#tile)"/>
  <rect width="512" height="512" rx="${radius}" fill="url(#sheen)"/>
  <g transform="translate(${c},${c}) scale(${scale})">
    <g transform="translate(15,10)">
      <g stroke="#ffffff" stroke-linecap="round" fill="none" mask="url(#gap)">
        <path d="M144 140 V372" stroke-width="48"/>
        <path d="M162 266 L284 160" stroke-width="46"/>
        <path d="M162 266 L296 374" stroke-width="46"/>
      </g>
      <circle cx="312" cy="138" r="50" fill="#fbbf24"/>
    </g>
  </g>
</svg>
`
}

const rounded = svg()
const bleed = svg({ radius: 0 })
const maskable = svg({ radius: 0, scale: 0.62 })

const png = (src, size) =>
  sharp(Buffer.from(src), { density: 900 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer()

/** Minimal ICO container. Every entry is a whole PNG (valid since Vista). */
function ico(images) {
  const dir = Buffer.alloc(6 + 16 * images.length)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(images.length, 4)
  let offset = dir.length
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    dir.writeUInt8(size >= 256 ? 0 : size, e)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)
    dir.writeUInt8(0, e + 2)
    dir.writeUInt8(0, e + 3)
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([dir, ...images.map((i) => i.data)])
}

mkdirSync(join(OUT, 'public/icons'), { recursive: true })

writeFileSync(join(OUT, 'public/icon.svg'), rounded)
writeFileSync(join(OUT, 'public/favicon.png'), await png(rounded, 32))
writeFileSync(join(OUT, 'public/icons/icon-192.png'), await png(rounded, 192))
writeFileSync(join(OUT, 'public/icons/icon-512.png'), await png(rounded, 512))
writeFileSync(join(OUT, 'public/icons/icon-maskable-512.png'), await png(maskable, 512))
writeFileSync(join(OUT, 'public/icons/apple-touch-icon.png'), await png(bleed, 180))

const icoSizes = [16, 32, 48]
writeFileSync(
  join(OUT, 'app/favicon.ico'),
  ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(rounded, size) })))),
)

console.log('kaching icons written to', OUT)
