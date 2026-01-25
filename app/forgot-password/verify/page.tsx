"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { GraduationCap, ArrowLeft, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

function VerifyCodeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const method = searchParams.get("method") || "email"
  const contact = searchParams.get("contact") || ""
  
  const [code, setCode] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    inputRefs[0]?.current?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1]?.current?.focus()
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit) && index === 3) {
      handleVerify(newCode.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus()
    }
  }

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("")
    
    if (codeToVerify.length !== 4) {
      setError("Please enter the complete 4-digit code")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      console.log("[v0] Verifying code:", codeToVerify)
      
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contact,
          code: codeToVerify,
          method 
        }),
      })

      console.log("[v0] Response status:", response.status)
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.log("[v0] Non-JSON response:", text)
        setError("Server error occurred. Please try again.")
        setIsLoading(false)
        setCode(["", "", "", ""])
        inputRefs[0]?.current?.focus()
        return
      }

      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (response.ok) {
        // Navigate to reset password page with token
        router.push(`/forgot-password/reset?token=${data.token}`)
      } else {
        setError(data.error || "Invalid code. Please try again.")
        setIsLoading(false)
        setCode(["", "", "", ""])
        inputRefs[0]?.current?.focus()
      }
    } catch (err) {
      console.error("[v0] Error:", err)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const maskedContact = method === "email" 
    ? contact.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : contact.replace(/(\d{3})(\d{3})(\d{4})/, "($1) ***-$3")

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Back Button */}
          <button
            onClick={() => router.push("/forgot-password/contact?method=" + method)}
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
            <h1 className="text-2xl font-bold text-primary">Enter 4-digit recovery code</h1>
            <p className="text-sm text-muted-foreground text-center">
              The recovery code was sent to your {method === "email" ? "email" : "mobile number"}. <br />
              <span className="font-semibold">{maskedContact}</span>
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Code Input */}
          <div className="mb-8">
            <div className="flex gap-4 justify-center">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading}
                  className="h-16 w-16 rounded-lg border-2 border-gray-200 text-center text-2xl font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              ))}
            </div>
          </div>

          <Button
            onClick={() => handleVerify()}
            className="h-12 w-full bg-gradient-to-r from-primary to-accent text-lg font-semibold"
            disabled={isLoading || code.some(d => !d)}
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push("/forgot-password/contact?method=" + method)}
              className="text-sm text-primary hover:underline font-semibold"
              disabled={isLoading}
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <VerifyCodeForm />
    </Suspense>
  )
}
