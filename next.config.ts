import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  // Static export: this is a local-first app with no server component to its
  // data model, so every route is a static document and the service worker can
  // precache the whole site. (This originally existed to feed Capacitor's
  // webDir; Capacitor has since been removed, but the choice still stands.)
  output: 'export',
  // Surfaced in the Settings > About card so the displayed version cannot
  // drift from the real one.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Disable Next.js Image Optimization for static export builds
  images: {
    unoptimized: true,
  },
  // Note: headers() is not supported with output: 'export'. Cache headers should be
  // configured at the server level (e.g., .vercel/config.json for Vercel, or netlify.toml for Netlify).
  // For PWA cache control, configure headers in your deployment platform instead.

  // Note: Next 16 uses Turbopack by default for dev. Avoid adding a custom `webpack` function
  // here unless you intend to use webpack. If you experience unreliable file-watch events
  // on Windows or network drives, prefer setting polling via environment variables (see README).
  allowedDevOrigins: ['https://*.cloudworkstations.dev'],
};

export default nextConfig;
