"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { GraduationCap, ArrowLeft, Mail, Smartphone } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MethodSelectionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<"email" | "sms" | null>(null)

  const handleMethodSelect = async (method: "email" | "sms") => {
    setSelectedMethod(method)
    setError("")
    setIsLoading(true)

    try {
      router.push(`/forgot-password/contact?method=${method}`)
    } catch (err) {
      console.error("[v0] Error:", err)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Back Button */}
          <button
            onClick={() => router.push("/login")}
            className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Login</span>
          </button>

          {/* School Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-primary">Forgot Password</h1>
            <p className="text-sm text-muted-foreground text-center">
              Select which contact details should we use to reset your password:
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Method Selection */}
          <div className="space-y-4">
            {/* Email Option */}
            <button
              onClick={() => handleMethodSelect("email")}
              disabled={isLoading}
              className="w-full rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">via email:</div>
                  <div className="text-base font-semibold">••••••@email.com</div>
                </div>
              </div>
            </button>

            {/* SMS Option */}
            <button
              onClick={() => handleMethodSelect("sms")}
              disabled={isLoading}
              className="w-full rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">via sms:</div>
                  <div className="text-base font-semibold">•••• •••• 9011</div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Need help? Contact your school administrator
          </div>
        </div>
      </div>
    </div>
  )
}
