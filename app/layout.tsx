import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: "Portfolio Backtester",
  description: "Advanced portfolio backtesting and analysis tool",
  icons: {
    icon: "/favicon.ico",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  )
}
