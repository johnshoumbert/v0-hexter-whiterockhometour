"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { EventProvider } from "@/contexts/event-context"
import { EventThemeProvider } from "@/components/event-theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/navbar"
import { ScrollToTop } from "@/components/scroll-to-top"
import { CartPanel } from "@/components/cart-panel"
import { usePathname, useRouter } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"

function ComingSoonCheck({ children }: { children: React.ReactNode }) {
  const { event, isLoading: eventLoading } = useEvent()
  const { user, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Skip check for admin pages, coming-soon page, and login
    if (
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/administration") ||
      pathname === "/coming-soon" ||
      pathname === "/login" ||
      pathname?.startsWith("/kiosk") ||
      eventLoading ||
      authLoading ||
      !event
    ) {
      return
    }

    // Bypass coming soon check for super admins or event admins
    if (user?.is_admin || user?.role === "admin" || user?.isEventAdmin) {
      console.log("[v0] Admin user detected, bypassing coming-soon check")
      return
    }

    // Check if go live date is in the future
    if (event.go_live_date) {
      const now = new Date()
      const goLiveDate = new Date(event.go_live_date)

      // If go live date is in the future, redirect to coming soon
      if (goLiveDate > now) {
        console.log("[v0] Event not yet live, redirecting to coming-soon page")
        router.push("/coming-soon")
      }
    }
  }, [event, eventLoading, user, authLoading, pathname, router])

  return <>{children}</>
}
// </CHANGE>

function KioskAwareContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isKioskMode = pathname?.startsWith("/kiosk")

  return <div className={isKioskMode ? "" : "pt-16"}>{children}</div>
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <EventProvider>
        <EventThemeProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthProvider>
              <ComingSoonCheck>
                <ScrollToTop />
                <Navbar />
                <KioskAwareContent>{children}</KioskAwareContent>
                <Toaster />
                <CartPanel />
              </ComingSoonCheck>
            </AuthProvider>
          </ThemeProvider>
        </EventThemeProvider>
      </EventProvider>
      <Analytics />
    </>
  )
}
