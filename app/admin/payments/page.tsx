"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Search, X } from "lucide-react"
import { PaymentDetailsSheet } from "@/components/admin/payment-details-sheet"
import { PaymentReceiptDialog } from "@/components/admin/payment-receipt-dialog"

export default function AdminPaymentsPage() {
  const { event } = useEvent()
  const { user } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      try {
        const response = await fetch("/api/auth/check-admin")
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error("[v0] Failed to check admin status:", error)
        setIsAdmin(false)
      }
    }

    checkAdmin()
  }, [user])

  useEffect(() => {
    if (event?.id) {
      fetchPayments()
    }
  }, [event?.id, searchQuery, typeFilter, statusFilter])

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
        setPayments(data.payments || [])
      } else {
        console.error("[v0] Failed to fetch payments:", response.status, await response.text())
        setPayments([])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch payments:", error)
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    if (!event?.id || isSyncing) return

    setIsSyncing(true)
    try {
      const response = await fetch(`/api/events/${event.id}/payments/sync-stripe`, {
        method: "POST",
      })

      // Check content type before parsing
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")

      if (!isJson) {
        throw new Error("Invalid response from server. Please try again.")
      }

      if (response.ok) {
        const data = await response.json()

        // Show warnings if there were any errors during sync
        if (data.errors && data.errors.length > 0) {
          toast({
            title: "Sync Completed with Warnings",
            description: (
              <div className="space-y-2">
                <p>
                  Created {data.created} new payment(s), updated {data.updated}, {data.skipped} unchanged
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">View errors ({data.errors.length})</summary>
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    {data.errors.slice(0, 5).map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {data.errors.length > 5 && <li>...and {data.errors.length - 5} more</li>}
                  </ul>
                </details>
              </div>
            ),
            duration: 10000,
          })
        } else {
          const deletedMsg = data.deletedOldPending > 0 ? `, deleted ${data.deletedOldPending} old pending` : ""
          toast({
            title: "Sync Complete",
            description: `Created ${data.created} new payment(s), updated ${data.updated}, ${data.skipped} unchanged${deletedMsg}`,
          })
        }

        await fetchPayments()
      } else {
        const errorData = await response.json()

        // Display specific error messages based on the error type
        let errorTitle = "Sync Failed"
        let errorDescription = errorData.message || "Failed to sync from Stripe"

        if (response.status === 403 || response.status === 401) {
          errorTitle = errorData.error || "Authentication Error"
          errorDescription = (
            <div className="space-y-2">
              <p>{errorData.message}</p>
              {errorData.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Technical details</summary>
                  <p className="mt-1 font-mono text-xs bg-muted p-2 rounded">{errorData.details}</p>
                </details>
              )}
            </div>
          )
        } else if (response.status === 502 || response.status === 503) {
          errorTitle = errorData.error || "Connection Error"
        }

        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
          duration: 10000,
        })
      }
    } catch (error: any) {
      console.error("[v0] Sync error:", error)
      toast({
        title: "Network Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleViewPayment = (payment: any) => {
    setSelectedPayment({ ...payment, event_id: event?.id })
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
      sponsor: "bg-indigo-100 text-indigo-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case "completed":
      case "succeeded":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusDisplay = (status: string) => {
    const normalizedStatus = status?.toLowerCase()
    if (normalizedStatus === "succeeded" || normalizedStatus === "completed") {
      return "Completed"
    }
    return status?.charAt(0).toUpperCase() + status?.slice(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8 py-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Track all payment transactions for this event</p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Stripe Status
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer name or email..."
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
            <SelectItem value="sponsor">Sponsor</SelectItem>
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
              <th className="p-4 text-left text-sm font-medium">Customer</th>
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
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium">{payment.user_name}</p>
                      <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                    </div>
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
                      {getStatusDisplay(payment.status)}
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
        isAdmin={isAdmin}
        onUpdate={fetchPayments}
      />
    </div>
  )
}
