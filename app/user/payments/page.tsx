"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, X } from "lucide-react"
import { PaymentDetailsSheet } from "@/components/admin/payment-details-sheet"
import { PaymentReceiptDialog } from "@/components/admin/payment-receipt-dialog"

export default function PaymentsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event } = useEvent()
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && event?.id) {
      fetchPayments()
    }
  }, [user, event?.id, searchQuery, typeFilter, statusFilter])

  const fetchPayments = async () => {
    if (!event?.id) return

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)

      const url = `/api/events/${event.id}/payments${params.toString() ? `?${params.toString()}` : ""}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Filter to only show current user's payments
        const userPayments = (data.payments || []).filter((p: any) => p.user_id === user?.id)

        const uniquePayments = Array.from(new Map(userPayments.map((p: any) => [p.id, p])).values())

        setPayments(uniquePayments)
      } else {
        console.error("[v0] Failed to fetch payments:", response.status)
        setPayments([])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch payments:", error)
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment)
    setIsPaymentSheetOpen(true)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setStatusFilter("all")
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      auction: "bg-blue-100 text-blue-800",
      ticket: "bg-green-100 text-green-800",
      shop: "bg-purple-100 text-purple-800",
      donation: "bg-orange-100 text-orange-800",
      raffle: "bg-pink-100 text-pink-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
        <p className="text-muted-foreground">View all your transaction history for this event</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by item or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Payment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="auction">Auction</SelectItem>
            <SelectItem value="ticket">Ticket</SelectItem>
            <SelectItem value="shop">Shop</SelectItem>
            <SelectItem value="donation">Donation</SelectItem>
            <SelectItem value="raffle">Raffle</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || typeFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="icon" onClick={handleClearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="p-4 text-left text-sm font-medium">Item</th>
              <th className="p-4 text-left text-sm font-medium">Type</th>
              <th className="p-4 text-left text-sm font-medium">Amount</th>
              <th className="p-4 text-left text-sm font-medium">Date</th>
              <th className="p-4 text-left text-sm font-medium">Status</th>
              <th className="p-4 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No payment history yet
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-medium">{payment.auction_title || "N/A"}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className={getTypeColor(payment.payment_type)}>
                      {payment.payment_type?.charAt(0).toUpperCase() + payment.payment_type?.slice(1)}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm font-medium">${Number(payment.amount).toFixed(2)}</td>
                  <td className="p-4 text-sm">{new Date(payment.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <Badge variant="secondary" className={getStatusColor(payment.status)}>
                      {payment.status === "completed"
                        ? "Completed"
                        : payment.status === "pending"
                          ? "Pending"
                          : "Failed"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <PaymentReceiptDialog
                        payment={payment}
                        eventId={event.id}
                        eventName={event.event_name}
                        organizationName={event.organization_name}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleViewPayment(payment)}>
                        Details
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaymentDetailsSheet
        isOpen={isPaymentSheetOpen}
        onClose={() => setIsPaymentSheetOpen(false)}
        payment={selectedPayment}
      />
    </div>
  )
}
