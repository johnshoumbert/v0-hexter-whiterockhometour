"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Copy, Mail, Loader2, Trash2, ExternalLink } from "lucide-react"
import { InvoiceContent } from "./invoice-content"

interface InvoiceSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  eventId: string
  winnerId?: string
  onDelete?: () => void
}

export function InvoiceSheet({ open, onOpenChange, invoiceId, eventId, winnerId, onDelete }: InvoiceSheetProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"
  const paymentUrl = invoice?.invoiceNumber
    ? `${appUrl}/pay/${invoice.invoiceNumber}`
    : `${appUrl}/invoice/${invoiceId}`

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoice()
    }
  }, [open, invoiceId])

  const fetchInvoice = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      } else {
        throw new Error("Failed to fetch invoice")
      }
    } catch (error) {
      console.error("[v0] Error fetching invoice:", error)
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl)
      toast({
        title: "Link Copied",
        description: "Payment link copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy payment link",
        variant: "destructive",
      })
    }
  }

  const handleSendPaymentRequest = async () => {
    setIsSendingEmail(true)
    try {
      // Use invoice API endpoint to resend email if winnerId not available
      const endpoint = winnerId 
        ? `/api/events/${eventId}/winners/${winnerId}/request-payment`
        : `/api/invoices/${invoiceId}/send-email`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(winnerId ? { invoiceId, sendEmail: true } : {}),
      })

      if (response.ok) {
        toast({
          title: "Payment Request Sent",
          description: `Payment request email sent to ${invoice?.userEmail || invoice?.winnerEmail}`,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to send payment request")
      }
    } catch (error: any) {
      console.error("[v0] Send payment request error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send payment request email",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Invoice Deleted",
          description: "Invoice has been deleted successfully",
        })
        onOpenChange(false)
        onDelete?.()
      } else {
        throw new Error("Failed to delete invoice")
      }
    } catch (error) {
      console.error("[v0] Delete invoice error:", error)
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>Payment Invoice</SheetTitle>
          <SheetDescription>Invoice #{invoice?.invoiceNumber}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 py-6 overflow-y-auto">
          {invoice && <InvoiceContent invoice={invoice} showPayButton={false} showPrintButton={false} />}
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col mt-6">
          {invoice?.invoiceNumber && (
            <Button 
              onClick={() => {
                onOpenChange(false)
                router.push(`/pay/${invoice.invoiceNumber}`)
              }} 
              variant="default" 
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Pay Invoice
            </Button>
          )}

          <Button onClick={handleCopyPaymentLink} variant="outline" className="w-full bg-transparent">
            <Copy className="mr-2 h-4 w-4" />
            Copy Payment Link
          </Button>

          <Button onClick={handleSendPaymentRequest} disabled={isSendingEmail} className="w-full">
            {isSendingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Payment Request
              </>
            )}
          </Button>

          <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" className="w-full">
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
