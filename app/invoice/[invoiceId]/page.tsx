"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useEvent } from "@/contexts/event-context"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { InvoiceDisplay } from "@/components/invoice-display"

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  eventName: string
  winnerName: string
  winnerEmail: string
  winnerPhone: string
  auctionTitle: string
  finalBid: number
  eventId: string
  status: string
  paymentStatus?: string
  paymentId?: string
  items: Array<{
    itemName: string
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
}

interface PaymentData {
  paymentDate: string
  paymentMethod: string
  payerName: string
  payerEmail: string
  transactionId: string
  amount: number
}

export default function WinnerInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { event } = useEvent()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)

  const invoiceId = params.invoiceId as string

  useEffect(() => {
    if (!invoiceId) {
      console.error("[v0] Missing invoice ID from params:", params)
      toast.error("Missing invoice ID")
      setLoading(false)
      return
    }

    console.log("[v0] Invoice ID from URL:", invoiceId)

    const fetchInvoice = async () => {
      try {
        console.log("[v0] Fetching invoice:", invoiceId)
        const response = await fetch(`/api/invoices/${invoiceId}`)

        console.log("[v0] Invoice API response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Invoice API error:", errorText)
          throw new Error("Failed to fetch invoice")
        }

        const data = await response.json()
        console.log("[v0] Invoice data received:", data)
        setInvoice(data)

        // Fetch payment data if invoice is paid
        if (data.paymentId && data.paymentStatus === "succeeded") {
          console.log("[v0] Fetching payment data for paymentId:", data.paymentId)
          try {
            const paymentResponse = await fetch(`/api/payments/${data.paymentId}`)
            if (paymentResponse.ok) {
              const payment = await paymentResponse.json()
              console.log("[v0] Payment data received:", payment)
              setPaymentData(payment)
            }
          } catch (err) {
            console.error("[v0] Failed to fetch payment data:", err)
          }
        }

        if (data.status === "pending") {
          fetch(`/api/invoices/${invoiceId}/track-view`, {
            method: "POST",
          }).catch((err) => console.error("[v0] Failed to track view:", err))
        }
      } catch (error) {
        console.error("[v0] Error fetching invoice:", error)
        toast.error("Failed to load invoice")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId, params])

  const handlePrint = () => {
    window.print()
  }

  const handleEmailInvoice = async () => {
    toast.info("Email functionality coming soon")
  }

  const handlePayNow = () => {
    if (!invoice) return

    const amount = invoice.finalBid || 0
    const invoiceNumber = invoice.invoiceNumber || ""
    const eventId = invoice.eventId || ""

    console.log("[v0] Pay Now clicked - Amount:", amount, "Invoice:", invoiceNumber, "Event:", eventId)

    router.push(
      `/checkout?type=invoice&eventId=${eventId}&invoiceId=${invoiceId}&invoiceNumber=${invoiceNumber}&amount=${amount}`,
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!invoiceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Missing invoice ID</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invoice not found</p>
      </div>
    )
  }

  const displayItems =
    invoice.items?.map((item) => ({
      name: item.itemName,
      quantity: item.quantity,
      price: item.unitPrice,
    })) || []

  const isPaid = invoice.paymentStatus === "succeeded"

  return (
    <InvoiceDisplay
      invoiceNumber={invoice.invoiceNumber}
      invoiceDate={invoice.invoiceDate}
      eventName={invoice.eventName || event?.event_name || "Event"}
      billingName={invoice.winnerName}
      billingEmail={invoice.winnerEmail}
      items={displayItems}
      totalAmount={invoice.finalBid}
      showPayButton={!isPaid}
      onPayNow={handlePayNow}
      showPrintButton={true}
      onPrint={handlePrint}
      showEmailButton={true}
      onEmail={handleEmailInvoice}
      paymentData={isPaid ? paymentData : undefined}
    />
  )
}
