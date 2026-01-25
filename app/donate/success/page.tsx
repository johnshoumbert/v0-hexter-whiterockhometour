"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  Loader2,
  Printer,
  Package,
  DollarSign,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  Clock,
  Calendar,
  ImageIcon,
} from "lucide-react"
import { useEvent } from "@/contexts/event-context"

interface ItemDonationReceipt {
  type: "item"
  donationId?: string
  itemName: string
  itemDescription: string
  estimatedValue: string
  donorName: string
  donorEmail: string
  donorPhone?: string
  donorOrganization?: string
  donorAddress?: string
  deliveryMethod: string[]
  donationNotes?: string
  images: string[]
  eventName: string
  eventId: string
  submittedAt: string
}

interface MoneyDonationReceipt {
  payment: {
    id: string
    amount: number
    status: string
    created_at: string
    donor_name: string
    donor_email: string
    message?: string
  }
  event: {
    name: string
  }
  stripe: {
    payment_status: string
    amount_total: number
    currency: string
  }
}

const deliveryMethodLabels: Record<string, string> = {
  deliver: "Will deliver the donation item",
  pickup: "Needs someone to pick up the item",
  certificate_email: "Will provide certificate via email",
  certificate_create: "Needs committee to create certificate",
}

function DonationSuccessContent() {
  const searchParams = useSearchParams()
  const donationType = searchParams.get("type") || "money"
  const sessionId = searchParams.get("session_id")
  const { event } = useEvent()

  const [itemDonation, setItemDonation] = useState<ItemDonationReceipt | null>(null)
  const [moneyDonation, setMoneyDonation] = useState<MoneyDonationReceipt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDonationDetails = async () => {
      if (donationType === "item") {
        // Retrieve item donation from sessionStorage
        const storedReceipt = sessionStorage.getItem("donation_receipt")
        if (storedReceipt) {
          try {
            const receipt = JSON.parse(storedReceipt) as ItemDonationReceipt
            setItemDonation(receipt)
            // Clear after reading to prevent stale data
            sessionStorage.removeItem("donation_receipt")
          } catch (e) {
            setError("Failed to load donation details")
          }
        } else {
          setError("Donation details not found")
        }
        setIsLoading(false)
        return
      }

      // Money donation - fetch from Stripe session
      if (!sessionId || !event?.id) {
        setError("Missing session information")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/events/${event.id}/donations/session?session_id=${sessionId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch donation details")
        }

        const data = await response.json()
        setMoneyDonation(data)
      } catch (error) {
        console.error("[v0] Error fetching donation details:", error)
        setError("Failed to load donation details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDonationDetails()
  }, [sessionId, event, donationType])

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numAmount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || (!itemDonation && !moneyDonation)) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Error Loading Receipt</CardTitle>
            <CardDescription>{error || "Unable to load donation details"}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Item Donation Receipt
  if (donationType === "item" && itemDonation) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 print:py-4">
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 print:bg-green-50">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Thank You for Your Donation!</CardTitle>
            <CardDescription className="text-base">Your item donation has been submitted for review</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Receipt Header */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-6 text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Item Donation Receipt</p>
              <p className="text-2xl font-bold mt-1">{itemDonation.itemName}</p>
              <p className="text-lg text-primary font-semibold mt-2">
                Estimated Value: {formatCurrency(itemDonation.estimatedValue)}
              </p>
              {itemDonation.donationId && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Reference: {itemDonation.donationId.substring(0, 8).toUpperCase()}
                </p>
              )}
            </div>

            {/* Item Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Item Details
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground block">Item Name</span>
                  <span className="font-medium">{itemDonation.itemName}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block">Description</span>
                  <p className="text-sm whitespace-pre-wrap">{itemDonation.itemDescription}</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Estimated Value</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(itemDonation.estimatedValue)}</span>
                </div>
              </div>
            </div>

            {/* Images Section */}
            {itemDonation.images && itemDonation.images.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Uploaded Images
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {itemDonation.images.map((url, index) => (
                    <img
                      key={index}
                      src={url || "/placeholder.svg"}
                      alt={`Donation image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Donor Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-primary" />
                Donor Information
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Name</span>
                    <span className="text-sm font-medium">{itemDonation.donorName}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <span className="text-sm font-medium">{itemDonation.donorEmail}</span>
                  </div>
                </div>
                {itemDonation.donorPhone && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Phone</span>
                      <span className="text-sm font-medium">{itemDonation.donorPhone}</span>
                    </div>
                  </div>
                )}
                {itemDonation.donorOrganization && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Organization</span>
                      <span className="text-sm font-medium">{itemDonation.donorOrganization}</span>
                    </div>
                  </div>
                )}
                {itemDonation.donorAddress && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg sm:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Address</span>
                      <span className="text-sm font-medium">{itemDonation.donorAddress}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Delivery Method */}
            {itemDonation.deliveryMethod && itemDonation.deliveryMethod.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Delivery Preferences
                </h3>
                <div className="space-y-2">
                  {itemDonation.deliveryMethod.map((method) => (
                    <div key={method} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{deliveryMethodLabels[method] || method}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {itemDonation.donationNotes && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Additional Notes
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                  {itemDonation.donationNotes}
                </p>
              </div>
            )}

            <Separator />

            {/* Submission Details */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Submission Details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Event</span>
                  <span className="text-sm font-medium">{itemDonation.eventName}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Submitted</span>
                  <span className="text-sm font-medium">{formatDate(itemDonation.submittedAt)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg sm:col-span-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Review
                  </Badge>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
              <p className="font-semibold text-blue-900 mb-2">What happens next?</p>
              <ul className="space-y-1.5 text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-medium">1.</span>
                  Our team will review your donation within 2-3 business days
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">2.</span>
                  We will contact you at {itemDonation.donorEmail} to confirm details
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">3.</span>
                  Once approved, your item will be added to the auction
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">4.</span>
                  We will coordinate pickup or delivery arrangements with you
                </li>
              </ul>
            </div>

            {/* Tax Information */}
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-semibold mb-2">Tax Deductibility Information</p>
              <p className="text-muted-foreground">
                This item donation may be tax-deductible. Please keep this receipt for your records and consult with
                your tax advisor. A confirmation email has been sent to {itemDonation.donorEmail}.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row print:hidden">
              <Button onClick={handlePrint} variant="outline" className="flex-1 bg-transparent">
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/">Return Home</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/auctions">View Auctions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Money Donation Receipt (existing functionality)
  if (moneyDonation) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 print:py-4">
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <CardTitle className="text-3xl">Thank You for Your Donation!</CardTitle>
            <CardDescription>Your generosity makes a difference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Receipt Header */}
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Donation Receipt</p>
              <p className="text-2xl font-bold">{formatCurrency(moneyDonation.payment.amount)}</p>
            </div>

            {/* Donation Details */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Receipt Number:</span>
                <span className="font-mono text-sm">{moneyDonation.payment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm">{formatDate(moneyDonation.payment.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Event:</span>
                <span className="text-sm font-medium">{moneyDonation.event.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Donor Name:</span>
                <span className="text-sm">{moneyDonation.payment.donor_name}</span>
              </div>
              {moneyDonation.payment.donor_email && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm">{moneyDonation.payment.donor_email}</span>
                </div>
              )}
              {moneyDonation.payment.message && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Message:</span>
                  <p className="rounded-md bg-muted p-3 text-sm italic">{moneyDonation.payment.message}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Payment Details</h3>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Donation Amount:</span>
                <span className="text-sm">{formatCurrency(moneyDonation.payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment Status:</span>
                <Badge variant={moneyDonation.payment.status === "completed" ? "default" : "secondary"}>
                  {moneyDonation.payment.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment Method:</span>
                <Badge variant="outline">
                  {moneyDonation.stripe.payment_status === "paid" ? "Card Payment" : "Pending"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Tax Information */}
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-semibold mb-2">Tax Deductibility Information</p>
              <p className="text-muted-foreground">
                This donation may be tax-deductible. Please consult with your tax advisor and keep this receipt for your
                records. A confirmation email has been sent to{" "}
                {moneyDonation.payment.donor_email || "your email address"}.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row print:hidden">
              <Button onClick={handlePrint} variant="outline" className="flex-1 bg-transparent">
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/">Return Home</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/auctions">View Auctions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function DonationSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <DonationSuccessContent />
    </Suspense>
  )
}
