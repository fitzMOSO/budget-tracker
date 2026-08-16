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
 * The deployed origin. `metadataBase` is what resolves the relative `/og.png`
 * below into the absolute URL crawlers require; without it the link-preview
 * card silently loses its image.
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
  // Link preview card. 1200x630 PNG: smaller renders as a thumbnail, and
  // several major crawlers still can't decode WebP/AVIF for og:image.
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
