"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, Mail } from "lucide-react"

interface InvoiceItem {
  name: string
  description?: string
  quantity: number
  price: number
}

interface PaymentData {
  paymentDate: string
  paymentMethod: string
  payerName: string
  payerEmail: string
  transactionId: string
  amount: number
}

interface InvoiceDisplayProps {
  invoiceNumber: string
  invoiceDate: string
  eventName: string
  billingName: string
  billingEmail: string
  billingAddress?: string
  items: InvoiceItem[]
  totalAmount: number
  showPayButton?: boolean
  onPayNow?: () => void
  showPrintButton?: boolean
  onPrint?: () => void
  showEmailButton?: boolean
  onEmail?: () => void
  paymentInstructions?: string
  paymentData?: PaymentData | null
}

export function InvoiceDisplay({
  invoiceNumber,
  invoiceDate,
  eventName,
  billingName,
  billingEmail,
  billingAddress,
  items = [], // Added default empty array
  totalAmount = 0, // Added default value
  showPayButton = true,
  onPayNow,
  showPrintButton = true,
  onPrint,
  showEmailButton = false,
  onEmail,
  paymentInstructions,
  paymentData,
}: InvoiceDisplayProps) {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6 flex gap-2 print:hidden">
          {showPrintButton && onPrint && (
            <Button onClick={onPrint} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
          {showEmailButton && onEmail && (
            <Button onClick={onEmail} variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Email Invoice
            </Button>
          )}
        </div>

        <Card className="p-12">
          {/* Invoice Header */}
          <div className="mb-12 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">INVOICE</h1>
              <p className="text-muted-foreground">Invoice #: {invoiceNumber}</p>
              <p className="text-muted-foreground">Date: {invoiceDate}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{eventName}</p>
              <p className="text-sm text-muted-foreground">Event Invoice</p>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="mb-12">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Bill To:</h2>
            <p className="font-semibold">{billingName}</p>
            {billingAddress && <p className="text-sm">{billingAddress}</p>}
            <p className="text-sm">{billingEmail}</p>
          </div>

          {/* Invoice Items */}
          <table className="w-full mb-12">
            <thead className="border-b-2">
              <tr>
                <th className="text-left py-3 text-sm font-semibold">Description</th>
                <th className="text-right py-3 text-sm font-semibold">Qty</th>
                <th className="text-right py-3 text-sm font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-4">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  </td>
                  <td className="text-right py-4">{item.quantity}</td>
                  <td className="text-right py-4 font-medium">${(item.price || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Section */}
          <div className="flex justify-end mb-12">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${(totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 font-bold text-lg border-t-2">
                <span>Total:</span>
                <span>${(totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Information or Instructions */}
          <div className="border-t pt-8">
            {paymentData ? (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">Payment Received</h3>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid By:</span>
                    <span className="font-medium">{paymentData.payerName || "Customer"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{paymentData.payerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span className="font-medium">{new Date(paymentData.paymentDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium capitalize">{paymentData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium text-green-700 dark:text-green-400">${paymentData.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-xs">{paymentData.transactionId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold mb-2">Payment Instructions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {paymentInstructions ||
                    "Please make payment within 30 days. You can pay online or send a check to the address above."}
                </p>
                {showPayButton && onPayNow && (
                  <Button onClick={onPayNow} size="lg">
                    Pay Now Online
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-muted-foreground border-t pt-6">
            <p>Thank you for your support!</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
