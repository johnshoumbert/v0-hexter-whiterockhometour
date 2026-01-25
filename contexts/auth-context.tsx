"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"

interface User {
  id: number
  name: string
  email: string
  phone: string | null
  is_admin: boolean
  profile_image: string | null
  role?: string
  isEventAdmin?: boolean
  eventRole?: string // added eventRole property for staff portal access
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (emailOrPhone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: (eventId?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const refreshUser = async (eventId?: string) => {
    try {
      const url = eventId ? `/api/auth/me?eventId=${eventId}` : "/api/auth/me"
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 401) {
        setUser(null)
        if (isMounted && pathname && !["/login", "/register", "/", "/onboarding"].includes(pathname)) {
          const returnUrl = encodeURIComponent(pathname)
          router.push(`/login?redirect=${returnUrl}`)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
    refreshUser()
  }, [])

  // The session will be refreshed when needed (page load, user action)

  const login = async (emailOrPhone: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Login failed")
    }

    setUser(data.user)
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    if (isMounted) {
      router.push("/")
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
