import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BudgetProvider } from "./context/BudgetContext"
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration"
import { OfflineIndicator } from "./components/OfflineIndicator"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
  viewportFit: 'cover',
}

/**
 * The deployed origin.
 *
 * `metadataBase` is what lets every relative URL below resolve to an absolute
 * one. Without it Next emits the paths as-is, and `og:image` must be absolute —
 * crawlers drop a relative value silently rather than resolving it against the
 * page, so the card renders with no thumbnail and nothing warns you. Next does
 * log a build-time warning for a missing metadataBase, but it is easy to miss
 * in a passing build.
 *
 * Hardcoded rather than read from an env var because this is a static export
 * (`output: 'export'`) — the value is baked into the HTML at build time either
 * way, so an env var would add indirection without adding flexibility.
 */
const SITE_URL = "https://kaching-tracker.fitzdev.studio"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Budget Tracker - Personal Finance Manager",
  description: "Track your income, expenses, bills, and credit cards with the 50/30/20 budget rule",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  /*
   * Link preview card. The image is generated in the portfolio repo
   * (`frontend/scripts/generate-og.mjs`) and copied here as `public/og.png`,
   * so every FitzDev property shares one visual system instead of drifting.
   *
   * 1200x630 is the one size that renders large on Facebook, LinkedIn, Slack
   * and iMessage alike; anything under 600 wide is treated as a small
   * thumbnail. PNG, not the WebP/AVIF this app otherwise prefers — several
   * major crawlers still do not decode either for og:image.
   */
  openGraph: {
    type: "website",
    siteName: "FitzDev Studio",
    url: "/",
    title: "Kaching — Budget Tracker",
    description:
      "A local-first personal finance app built on the 50/30/20 rule. Installs like a native app and works completely offline.",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Kaching Budget Tracker — a local-first personal finance app by FitzDev Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaching — Budget Tracker",
    description:
      "A local-first personal finance app built on the 50/30/20 rule. Installs like a native app and works completely offline.",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Budget Tracker",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Budget Tracker" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} antialiased font-sans`}>
        <OfflineIndicator />
        <BudgetProvider>{children}</BudgetProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
