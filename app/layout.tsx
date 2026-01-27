import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BudgetProvider } from "./context/BudgetContext"
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration"
import { InstallPrompt } from "./components/InstallPrompt"
import { WidgetHelper } from "./components/WidgetHelper"

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

export const metadata: Metadata = {
  title: "Budget Tracker - Personal Finance Manager",
  description: "Track your income, expenses, bills, and credit cards with the 50/30/20 budget rule",
  manifest: "/manifest.json",
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
        <link rel="mask-icon" href="/icons/icon-512.png" color="#3b82f6" />
      </head>
      <body className={`${inter.variable} antialiased font-sans`}>
        <BudgetProvider>{children}</BudgetProvider>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <WidgetHelper />
      </body>
    </html>
  )
}
