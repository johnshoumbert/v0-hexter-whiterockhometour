"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdministrationSidebar } from "@/components/administration-sidebar"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Skip auth check for login page
      if (pathname === "/admin/login") {
        setIsChecking(false)
        return
      }

      const token = localStorage.getItem("admin_session")
      if (!token) {
        router.push("/admin/login")
        return
      }

      try {
        // Verify the token is valid
        const response = await fetch("/api/admin/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem("admin_session")
          router.push("/admin/login")
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error("[v0] Failed to verify admin access:", error)
        localStorage.removeItem("admin_session")
        router.push("/admin/login")
      } finally {
        setIsChecking(false)
      }
    }

    checkAdminAccess()
  }, [pathname, router])

  // Don't show loading for login page
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="max-w-md text-center space-y-4 p-8 bg-background rounded-lg border shadow-sm">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to access the admin panel.</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AdministrationSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
    </div>
  )
}
