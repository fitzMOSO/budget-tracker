const fs = require('fs')
const path = require('path')

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return
    const stat = fs.statSync(src)
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
        for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dest, entry))
        }
    } else {
        const dir = path.dirname(dest)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.copyFileSync(src, dest)
    }
}

function ensureEmptyDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true })
    }
    fs.mkdirSync(dir, { recursive: true })
}

function main() {
    const root = process.cwd()
    const nextAppDir = path.join(root, '.next', 'server', 'app')
    const nextStaticDir = path.join(root, '.next', 'static')
    const outDir = path.join(root, 'out')
    const publicDir = path.join(root, 'public')

    ensureEmptyDir(outDir)

    if (!fs.existsSync(nextAppDir)) {
        console.error('No static app files found at', nextAppDir)
        process.exit(1)
    }

    // Copy HTML pages: map name.html -> /name/index.html (index.html stays root)
    for (const file of fs.readdirSync(nextAppDir)) {
        const full = path.join(nextAppDir, file)
        const stat = fs.statSync(full)
        if (!stat.isFile()) continue
        if (file.endsWith('.html')) {
            const base = file.replace(/\.html$/, '')
            if (base === 'index') {
                fs.copyFileSync(full, path.join(outDir, 'index.html'))
            } else {
                const destDir = path.join(outDir, base)
                fs.mkdirSync(destDir, { recursive: true })
                fs.copyFileSync(full, path.join(destDir, 'index.html'))
            }
        }
    }

    // Copy _next static assets
    const destStatic = path.join(outDir, '_next', 'static')
    copyRecursive(nextStaticDir, destStatic)

    // Copy public/ into out/ so files like _headers, manifest.json, sw.js are preserved
    if (fs.existsSync(publicDir)) {
        for (const entry of fs.readdirSync(publicDir)) {
            copyRecursive(path.join(publicDir, entry), path.join(outDir, entry))
        }
    }

    // Try to copy a favicon if present in the app folder
    const faviconCandidates = fs.readdirSync(nextAppDir).filter(f => f.toLowerCase().startsWith('favicon'))
    if (faviconCandidates.length) {
        const fav = path.join(nextAppDir, faviconCandidates[0])
        if (fs.statSync(fav).isFile()) {
            const favDest = path.join(outDir, 'favicon.ico')
            fs.copyFileSync(fav, favDest)
        }
    }

    console.log('Static export assembled into:', outDir)
}

main()
