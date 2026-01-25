"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function SponsorSuccessPage() {
  const searchParams = useSearchParams()
  const requestId = searchParams.get("requestId")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading state
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Sponsorship Payment Successful!</CardTitle>
            <CardDescription>Thank you for your generous support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Confirmation Number</p>
              <p className="font-mono font-semibold">{requestId}</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Payment has been processed successfully</p>
              <p>✓ Confirmation email has been sent</p>
              <p>✓ Your sponsorship is now active</p>
            </div>

            <Button asChild className="w-full" size="lg">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
