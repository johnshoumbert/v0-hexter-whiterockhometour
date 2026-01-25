"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PricingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [licenseCode, setLicenseCode] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (sessionId) {
      fetch(`/api/checkout/session?session_id=${sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch session")
          return res.json()
        })
        .then((data) => {
          setLicenseCode(data.licenseCode)
          setEmail(data.email)
          setVerified(true)
          setLoading(false)
        })
        .catch((error) => {
          console.error("[v0] Failed to fetch license:", error)
          toast({ title: "Failed to load license details", variant: "destructive" })
          setLoading(false)
        })
    } else {
      router.push("/pricing")
    }
  }, [searchParams, router, toast])

  const copyCode = () => {
    if (licenseCode) {
      navigator.clipboard.writeText(licenseCode)
      toast({ title: "License code copied to clipboard!" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your event license has been activated
            {email && ` - confirmation sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {licenseCode && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Your License Code:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-muted rounded-lg font-mono text-xl text-center tracking-wider">
                  {licenseCode}
                </div>
                <Button variant="outline" size="icon" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this code safe! You'll need it to create your auction event.
              </p>
            </div>
          )}

          <p className="text-center text-muted-foreground">
            Thank you for your purchase! Your event license is now active and ready to use.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/create-auction")} className="flex-1">
              Create Event
            </Button>
            <Button onClick={() => router.push("/")} variant="outline" className="flex-1">
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
