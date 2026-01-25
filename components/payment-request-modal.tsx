"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Copy, Mail, Loader2, ExternalLink } from "lucide-react"

interface PaymentRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  winnerId: string
  eventId: string
  winnerEmail: string
  amount: number
  onViewInvoice?: (invoiceId: string) => void
}

export function PaymentRequestModal({
  open,
  onOpenChange,
  winnerId,
  eventId,
  winnerEmail,
  amount,
  onViewInvoice,
}: PaymentRequestModalProps) {
  const { toast } = useToast()
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)
  const [isCheckingInvoice, setIsCheckingInvoice] = useState(false)
  const [existingInvoice, setExistingInvoice] = useState<boolean>(false)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"
  const paymentUrl = invoiceNumber ? `${appUrl}/pay/${invoiceNumber}` : `${appUrl}/invoice/${invoiceId || winnerId}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setInvoiceId(null)
      setInvoiceNumber(null)
      setExistingInvoice(false)
      setIsGeneratingInvoice(false)
      setHasChecked(false)
    }
  }, [open])

  useEffect(() => {
    if (open && !invoiceId && !hasChecked) {
      setIsCheckingInvoice(true)
      setHasChecked(true)
      // Check if an invoice already exists for this winner
      fetch(`/api/events/${eventId}/winners/${winnerId}/check-invoice`)
        .then((res) => res.json())
        .then((data) => {
          if (data.exists && data.invoiceId) {
            // Invoice already exists, use it
            setInvoiceId(data.invoiceId)
            setInvoiceNumber(data.invoiceNumber)
            setExistingInvoice(true)
          }
          // Don't auto-create invoice anymore - wait for user to click Generate Invoice
        })
        .catch((error) => {
          console.error("Error checking invoice:", error)
          toast({
            title: "Error",
            description: "Failed to check for existing invoice",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsCheckingInvoice(false)
        })
    }
  }, [open, invoiceId, hasChecked, eventId, winnerId, toast])

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true)
    try {
      const response = await fetch(`/api/events/${eventId}/winners/${winnerId}/request-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createOnly: true }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.invoiceId) {
          setInvoiceId(data.invoiceId)
          setInvoiceNumber(data.invoiceNumber)
          setExistingInvoice(false)
          toast({
            title: "Invoice Generated",
            description: "Payment invoice has been created successfully",
          })
        }
      } else {
        throw new Error("Failed to generate invoice")
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingInvoice(false)
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

  const handleViewInvoice = () => {
    if (invoiceId && onViewInvoice) {
      onOpenChange(false)
      onViewInvoice(invoiceId)
    }
  }

  const handleSendPaymentRequest = async () => {
    setIsSendingEmail(true)
    try {
      const response = await fetch(`/api/events/${eventId}/winners/${winnerId}/request-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, sendEmail: true }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.invoiceId && !invoiceId) {
          setInvoiceId(data.invoiceId)
          setInvoiceNumber(data.invoiceNumber)
        }

        toast({
          title: "Payment Request Sent",
          description: `Payment request email sent to ${winnerEmail}`,
        })
        onOpenChange(false)
      } else {
        throw new Error("Failed to send payment request")
      }
    } catch (error) {
      console.error("[v0] Send payment request error:", error)
      toast({
        title: "Error",
        description: "Failed to send payment request email",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {!invoiceId && !existingInvoice
              ? "Generate Payment Invoice"
              : existingInvoice
                ? "View Payment Invoice"
                : "Request Payment"}
          </DialogTitle>
          <DialogDescription>
            {!invoiceId && !existingInvoice
              ? `Generate an invoice for ${winnerEmail} - $${amount.toFixed(2)}`
              : existingInvoice
                ? `Invoice already exists for ${winnerEmail} - $${amount.toFixed(2)}`
                : `Share payment link with ${winnerEmail} for $${amount.toFixed(2)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code - only show if invoice exists */}
          {(invoiceId || existingInvoice) && (
            <div className="flex justify-center">
              {isCheckingInvoice ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg">
                  <img src={qrCodeUrl || "/placeholder.svg"} alt="Payment QR Code" className="w-64 h-64" />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {!invoiceId && !existingInvoice ? (
              // No invoice exists - show only Generate Invoice button
              <Button onClick={handleGenerateInvoice} className="w-full" disabled={isGeneratingInvoice || isCheckingInvoice}>
                {isGeneratingInvoice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Invoice...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>
            ) : existingInvoice ? (
              // Existing invoice - show all options
              <>
                <Button onClick={handleViewInvoice} className="w-full" disabled={isCheckingInvoice}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Invoice
                </Button>
                <Button
                  onClick={handleCopyPaymentLink}
                  variant="outline"
                  className="w-full bg-transparent"
                  disabled={isCheckingInvoice}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Payment Link
                </Button>
                <Button
                  onClick={handleSendPaymentRequest}
                  variant="outline"
                  className="w-full bg-transparent"
                  disabled={isSendingEmail || isCheckingInvoice}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Payment Request
                    </>
                  )}
                </Button>
              </>
            ) : (
              // Invoice just generated - show copy link and send email
              <>
                <Button
                  onClick={handleCopyPaymentLink}
                  variant="outline"
                  className="w-full bg-transparent"
                  disabled={isCheckingInvoice}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Payment Link
                </Button>

                <Button
                  onClick={handleSendPaymentRequest}
                  className="w-full"
                  disabled={isSendingEmail || isCheckingInvoice}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Payment Request Email
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              {!invoiceId && !existingInvoice
                ? "Click Generate Invoice to create a payment request"
                : existingInvoice
                  ? "This invoice was previously generated. You can view or resend it."
                  : "Scan QR code or click buttons to request payment"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
