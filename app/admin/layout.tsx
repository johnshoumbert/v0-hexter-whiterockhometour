"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { requestCache } from "@/lib/request-cache"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) {
        return
      }

      if (!user) {
        console.log("[v0] User not logged in, redirecting to home")
        router.push("/")
        return
      }

      try {
        const cacheKey = `admin-check-${user.id}`

        const data = await requestCache.fetch(
          cacheKey,
          async () => {
            const response = await fetch("/api/auth/check-admin")
            return response.json()
          },
          60000, // Cache for 1 minute
        )

        console.log("[v0] Admin check result:", data)
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error("[v0] Failed to check admin access:", error)
        setIsAdmin(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAdminAccess()
  }, [user, authLoading, router])

  if (authLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    )
  }

  if (user && isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="max-w-md text-center space-y-4 p-8 bg-background rounded-lg border shadow-sm">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to access the admin panel for this event.</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] lg:pt-12">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/30 pt-4">{children}</main>
    </div>
  )
}
