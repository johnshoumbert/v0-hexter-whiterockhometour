"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useEvent } from "@/contexts/event-context"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { InvoiceDisplay } from "@/components/invoice-display"

interface InvoiceData {
  id: string
  company_name: string
  company_address: string
  contact_name: string
  contact_email: string
  sponsorship_level: string
  custom_amount: number | null
  level_amount: number | null
  created_at: string
}

export default function SponsorInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { event } = useEvent()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!event?.id) return

    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/events/${event.id}/sponsor-requests/${params.requestId}`)
        if (!response.ok) throw new Error("Failed to fetch invoice")

        const data = await response.json()
        setInvoice(data.request)
      } catch (error) {
        console.error("[v0] Error fetching invoice:", error)
        toast.error("Failed to load invoice")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [event?.id, params.requestId])

  const handlePrint = () => {
    window.print()
  }

  const handleEmailInvoice = async () => {
    toast.info("Email functionality coming soon")
  }

  const handlePayNow = () => {
    const amount = invoice?.custom_amount || invoice?.level_amount || 0
    const invoiceNumber = `INV-${invoice?.id.slice(0, 8).toUpperCase()}`
    router.push(
      `/checkout?type=sponsor&eventId=${event?.id}&requestId=${params.requestId}&invoiceNumber=${invoiceNumber}&amount=${amount}`
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const amount = invoice.custom_amount || invoice.level_amount || 0
  const invoiceDate = new Date(invoice.created_at).toLocaleDateString()
  const invoiceNumber = `INV-${invoice.id.slice(0, 8).toUpperCase()}`

  return (
    <InvoiceDisplay
      invoiceNumber={invoiceNumber}
      invoiceDate={invoiceDate}
      eventName={event?.event_name || "Event"}
      billingName={invoice.company_name}
      billingEmail={invoice.contact_email}
      billingAddress={invoice.company_address || undefined}
      items={[
        {
          name: `${invoice.sponsorship_level.charAt(0).toUpperCase() + invoice.sponsorship_level.slice(1)} Sponsorship`,
          description: `${event?.event_name} Sponsorship Package`,
          quantity: 1,
          price: amount,
        },
      ]}
      totalAmount={amount}
      showPayButton={true}
      onPayNow={handlePayNow}
      showPrintButton={true}
      onPrint={handlePrint}
      showEmailButton={true}
      onEmail={handleEmailInvoice}
    />
  )
}
