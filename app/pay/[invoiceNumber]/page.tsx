import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default async function PayRedirect({ params }: { params: Promise<{ invoiceNumber: string }> }) {
  const { invoiceNumber } = await params

  console.log("[v0] Pay redirect page accessed:", { invoiceNumber, timestamp: new Date().toISOString() })

  try {
    console.log("[v0] Executing database query for invoice_number:", invoiceNumber)
    const result = await sql`
      SELECT id, invoice_number, status FROM po_requests 
      WHERE invoice_number = ${invoiceNumber}
      LIMIT 1
    `
    console.log("[v0] Query completed. Results found:", result.length)
    
    if (result.length > 0) {
      console.log("[v0] Invoice found:", { id: result[0].id, invoice_number: result[0].invoice_number })
    }

    if (result.length === 0) {
      console.log("[v0] No invoice found with number:", invoiceNumber)
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Invoice Not Found</CardTitle>
              </div>
              <CardDescription>
                We couldn't find an invoice with number: <strong>{invoiceNumber}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This invoice may not exist or the link may be incorrect. Please check the invoice number and try again.
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/">Return Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    const invoiceId = result[0].id
    console.log("[v0] Redirecting to invoice page:", `/invoice/${invoiceId}`)
    redirect(`/invoice/${invoiceId}`)
  } catch (error) {
    // Next.js redirect() throws an error to perform the redirect
    // We need to re-throw it so Next.js can handle the redirect properly
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage === 'Redirect' || errorMessage.includes('NEXT_REDIRECT')) {
      console.log("[v0] Redirect error caught (this is expected), re-throwing for Next.js to handle")
      throw error
    }
    
    // For actual errors, log and show error page
    console.error("[v0] Actual error in pay redirect:", error)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error constructor:", error?.constructor?.name)
    console.error("[v0] Error message:", errorMessage)
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error Loading Invoice</CardTitle>
            </div>
            <CardDescription>
              An error occurred while looking up invoice: <strong>{invoiceNumber}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              There was a technical issue loading this invoice. Please try again later or contact support.
            </p>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
