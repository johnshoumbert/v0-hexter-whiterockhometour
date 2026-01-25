"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft } from "lucide-react"

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isStaff, setIsStaff] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkStaffAccess = async () => {
      if (authLoading) {
        return
      }

      if (!user) {
        router.push("/")
        return
      }

      if (user.eventRole === "staff" || user.isEventAdmin || user.is_admin) {
        setIsStaff(true)
        setIsChecking(false)
      } else {
        setIsStaff(false)
        setIsChecking(false)
      }
    }

    checkStaffAccess()
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

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="max-w-md text-center space-y-4 p-8 bg-background rounded-lg border shadow-sm">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have staff access for this event.</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pt-24 bg-muted/30">
      <div className="border-b bg-background sticky top-24 z-40">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
