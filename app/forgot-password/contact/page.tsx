"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, ArrowLeft, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

function ForgotPasswordContactForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const method = searchParams.get("method") as "email" | "sms" || "email"
  
  const [contact, setContact] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("[v0] Sending forgot password request for:", contact)
      
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contact,
          method 
        }),
      })

      console.log("[v0] Response status:", response.status)

      const contentType = response.headers.get("content-type")
      let data
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.error("[v0] Non-JSON response:", text)
        throw new Error("Server error occurred. Please try again.")
      }

      console.log("[v0] Response data:", data)

      if (response.ok) {
        // Navigate to verification code page
        router.push(`/forgot-password/verify?method=${method}&contact=${encodeURIComponent(contact)}`)
      } else {
        setError(data.error || "Failed to send reset code. Please try again.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("[v0] Error:", err)
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Back Button */}
          <button
            onClick={() => router.push("/forgot-password")}
            className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>

          {/* School Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
            <p className="text-sm text-muted-foreground text-center">
              Enter your {method === "email" ? "email address" : "phone number"} to receive a reset code
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="contact">
                {method === "email" ? "Email Address" : "Phone Number"}
              </Label>
              <Input
                id="contact"
                type={method === "email" ? "email" : "tel"}
                placeholder={method === "email" ? "you@example.com" : "(555) 123-4567"}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-gradient-to-r from-primary to-accent text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Code"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-primary hover:underline font-semibold"
              disabled={isLoading}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordContactPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ForgotPasswordContactForm />
    </Suspense>
  )
}
