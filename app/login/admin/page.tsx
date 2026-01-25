"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Shield, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AdminLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    console.log("[v0] Admin login attempt for:", formData.emailOrPhone)

    try {
      // First, login the user
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: formData.emailOrPhone, password: formData.password }),
      })

      const loginData = await loginResponse.json()

      if (!loginResponse.ok) {
        throw new Error(loginData.error || "Invalid credentials")
      }

      console.log("[v0] Login successful, checking admin status...")

      // Check if user is an admin
      const adminCheckResponse = await fetch("/api/auth/check-admin")
      const adminData = await adminCheckResponse.json()

      console.log("[v0] Admin check result:", adminData)

      if (!adminData.isAdmin) {
        // User is not an admin, log them out
        await fetch("/api/auth/logout", { method: "POST" })

        toast({
          title: "Access Denied",
          description: "You must be an administrator to access the admin panel.",
          variant: "destructive",
        })
        return
      }

      // The administration layout checks for this token
      localStorage.setItem("admin_session", "verified")

      toast({
        title: "Welcome Back",
        description: "Successfully logged in as admin",
      })

      // Use window.location for full page navigation to ensure proper auth state
      window.location.href = "/administration/dashboard"
    } catch (error) {
      console.error("[v0] Admin login failed:", error)

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary p-3">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Enter your admin credentials to access the administration panel
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This login is for administrators only. Regular users should use the standard login.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">Email or Phone</Label>
              <Input
                id="emailOrPhone"
                type="text"
                placeholder="admin@example.com"
                value={formData.emailOrPhone}
                onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In as Admin"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Not an admin?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Regular Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
