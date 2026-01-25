"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Send,
  Eye,
  Download,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Edit,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { PaymentRequestModal } from "@/components/payment-request-modal"
import { InvoiceDetailsSheet } from "@/components/invoice-details-sheet" // Declare the variable before using it
import { InvoiceSheet } from "@/components/invoice-sheet" // Declare the variable before using it
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  name: string
  email: string
  phone: string | null
  school_name: string | null
  total_amount: number
  status: string
  payment_status?: string
  user_id: string
  payment_id: string | null
  created_at: string
  item_description: string | null
}

interface InvoiceForModal {
  id: string
  invoice_number: string
  final_bid: number
  user_name: string
  user_email: string
  auction_title: string
}

export default function AdminInvoicesPage() {
  const { user } = useAuth()
  const { event } = useEvent()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentRequestInvoice, setPaymentRequestInvoice] = useState<InvoiceForModal | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const searchParams = useSearchParams()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  useEffect(() => {
    if (user && event?.id) {
      fetchInvoices()
    }
  }, [user, event?.id])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchQuery, statusFilter])

  const fetchInvoices = async () => {
    if (!event?.id) return

    console.log("[v0] Fetching invoices for event:", event.id)
    setIsRefreshing(true)

    try {
      const response = await fetch(`/api/events/${event.id}/invoices`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Invoices fetched:", data.invoices?.length || 0)
        setInvoices(data.invoices || [])
      } else {
        throw new Error("Failed to fetch invoices")
      }
    } catch (error) {
      console.error("[v0] Failed to fetch invoices:", error)
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const filterInvoices = () => {
    let filtered = [...invoices]

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "paid") {
        filtered = filtered.filter((inv) => inv.payment_id !== null)
      } else if (statusFilter === "unpaid") {
        filtered = filtered.filter((inv) => inv.payment_id === null)
      } else {
        filtered = filtered.filter((inv) => inv.status === statusFilter)
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(query) ||
          inv.name.toLowerCase().includes(query) ||
          inv.email.toLowerCase().includes(query) ||
          (inv.school_name && inv.school_name.toLowerCase().includes(query)),
      )
    }

    setFilteredInvoices(filtered)
  }

  const getStatusBadge = (invoice: Invoice) => {
    if (invoice.payment_id) {
      return <Badge className="bg-green-500">Paid</Badge>
    }
    if (invoice.status === "pending") {
      return <Badge variant="secondary">Pending</Badge>
    }
    if (invoice.status === "overdue") {
      return <Badge variant="destructive">Overdue</Badge>
    }
    return <Badge variant="outline">{invoice.status}</Badge>
  }

  const handleRequestPayment = (invoice: Invoice) => {
    // Convert to the format expected by PaymentRequestModal
    const invoiceForModal: InvoiceForModal = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      final_bid: invoice.total_amount,
      user_name: invoice.name,
      user_email: invoice.email,
      auction_title: invoice.item_description || "Invoice",
    }
    setPaymentRequestInvoice(invoiceForModal)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id)
  }

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete || !event?.id) return

    setIsDeleting(true)
    try {
      console.log("[v0] Deleting invoice:", invoiceToDelete.id, invoiceToDelete.invoice_number)
      
      const response = await fetch(`/api/po-requests/${invoiceToDelete.id}`, {
        method: "DELETE",
      })

      console.log("[v0] Delete response status:", response.status)
      
      const data = await response.json()
      console.log("[v0] Delete response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete invoice")
      }

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      })

      setInvoiceToDelete(null)
      fetchInvoices()
    } catch (error) {
      console.error("[v0] Failed to delete invoice:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete invoice"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const stats = {
    total: invoices.length,
    paid: invoices.filter((inv) => inv.payment_id !== null).length,
    pending: invoices.filter((inv) => inv.payment_id === null && inv.status === "pending").length,
    overdue: invoices.filter((inv) => inv.status === "overdue").length,
    totalRevenue: invoices
      .filter((inv) => inv.payment_id !== null)
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0),
    pendingRevenue: invoices
      .filter((inv) => inv.payment_id === null)
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0),
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and track all event invoices</p>
        </div>
        <Button onClick={fetchInvoices} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">${stats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">${stats.pendingRevenue.toLocaleString()} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            {filteredInvoices.length} of {invoices.length} invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.name}</div>
                          <div className="text-sm text-muted-foreground">{invoice.email}</div>
                          {invoice.school_name && (
                            <div className="text-xs text-muted-foreground">{invoice.school_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {invoice.item_description || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(invoice.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                            title="View/Edit Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!invoice.payment_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRequestPayment(invoice)}
                              title="Send Invoice"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.open(`/invoice/${invoice.id}`, "_blank")}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Open in New Tab
                              </DropdownMenuItem>
                              {!invoice.payment_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setInvoiceToDelete(invoice)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Invoice
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Request Modal */}
      {paymentRequestInvoice && (
        <PaymentRequestModal
          win={paymentRequestInvoice}
          open={!!paymentRequestInvoice}
          onClose={() => setPaymentRequestInvoice(null)}
          onSuccess={() => {
            setPaymentRequestInvoice(null)
            fetchInvoices()
          }}
        />
      )}

      {/* Invoice Sheet */}
      {selectedInvoiceId && event?.id && (
        <InvoiceSheet
          open={!!selectedInvoiceId}
          onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
          invoiceId={selectedInvoiceId}
          eventId={event.id}
          onDelete={() => {
            setSelectedInvoiceId(null)
            fetchInvoices()
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoice_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} disabled={isDeleting} className="bg-destructive">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
