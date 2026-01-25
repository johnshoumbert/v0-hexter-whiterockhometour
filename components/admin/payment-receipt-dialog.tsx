"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FileText, Mail, Printer, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PaymentReceiptDialogProps {
  payment: {
    id: string
    user_name: string
    user_email: string
    payment_type: string
    auction_title?: string
    amount: number | string // allow string type from database
    created_at: string
    stripe_payment_intent?: string
  }
  eventId: string
  eventName: string
  organizationName?: string
}

export function PaymentReceiptDialog({ payment, eventId, eventName, organizationName }: PaymentReceiptDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const amount = typeof payment.amount === "string" ? Number.parseFloat(payment.amount) : payment.amount

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatReceiptId = (id: string) => {
    return `RCP-${id.substring(0, 8).toUpperCase()}`
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${eventName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1a1a1a;
            }
            .header {
              background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
              color: white;
              padding: 32px;
              border-radius: 12px 12px 0 0;
              margin-bottom: 32px;
            }
            .header h1 { font-size: 16px; margin-bottom: 4px; font-weight: 600; }
            .header p { font-size: 14px; opacity: 0.9; }
            .receipt-title {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .receipt-subtitle {
              font-size: 14px;
              color: #666;
            }
            .thank-you {
              background: #f8f9fa;
              padding: 24px;
              border-radius: 8px;
              margin: 32px 0;
            }
            .thank-you h3 {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .thank-you p {
              line-height: 1.6;
              color: #666;
              font-size: 14px;
            }
            .section {
              margin: 32px 0;
            }
            .section-title {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 600;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 32px;
            }
            .info-item {
              margin-bottom: 16px;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 500;
              color: #1a1a1a;
            }
            .amount-large {
              font-size: 36px;
              font-weight: 700;
              color: #ec4899;
            }
            .verification {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-top: 32px;
            }
            .verification h4 {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .verification-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              font-size: 13px;
            }
            .verification-item {
              display: flex;
              justify-content: space-between;
            }
            .footer {
              margin-top: 48px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .header { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${organizationName || eventName}</h1>
            <p>${eventName}</p>
          </div>

          <div class="receipt-title">PAYMENT RECEIPT</div>
          <div class="receipt-subtitle">Tax-Deductible Payment Confirmation</div>

          <div class="thank-you">
            <h3>Thank you for your ${payment.payment_type === "donation" ? "generosity" : "purchase"}!</h3>
            <p>Your ${payment.payment_type === "donation" ? "contribution" : "payment"} helps support our mission and create lasting positive impact. ${
              payment.payment_type === "donation"
                ? "Please retain this receipt for your tax records."
                : "We appreciate your support!"
            }</p>
          </div>

          <div class="info-grid">
            <div class="section">
              <div class="section-title">Donor Information</div>
              <div class="info-item">
                <div class="info-label">Full Name</div>
                <div class="info-value">${payment.user_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${payment.user_email}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Payment Details</div>
              <div class="info-item">
                <div class="info-label">${payment.payment_type === "donation" ? "Donation" : "Payment"} Amount</div>
                <div class="amount-large">$${amount.toFixed(2)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Payment Method</div>
                <div class="info-value">Credit Card</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date Received</div>
                <div class="info-value">${formatDate(payment.created_at)}</div>
              </div>
            </div>
          </div>

          ${
            payment.auction_title
              ? `
          <div class="section">
            <div class="section-title">Item Details</div>
            <div class="info-item">
              <div class="info-label">Item</div>
              <div class="info-value">${payment.auction_title}</div>
            </div>
          </div>
          `
              : ""
          }

          <div class="verification">
            <h4>Receipt Verification</h4>
            <div class="verification-grid">
              <div class="verification-item">
                <span>Receipt ID:</span>
                <strong>${formatReceiptId(payment.id)}</strong>
              </div>
              ${
                payment.stripe_payment_intent
                  ? `
              <div class="verification-item">
                <span>Transaction ID:</span>
                <strong>${payment.stripe_payment_intent.substring(0, 20)}...</strong>
              </div>
              `
                  : ""
              }
            </div>
          </div>

          <div class="footer">
            <p>This receipt was generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p style="margin-top: 8px;">For questions about this ${payment.payment_type === "donation" ? "donation" : "payment"}, please contact ${organizationName || eventName}</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    printWindow.print()
  }

  const handleEmailReceipt = async () => {
    console.log("[v0] Email receipt clicked for payment:", payment.id)
    setSending(true)
    setSent(false)

    try {
      console.log("[v0] Sending receipt to:", `/api/events/${eventId}/payments/${payment.id}/send-receipt`)
      const response = await fetch(`/api/events/${eventId}/payments/${payment.id}/send-receipt`, {
        method: "POST",
        credentials: "include", // This sends cookies automatically
      })

      console.log("[v0] Email receipt response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log("[v0] Email receipt error response:", errorText)
        throw new Error("Failed to send receipt")
      }

      const result = await response.json()
      console.log("[v0] Email receipt success:", result)

      toast({
        title: "Receipt Sent",
        description: `Receipt has been emailed to ${payment.user_email}`,
      })
      setSent(true)
    } catch (error) {
      console.error("[v0] Email receipt error:", error)
      toast({
        title: "Error",
        description: "Failed to send receipt email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          View Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>Receipt for payment #{formatReceiptId(payment.id)}</DialogDescription>
        </DialogHeader>

        {/* Receipt Preview */}
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-8">
            <h1 className="text-sm font-semibold mb-1">{organizationName || eventName}</h1>
            <p className="text-sm opacity-90">{eventName}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-2">PAYMENT RECEIPT</h2>
            <p className="text-sm text-muted-foreground mb-8">Tax-Deductible Payment Confirmation</p>

            {/* Thank you section */}
            <div className="bg-muted p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold mb-3">
                Thank you for your {payment.payment_type === "donation" ? "generosity" : "purchase"}!
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your {payment.payment_type === "donation" ? "contribution" : "payment"} helps support our mission and
                create lasting positive impact.{" "}
                {payment.payment_type === "donation"
                  ? "Please retain this receipt for your tax records."
                  : "We appreciate your support!"}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Donor Info */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  Donor Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Full Name</div>
                    <div className="font-medium">{payment.user_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                    <div className="font-medium">{payment.user_email}</div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  Payment Details
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {payment.payment_type === "donation" ? "Donation" : "Payment"} Amount
                    </div>
                    <div className="text-4xl font-bold text-pink-500">${amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Payment Method</div>
                    <div className="font-medium">Credit Card</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Date Received</div>
                    <div className="font-medium">{formatDate(payment.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Details */}
            {payment.auction_title && (
              <div className="mb-8">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  Item Details
                </h4>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Item</div>
                  <div className="font-medium">{payment.auction_title}</div>
                </div>
              </div>
            )}

            {/* Verification */}
            <div className="bg-muted p-5 rounded-lg">
              <h4 className="text-sm font-semibold mb-3">Receipt Verification</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt ID:</span>
                  <strong>{formatReceiptId(payment.id)}</strong>
                </div>
                {payment.stripe_payment_intent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <strong className="truncate ml-2">{payment.stripe_payment_intent.substring(0, 20)}...</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handlePrint} variant="outline" className="flex-1 bg-transparent">
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
          <Button onClick={handleEmailReceipt} disabled={sending || sent} className="flex-1">
            {sent ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Sent
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {sending ? "Sending..." : "Email Receipt"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
