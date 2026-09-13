import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: {
    default: "BoardingHub · Find a place. Feel at home.",
    template: "%s | BoardingHub",
  },
  description:
    "Discover reviewed boarding houses and manage your properties, rooms, and listings in one place.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        GeistMono.variable,
        "font-sans",
        GeistSans.variable
      )}
    >
      <body>
        <ThemeProvider defaultTheme="light">
          <a
            href="#main-content"
            className="sr-only fixed top-4 left-4 z-100 rounded-lg bg-primary p-3 text-white focus:not-sr-only"
          >
            Skip to content
          </a>
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
