import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export static site for Capacitor by enabling `output: 'export'`.
  output: 'export',
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
