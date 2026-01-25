"use client"

import type React from "react"
import { UserSidebar } from "@/components/user-sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/user")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-20 lg:pt-6">
      <UserSidebar />

      <main className="flex-1 w-full lg:w-auto overflow-x-hidden">
        <div className="container mx-auto px-4 py-8 lg:px-8 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
