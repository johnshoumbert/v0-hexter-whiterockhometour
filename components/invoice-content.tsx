"use client"

import { InvoiceDisplay } from "@/components/invoice-display"

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  eventName: string
  winnerName: string
  winnerEmail: string
  auctionTitle: string
  finalBid: number
  pickupInstructions?: string
  eventId: string
  items?: Array<{ name: string; quantity: number; price: number }>
}

interface InvoiceContentProps {
  invoice: InvoiceData
  showPayButton?: boolean
  onPayNow?: () => void
  showPrintButton?: boolean
  onPrint?: () => void
}

export function InvoiceContent({
  invoice,
  showPayButton = false,
  onPayNow,
  showPrintButton = false,
  onPrint,
}: InvoiceContentProps) {
  const displayItems =
    invoice.items && invoice.items.length > 0
      ? invoice.items.map((item: any) => ({
          name: item.itemName || item.name || invoice.auctionTitle,
          description: item.description || "Auction Item",
          quantity: item.quantity || 1,
          price: item.unitPrice || item.price || invoice.finalBid,
        }))
      : [
          {
            name: invoice.auctionTitle,
            description: "Auction Item",
            quantity: 1,
            price: invoice.finalBid,
          },
        ]

  return (
    <div className="p-0">
      <InvoiceDisplay
        invoiceNumber={invoice.invoiceNumber}
        invoiceDate={invoice.invoiceDate}
        eventName={invoice.eventName}
        billingName={invoice.winnerName}
        billingEmail={invoice.winnerEmail}
        items={displayItems}
        totalAmount={invoice.finalBid}
        showPayButton={showPayButton}
        onPayNow={onPayNow}
        showPrintButton={showPrintButton}
        onPrint={onPrint}
        paymentInstructions={invoice.pickupInstructions}
      />
    </div>
  )
}
