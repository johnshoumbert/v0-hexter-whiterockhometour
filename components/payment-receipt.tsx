"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Printer, Mail, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"

interface PaymentReceiptProps {
  payment: {
    id: string
    user_name: string
    user_email: string
    payment_type: string
    auction_title?: string
    item_name?: string
    amount: number | string
    created_at: string
    stripe_payment_intent?: string
    payment_method_brand?: string
    payment_method_last4?: string
  }
  eventId?: string
  eventName: string
  organizationName?: string
  showActions?: boolean
  items?: Array<{
    name: string
    quantity: number
    size?: string
    price: number
    image_url?: string
  }>
  message?: string
}

export function PaymentReceipt({
  payment,
  eventId,
  eventName,
  organizationName,
  showActions = true,
  items,
  message,
}: PaymentReceiptProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  console.log("[v0] PaymentReceipt - items prop:", items) // Added debug logging
  console.log("[v0] PaymentReceipt - payment:", payment) // Added debug logging

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
    return `#${id.substring(0, 12).toUpperCase()}`
  }

  const formatCardBrand = (brand?: string) => {
    if (!brand) return "CREDIT CARD"
    return brand.toUpperCase()
  }

  const formatCardNumber = (last4?: string) => {
    if (!last4) return "XXXXXXXXXXXX0000"
    return `XXXXXXXXXXXX${last4}`
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const itemsHTML =
      items && items.length > 0
        ? `
      <div class="section">
        <div class="section-title">ORDER SUMMARY</div>
        ${items
          .map(
            (item) => `
          <div style="display: flex; gap: 16px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <div style="width: 80px; height: 80px; flex-shrink: 0; background: #f3f4f6; border-radius: 8px; overflow: hidden;">
              ${
                item.image_url
                  ? `<img src="${item.image_url}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af;">No image</div>'
              }
            </div>
            <div style="flex: 1;">
              <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${eventName}</div>
              <div style="font-weight: 600; margin-bottom: 4px;">${item.name}</div>
              <div style="font-size: 13px; color: #6b7280;">QTY: ${item.quantity}</div>
            </div>
            <div style="font-weight: 600; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `,
          )
          .join("")}
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #1a1a1a;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">SUBTOTAL</span>
            <strong>$${items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">SALES TAX</span>
            <strong>$0.00</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">SHIPPING</span>
            <strong>$0.00</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 18px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <span style="font-weight: 700;">TOTAL</span>
            <strong>$${amount.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    `
        : ""

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
            .title {
              text-align: center;
              margin-bottom: 32px;
            }
            .title h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .title p {
              color: #6b7280;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 48px;
              padding-bottom: 24px;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-block h4 {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1a1a1a;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .info-block p {
              color: #6b7280;
              font-size: 14px;
            }
            .section {
              margin: 32px 0;
            }
            .section-title {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1a1a1a;
              margin-bottom: 16px;
              font-weight: 700;
            }
            .payment-section {
              background: #f9fafb;
              padding: 24px;
              border-radius: 8px;
              margin-top: 48px;
            }
            .payment-section h3 {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1a1a1a;
              margin-bottom: 16px;
              font-weight: 700;
            }
            .payment-details p {
              margin-bottom: 4px;
              color: #1a1a1a;
              font-size: 14px;
            }
            .footer {
              margin-top: 64px;
              text-align: center;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="title">
            <h1>Thanks for your order!</h1>
            <p>Hi ${payment.user_name}, we're getting your order ready to be shipped! We will notify you by email when it has been sent.</p>
          </div>

          <div class="order-info">
            <div class="info-block">
              <h4>ORDER NUMBER</h4>
              <p>${formatReceiptId(payment.id)}</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h4>ORDER DATE</h4>
              <p>${new Date(payment.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}</p>
            </div>
          </div>

          ${itemsHTML}

          ${
            !items || items.length === 0
              ? `
          <div class="section">
            <div class="section-title">${payment.payment_type === "donation" ? "DONATION" : "PAYMENT"} DETAILS</div>
            <p style="margin-bottom: 16px;">Amount: <strong>$${amount.toFixed(2)}</strong></p>
            ${message ? `<p style="font-style: italic; color: #6b7280;">"${message}"</p>` : ""}
          </div>
          `
              : ""
          }

          <div class="payment-section">
            <h3>PAYMENT</h3>
            <div class="payment-details">
              <p><strong>${formatCardBrand(payment.payment_method_brand)}</strong></p>
              <p>${payment.user_name}</p>
              <p>${formatCardNumber(payment.payment_method_last4)}</p>
              <p>EXP ${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear() % 100}</p>
            </div>
          </div>

          <div class="footer">
            <Button style="background: #1a1a1a; color: white; padding: 12px 48px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">
              VIEW OR MANAGE ORDER
            </Button>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    printWindow.print()
  }

  const handleEmailReceipt = async () => {
    if (!eventId) {
      toast({
        title: "Error",
        description: "Cannot send receipt without event information",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    setSent(false)

    try {
      const response = await fetch(`/api/events/${eventId}/payments/${payment.id}/send-receipt`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to send receipt")
      }

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
    <div className="space-y-6">
      {/* Receipt Preview */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Title Section */}
        <div className="p-8 text-center border-b">
          <h2 className="text-3xl font-bold mb-2 uppercase tracking-wide">Thanks for your order!</h2>
          <p className="text-sm text-muted-foreground">
            Hi {payment.user_name}, we're getting your order ready to be shipped! We will notify you by email when it
            has been sent.
          </p>
        </div>

        {/* Order Info */}
        <div className="flex justify-between p-8 border-b">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-1">ORDER NUMBER</h4>
            <p className="text-sm text-muted-foreground">{formatReceiptId(payment.id)}</p>
          </div>
          <div className="text-right">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-1">ORDER DATE</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(payment.created_at)
                .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                .toUpperCase()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Items Purchased */}
          {items && items.length > 0 && (
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">ORDER SUMMARY</h4>
              <div className="space-y-6">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-6 border-b last:border-b-0">
                    <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                      {item.image_url ? (
                        <Image
                          src={item.image_url || "/placeholder.svg"}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{eventName}</div>
                      <div className="font-semibold mb-1">{item.name}</div>
                      <div className="text-sm text-muted-foreground">QTY: {item.quantity}</div>
                    </div>
                    <div className="font-semibold text-right">${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t-2 border-foreground">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">SUBTOTAL</span>
                  <strong>${items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">SALES TAX</span>
                  <strong>$0.00</strong>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">SHIPPING</span>
                  <strong>$0.00</strong>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>TOTAL</span>
                  <span>${amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Non-shop payment details */}
          {(!items || items.length === 0) && (
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
                {payment.payment_type === "donation" ? "DONATION" : "PAYMENT"} DETAILS
              </h4>
              <p className="mb-4">
                Amount: <strong className="text-2xl">${amount.toFixed(2)}</strong>
              </p>
              {message && <p className="text-sm italic text-muted-foreground">"{message}"</p>}
            </div>
          )}

          {/* Payment Method */}
          <div className="bg-muted p-6 rounded-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-4">PAYMENT</h4>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{formatCardBrand(payment.payment_method_brand)}</p>
              <p>{payment.user_name}</p>
              <p className="font-mono">{formatCardNumber(payment.payment_method_last4)}</p>
              <p>
                EXP {String(new Date().getMonth() + 1).padStart(2, "0")}/{new Date().getFullYear() % 100}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="flex-1 bg-transparent">
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
          {eventId && (
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
          )}
        </div>
      )}
    </div>
  )
}
