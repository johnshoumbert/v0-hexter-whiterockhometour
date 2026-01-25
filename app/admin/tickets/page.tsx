"use client"

import { useEffect, useState, useMemo } from "react"
import { useEvent } from "@/contexts/event-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  Trash2,
  Plus,
  Loader2,
  ExternalLink,
  HelpCircle,
  X,
  TicketIcon,
  Users,
  MessageSquare,
  Download,
  Menu,
  ChevronDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { RichTextEditor } from "@/components/rich-text-editor"

// Removed duplicate interface definition for Ticket
interface Ticket {
  id: string
  name: string
  description: string | null
  instructions: string | null
  price: number | string
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
  display_order: number
  early_bird_price?: number | string | null
  early_bird_end_date?: string | null
  regular_price?: number | string | null
  regular_end_date?: string | null
  late_price?: number | string | null
}

interface PricingTier {
  id: string
  ticket_id: string
  tier_name: string
  price: number
  start_date: string | null
  end_date: string | null
  display_order: number
}

interface TicketPurchase {
  id: string
  user_name: string
  user_email: string
  user_phone?: string
  ticket_name: string
  ticket_price?: number
  quantity: number
  total_amount: number
  status: string
  created_at: string
  admin_notes?: string
  is_revoked?: boolean
  revoked_at?: string
  refund_status?: string
  refund_amount?: number
  refunded_at?: string
  stripe_session_id?: string
  stripe_payment_intent?: string
  stripe_refund_id?: string
  ticket_id: string // Added for filtering
  is_claimed?: boolean // Added is_claimed and claimed_at to the TicketPurchase interface
  claimed_at?: string
}

interface Question {
  id: string
  question_text: string
  question_type: "text" | "select" | "multiselect"
  options: string[] | null
  is_required: boolean
  display_order: number
}

export default function TicketsPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [newTicket, setNewTicket] = useState({
    name: "",
    description: "",
    instructions: "",
    price: "0.00",
    quantity_available: "",
    is_active: true,
  })

  const [editingTickets, setEditingTickets] = useState<Record<string, Partial<Ticket>>>({})

  const [pricingTiers, setPricingTiers] = useState<Record<string, PricingTier[]>>({})
  const [newTier, setNewTier] = useState<Record<string, Partial<PricingTier>>>({})

  const [selectedPurchase, setSelectedPurchase] = useState<TicketPurchase | null>(null)
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false)
  const [editNotes, setEditNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const [isClaimProcessing, setIsClaimProcessing] = useState(false)

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [showQuestionsSheet, setShowQuestionsSheet] = useState(false)
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    question_type: "text" as "text" | "select" | "multiselect",
    options: [""],
    is_required: false,
  })

  const [responses, setResponses] = useState<any[]>([])
  const [filteredResponses, setFilteredResponses] = useState<any[]>([])
  const [responseFilters, setResponseFilters] = useState({
    ticketType: "",
    question: "",
    search: "",
  })
  const [filteredPurchases, setFilteredPurchases] = useState<any[]>([])
  const [purchaseFilters, setPurchaseFilters] = useState({
    ticketType: "",
    status: "",
    search: "",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const responsesPerPage = 10

  // Calculate paginated responses
  const paginatedResponses = useMemo(() => {
    const startIndex = (currentPage - 1) * responsesPerPage
    const endIndex = startIndex + responsesPerPage
    return filteredResponses.slice(startIndex, endIndex)
  }, [filteredResponses, currentPage])

  const totalPages = Math.ceil(filteredResponses.length / responsesPerPage)

  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set())

  const toggleTicketExpanded = (ticketId: string) => {
    const newExpanded = new Set(expandedTickets)
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId)
    } else {
      newExpanded.add(ticketId)
    }
    setExpandedTickets(newExpanded)
  }

  const exportToCSV = () => {
    if (filteredResponses.length === 0) return

    const headers = ["User Name", "User Email", "Ticket Type", "Question", "Response", "Registration Count", "Date"]
    const rows = filteredResponses.map((r) => [
      r.user_name,
      r.user_email,
      r.ticket_name,
      r.question_text,
      r.question_type === "multiselect" && r.response_array
        ? (Array.isArray(r.response_array) ? r.response_array : JSON.parse(r.response_array as string)).join("; ")
        : r.response_text || "",
      r.registration_count || 1,
      new Date(r.created_at).toLocaleDateString(),
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `ticket-responses-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  // Calculate response analytics
  const responseAnalytics = useMemo(() => {
    if (!responses.length) return null

    // Group responses by question
    const byQuestion = responses.reduce((acc: any, r: any) => {
      if (!acc[r.question_id]) {
        acc[r.question_id] = {
          question_text: r.question_text,
          question_type: r.question_type,
          ticket_name: r.ticket_name,
          responses: [],
        }
      }
      acc[r.question_id].responses.push(r)
      return acc
    }, {})

    // Calculate summary stats for each question
    const questionStats = Object.entries(byQuestion).map(([qId, data]: [string, any]) => {
      const totalResponses = data.responses.reduce((sum: number, r: any) => sum + (r.registration_count || 1), 0)
      const uniqueAnswers: { [key: string]: number } = {}

      // Count responses multiplied by registration count
      data.responses.forEach((r: any) => {
        const regCount = r.registration_count || 1
        if (r.question_type === "multiselect" && r.response_array) {
          const arr = Array.isArray(r.response_array) ? r.response_array : JSON.parse(r.response_array)
          arr.forEach((item: string) => {
            uniqueAnswers[item] = (uniqueAnswers[item] || 0) + regCount
          })
        } else if (r.question_type === "select" && r.response_text) {
          uniqueAnswers[r.response_text] = (uniqueAnswers[r.response_text] || 0) + regCount
        } else if (r.question_type === "text" && r.response_text) {
          uniqueAnswers["Text Response"] = (uniqueAnswers["Text Response"] || 0) + regCount
        }
      })

      const chartData = Object.entries(uniqueAnswers).map(([answer, count]) => ({
        answer,
        count,
        percentage: ((count / totalResponses) * 100).toFixed(1),
      }))

      return {
        questionId: qId,
        questionText: data.question_text,
        questionType: data.question_type,
        ticketName: data.ticket_name,
        totalResponses,
        uniqueResponseCount: data.responses.length, // Added to display number of submissions
        chartData,
      }
    })

    return {
      totalResponses: responses.reduce((sum: any, r: any) => sum + (r.registration_count || 1), 0),
      uniqueUsers: new Set(responses.map((r: any) => r.user_id)).size,
      questionStats,
    }
  }, [responses])

  const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  // Calculate ticket analytics for dashboard summary
  const ticketAnalytics = useMemo(() => {
    if (tickets.length === 0) return null

    const totalTicketsSold = tickets.reduce((sum, ticket) => sum + (ticket.quantity_sold || 0), 0)
    const totalRevenue = tickets.reduce((sum, ticket) => {
      const price = typeof ticket.price === 'string' ? parseFloat(ticket.price) : ticket.price
      return sum + (price * (ticket.quantity_sold || 0))
    }, 0)
    const totalAvailable = tickets.reduce((sum, ticket) => {
      if (ticket.quantity_available === null) return sum
      return sum + ticket.quantity_available
    }, 0)
    const activeTickets = tickets.filter(t => t.is_active).length

    const ticketTypeBreakdown = tickets.map(ticket => {
      const price = typeof ticket.price === 'string' ? parseFloat(ticket.price) : ticket.price
      const available = ticket.quantity_available
      const sold = ticket.quantity_sold || 0
      const remaining = available !== null ? available - sold : null

      return {
        id: ticket.id,
        name: ticket.name,
        price: price,
        sold: sold,
        available: available,
        remaining: remaining,
        revenue: price * sold,
        isActive: ticket.is_active,
        percentageSold: available && available > 0 ? ((sold / available) * 100).toFixed(1) : null
      }
    }).sort((a, b) => b.sold - a.sold)

    return {
      totalTicketsSold,
      totalRevenue,
      totalAvailable,
      activeTickets,
      ticketTypeBreakdown
    }
  }, [tickets])

  useEffect(() => {
    if (event?.id) {
      fetchTickets()
      fetchPurchases()
      fetchResponses()
    }
  }, [event?.id])

  const fetchTickets = async () => {
    if (!event) return

    try {
      const res = await fetch(`/api/events/${event.id}/tickets`)

      if (res.ok) {
        const data = await res.json()
        const ticketsWithNumbers = (data.tickets || []).map((ticket: Ticket) => ({
          ...ticket,
          price: typeof ticket.price === "string" ? Number.parseFloat(ticket.price) : ticket.price,
        }))
        setTickets(ticketsWithNumbers)
        setNeedsSetup(false)

        for (const ticket of ticketsWithNumbers) {
          await fetchPricingTiers(ticket.id)
        }
      } else {
        const errorData = await res.json()
        console.error("[v0] Failed to fetch tickets:", res.status, errorData)

        if (errorData.details?.includes('relation "event_tickets" does not exist')) {
          setNeedsSetup(true)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPurchases = async () => {
    if (!event) return

    try {
      console.log("[v0] Fetching ticket purchases for event:", event.id)
      const res = await fetch(`/api/events/${event.id}/ticket-purchases?showAll=true`)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Ticket purchases data:", data)
        setPurchases(data.purchases || [])
        setFilteredPurchases(data.purchases || []) // Initialize filteredPurchases
      } else {
        console.error("[v0] Failed to fetch ticket purchases:", res.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching ticket purchases:", error)
    }
  }

  const fetchResponses = async () => {
    try {
      console.log("[v0] Fetching responses for event:", event?.id)
      const res = await fetch(`/api/events/${event?.id}/ticket-responses`)
      console.log("[v0] Responses fetch status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Responses data received:", data)
        console.log("[v0] Number of responses:", data.length)
        setResponses(data)
        setFilteredResponses(data)
      } else {
        const errorData = await res.json()
        console.error("[v0] Error response:", errorData)
      }
    } catch (error) {
      console.error("[v0] Error fetching responses:", error)
    }
  }

  const fetchQuestions = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/events/${event?.id}/tickets/${ticketId}/questions`) // Use optional chaining
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.setupRequired ? [] : data)
      }
    } catch (error) {
      console.error("[v0] Error fetching questions:", error)
    }
  }

  const fetchPricingTiers = async (ticketId: string) => {
    try {
      console.log("[v0] Fetching pricing tiers for ticket:", ticketId)
      const response = await fetch(`/api/events/${event.id}/tickets/${ticketId}/pricing-tiers`)
      if (response.ok) {
        const data = await response.json()
        const tiersWithLocalDates = (data.tiers || []).map((tier: PricingTier) => ({
          ...tier,
          start_date: tier.start_date ? formatUTCToLocalDatetime(tier.start_date) : null,
          end_date: tier.end_date ? formatUTCToLocalDatetime(tier.end_date) : null,
        }))
        console.log("[v0] Pricing tiers with local dates:", tiersWithLocalDates)
        setPricingTiers((prev) => ({ ...prev, [ticketId]: tiersWithLocalDates }))
      } else {
        console.error("[v0] Failed to fetch pricing tiers:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching pricing tiers:", error)
    }
  }

  const formatUTCToLocalDatetime = (utcString: string): string => {
    // Parse the UTC date string
    const date = new Date(utcString)
    // Get the local date/time components
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    // Return in datetime-local input format (YYYY-MM-DDTHH:MM) in user's local timezone
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const formatLocalDatetimeToISO = (localDatetime: string): string => {
    if (!localDatetime) return ""
    // The datetime-local input gives us a string like "2026-01-01T00:00"
    // We need to treat this as the user's local time and convert to UTC
    const date = new Date(localDatetime)
    // Convert to ISO string (which is in UTC)
    return date.toISOString()
  }

  const handleAddTicket = async () => {
    if (!event || !newTicket.name) {
      toast({
        title: "Error",
        description: "Please enter a ticket name",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${event.id}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTicket.name,
          description: newTicket.description || null,
          instructions: newTicket.instructions || null,
          price: Number.parseFloat(newTicket.price) || 0,
          quantity_available: newTicket.quantity_available ? Number.parseInt(newTicket.quantity_available) : null,
          is_active: newTicket.is_active,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to add ticket")
      }

      toast({
        title: "Success",
        description: "Ticket added successfully",
      })

      setShowAddDialog(false)
      setNewTicket({
        name: "",
        description: "",
        instructions: "",
        price: "0.00",
        quantity_available: "",
        is_active: true,
      })
      fetchTickets()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add ticket",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTicketFieldChange = (ticketId: string, updates: Partial<Ticket>) => {
    setEditingTickets((prev) => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        ...updates,
      },
    }))
  }

  const handleSaveTicketChanges = async (ticketId: string) => {
    if (!event || !editingTickets[ticketId]) return

    console.log("[v0] Saving ticket changes for ticketId:", ticketId)
    console.log("[v0] Changes to save:", editingTickets[ticketId])

    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${event.id}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTickets[ticketId]),
      })

      console.log("[v0] Save response status:", res.status)

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[v0] Save error response:", errorData)
        throw new Error("Failed to update ticket")
      }

      const responseData = await res.json()
      console.log("[v0] Save successful, response:", responseData)

      toast({
        title: "Success",
        description: "Ticket saved successfully",
      })

      // Clear the editing state for this ticket
      setEditingTickets((prev) => {
        const updated = { ...prev }
        delete updated[ticketId]
        return updated
      })

      fetchTickets()
    } catch (error) {
      console.error("[v0] Error saving ticket:", error)
      toast({
        title: "Error",
        description: "Failed to save ticket",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    if (!event) return

    try {
      const res = await fetch(`/api/events/${event.id}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        throw new Error("Failed to update ticket")
      }

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      })

      fetchTickets()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!event || !confirm("Are you sure you want to delete this ticket?")) return

    try {
      const res = await fetch(`/api/events/${event.id}/tickets/${ticketId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete ticket")
      }

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      })

      fetchTickets()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      })
    }
  }

  const handleSavePricingTier = async (ticketId: string, tier: PricingTier) => {
    console.log("[v0] Saving pricing tier:", {
      tierId: tier.id,
      tierName: tier.tier_name,
      price: tier.price,
      startDate: tier.start_date,
      endDate: tier.end_date,
    })

    setIsSaving(true)
    try {
      const requestBody = {
        tierName: tier.tier_name,
        price: tier.price,
        startDate: tier.start_date ? formatLocalDatetimeToISO(tier.start_date) : null,
        endDate: tier.end_date ? formatLocalDatetimeToISO(tier.end_date) : null,
        displayOrder: tier.display_order,
      }

      console.log("[v0] Request body with ISO timestamps:", requestBody)

      const response = await fetch(`/api/events/${event.id}/tickets/${ticketId}/pricing-tiers/${tier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Server response:", data)
        toast({ title: "Success", description: "Pricing tier updated successfully" })
        // FIX: Added ticket variable to fetchPricingTiers, as it was missing.
        await fetchPricingTiers(ticketId)
      } else {
        const errorData = await response.json()
        console.error("[v0] Server error:", errorData)
        throw new Error(errorData.error || "Failed to update pricing tier")
      }
    } catch (error) {
      console.error("[v0] Error in handleSavePricingTier:", error)
      toast({ title: "Error", description: "Failed to update pricing tier", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePricingTier = async (ticketId: string) => {
    const tier = newTier[ticketId]

    console.log("[v0] Attempting to create pricing tier:", { ticketId, tier })

    if (!tier?.tier_name || tier.price === undefined) {
      console.log("[v0] Validation failed: Missing tier name or price")
      toast({
        title: "Validation Error",
        description: "Please enter both a tier name and price before adding the pricing tier",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    if (!tier.start_date || !tier.end_date) {
      console.log("[v0] Validation failed: Missing start or end date")
      toast({
        title: "Validation Error",
        description: "Both start date and end date are required for pricing tiers",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    const startDate = new Date(tier.start_date)
    const endDate = new Date(tier.end_date)

    if (startDate >= endDate) {
      console.log("[v0] Validation failed: Start date must be before end date")
      toast({
        title: "Validation Error",
        description: "Start date must be before end date",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    const existingTiers = pricingTiers[ticketId] || []
    const hasOverlap = existingTiers.some((existingTier) => {
      if (!existingTier.start_date || !existingTier.end_date) return false

      const existingStart = new Date(existingTier.start_date)
      const existingEnd = new Date(existingTier.end_date)

      return (
        (startDate >= existingStart && startDate < existingEnd) ||
        (endDate > existingStart && endDate <= existingEnd) ||
        (startDate <= existingStart && endDate >= existingEnd)
      )
    })

    if (hasOverlap) {
      const overlappingTier = existingTiers.find((existingTier) => {
        if (!existingTier.start_date || !existingTier.end_date) return false
        const existingStart = new Date(existingTier.start_date)
        const existingEnd = new Date(existingTier.end_date)
        return (
          (startDate >= existingStart && startDate < existingEnd) ||
          (endDate > existingStart && endDate <= existingEnd) ||
          (startDate <= existingStart && endDate >= existingEnd)
        )
      })

      console.log("[v0] Validation failed: Date range overlap detected", {
        overlappingTier: overlappingTier?.tier_name,
      })
      toast({
        title: "Validation Error",
        description: `Date range overlaps with existing tier "${overlappingTier?.tier_name}"`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    setIsSaving(true)
    try {
      const requestBody = {
        tierName: tier.tier_name,
        price: tier.price,
        startDate: formatLocalDatetimeToISO(tier.start_date as string),
        endDate: formatLocalDatetimeToISO(tier.end_date as string),
        displayOrder: tier.display_order || 0,
      }

      console.log("[v0] Creating tier with body:", requestBody)

      const response = await fetch(`/api/events/${event.id}/tickets/${ticketId}/pricing-tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        console.log("[v0] Pricing tier created successfully")
        toast({ title: "Success", description: "Pricing tier created successfully" })
        setNewTier((prev) => ({ ...prev, [ticketId]: {} }))
        await fetchPricingTiers(ticketId)
      } else {
        const errorData = await response.json()
        console.error("[v0] Server error creating tier:", errorData)
        throw new Error(errorData.error || "Failed to create pricing tier")
      }
    } catch (error: any) {
      console.error("[v0] Error in handleCreatePricingTier:", error.message)
      toast({
        title: "Error",
        description: error.message || "Failed to create pricing tier",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePricingTier = async (ticketId: string, tierId: string) => {
    if (!confirm("Are you sure you want to delete this pricing tier?")) return

    try {
      const response = await fetch(`/api/events/${event.id}/tickets/${ticketId}/pricing-tiers/${tierId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({ title: "Success", description: "Pricing tier deleted successfully" })
        await fetchPricingTiers(ticketId)
      } else {
        throw new Error("Failed to delete pricing tier")
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete pricing tier", variant: "destructive" })
    }
  }

  const handleRowClick = async (purchaseId: string) => {
    if (!event) return

    try {
      const res = await fetch(`/api/events/${event.id}/ticket-purchases/${purchaseId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPurchase(data.purchase)
        setEditNotes(data.purchase.admin_notes || "")
        setIsEditPanelOpen(true)
      }
    } catch (error) {
      console.error("[v0] Error fetching purchase details:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase details",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePurchase = async (updates: any) => {
    if (!event || !selectedPurchase) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/events/${event.id}/ticket-purchases/${selectedPurchase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        throw new Error("Failed to update purchase")
      }

      toast({
        title: "Success",
        description: "Purchase updated successfully",
      })

      // Refresh purchases list
      fetchPurchases()

      // Update selected purchase
      setSelectedPurchase({ ...selectedPurchase, ...updates })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update purchase",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this ticket purchase? This action cannot be undone.")) {
      return
    }

    await handleUpdatePurchase({ is_revoked: true })
  }

  const handleRefund = async () => {
    if (!selectedPurchase || !confirm("Are you sure you want to refund this purchase?")) {
      return
    }

    // Here you would integrate with Stripe to process the refund
    // For now, we'll just mark it as refunded
    await handleUpdatePurchase({
      refund_status: "completed",
      refund_amount: selectedPurchase.total_amount,
    })
  }

  const handleSetClaimed = async () => {
    if (!event || !selectedPurchase) return

    setIsClaimProcessing(true)
    try {
      const res = await fetch(`/api/events/${event.id}/ticket-purchases/${selectedPurchase.id}/claim`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.message || "Failed to set claimed status",
          variant: "destructive",
        })
        return
      }

      const data = await res.json()
      setSelectedPurchase({
        ...selectedPurchase,
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      })

      toast({
        title: "Success",
        description: "Ticket marked as claimed",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set claimed status",
        variant: "destructive",
      })
    } finally {
      setIsClaimProcessing(false)
    }
  }

  const handleUnclaim = async () => {
    if (!event || !selectedPurchase) return

    setIsClaimProcessing(true)
    try {
      const res = await fetch(`/api/events/${event.id}/ticket-purchases/${selectedPurchase.id}/claim`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.message || "Failed to unclaim ticket",
          variant: "destructive",
        })
        return
      }

      setSelectedPurchase({
        ...selectedPurchase,
        is_claimed: false,
        claimed_at: null,
      })

      toast({
        title: "Success",
        description: "Ticket unclaimed",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unclaim ticket",
        variant: "destructive",
      })
    } finally {
      setIsClaimProcessing(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!selectedTicket || !newQuestion.question_text) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${event?.id}/tickets/${selectedTicket.id}/questions`, {
        // Use optional chaining
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: newQuestion.question_text,
          question_type: newQuestion.question_type,
          options: newQuestion.question_type !== "text" ? newQuestion.options.filter((o) => o.trim()) : null,
          is_required: newQuestion.is_required,
        }),
      })

      if (!res.ok) throw new Error("Failed to add question")

      toast({ title: "Success", description: "Question added successfully" })
      setShowAddQuestionDialog(false)
      setNewQuestion({
        question_text: "",
        question_type: "text",
        options: [""],
        is_required: false,
      })
      fetchQuestions(selectedTicket.id)
    } catch (error) {
      toast({ title: "Error", description: "Failed to add question", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTicket) return

    try {
      const res = await fetch(`/api/events/${event?.id}/tickets/${selectedTicket.id}/questions/${questionId}`, {
        // Use optional chaining
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete question")

      toast({ title: "Success", description: "Question deleted successfully" })
      fetchQuestions(selectedTicket.id)
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" })
    }
  }

  useEffect(() => {
    let filtered = responses

    if (responseFilters.ticketType) {
      filtered = filtered.filter((r) => r.ticket_id === responseFilters.ticketType)
    }

    if (responseFilters.question) {
      filtered = filtered.filter((r) => r.question_text.toLowerCase().includes(responseFilters.question.toLowerCase()))
    }

    if (responseFilters.search) {
      filtered = filtered.filter((r) => {
        const searchLower = responseFilters.search.toLowerCase()
        return (
          r.user_name?.toLowerCase().includes(searchLower) ||
          r.user_email?.toLowerCase().includes(searchLower) ||
          r.response_text?.toLowerCase().includes(searchLower) ||
          JSON.stringify(r.response_array)?.toLowerCase().includes(searchLower)
        )
      })
    }

    setFilteredResponses(filtered)
  }, [responses, responseFilters])

  useEffect(() => {
    let filtered = purchases

    if (purchaseFilters.ticketType) {
      filtered = filtered.filter((p) => p.ticket_id === purchaseFilters.ticketType)
    }

    if (purchaseFilters.status) {
      filtered = filtered.filter((p) => p.status === purchaseFilters.status)
    }

    if (purchaseFilters.search) {
      filtered = filtered.filter((p) => {
        const searchLower = purchaseFilters.search.toLowerCase()
        return p.user_name?.toLowerCase().includes(searchLower) || p.user_email?.toLowerCase().includes(searchLower)
      })
    }

    setFilteredPurchases(filtered)
  }, [purchases, purchaseFilters])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-3 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Event Tickets</h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage ticket types and view registrations</p>
        </div>
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" disabled={needsSetup}>
                <Menu className="h-4 w-4" /> {/* Changed to Menu icon */}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                <TicketIcon className="mr-2 h-4 w-4" /> {/* Use renamed TicketIcon */}
                Add Ticket Type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button onClick={() => setShowAddDialog(true)} disabled={needsSetup} className="hidden md:flex">
          <Plus className="mr-2 h-4 w-4" />
          Add Ticket Type
        </Button>
      </div>

      {needsSetup && (
        <Alert>
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            The event_tickets table needs to be created in your database. Please run the SQL script at{" "}
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              scripts/create-tickets-v1.sql
            </code>{" "}
            to set up the tickets feature.
          </AlertDescription>
        </Alert>
      )}

      {/* Dashboard Summary */}
      {ticketAnalytics && tickets.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets Sold</CardTitle>
                <TicketIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ticketAnalytics.totalTicketsSold.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ticketAnalytics.totalAvailable > 0 
                    ? `${((ticketAnalytics.totalTicketsSold / ticketAnalytics.totalAvailable) * 100).toFixed(1)}% of capacity`
                    : 'Unlimited capacity'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${ticketAnalytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg ${ticketAnalytics.totalTicketsSold > 0 ? (ticketAnalytics.totalRevenue / ticketAnalytics.totalTicketsSold).toFixed(2) : '0.00'} per ticket
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Ticket Types</CardTitle>
                <Switch className="h-4 w-4 text-muted-foreground pointer-events-none" checked={ticketAnalytics.activeTickets > 0} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ticketAnalytics.activeTickets}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {tickets.length} total types
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchases.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {responses.length} responses collected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ticket Type Performance</CardTitle>
              <CardDescription>Sales breakdown by ticket type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticketAnalytics.ticketTypeBreakdown.map((ticketType) => (
                  <div key={ticketType.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{ticketType.name}</p>
                        {!ticketType.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Price: ${ticketType.price.toFixed(2)}</span>
                        <span>•</span>
                        <span>Sold: {ticketType.sold}</span>
                        {ticketType.available !== null && (
                          <>
                            <span>•</span>
                            <span>Remaining: {ticketType.remaining}</span>
                            {ticketType.percentageSold && (
                              <>
                                <span>•</span>
                                <span>{ticketType.percentageSold}% sold</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${ticketType.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="types" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="types" className="flex items-center gap-1 md:gap-2">
            <TicketIcon className="h-4 w-4" /> {/* Use renamed TicketIcon */}
            <span className="hidden sm:inline">Ticket Types</span>
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center gap-1 md:gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Registrations</span>
            <span className="sm:hidden">({purchases.length})</span>
            <span className="hidden sm:inline">({purchases.length})</span>
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-1 md:gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Responses</span>
            <span className="sm:hidden">({responses.length})</span>
            <span className="hidden sm:inline">({responses.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-6">
          <div className="grid gap-6">
            {tickets.length === 0 && !needsSetup ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <p className="text-muted-foreground mb-4">No ticket types created yet</p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Ticket Type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tickets.map((ticket) => {
                // Get current edited values or use original ticket values
                const currentTicket = { ...ticket, ...editingTickets[ticket.id] }
                const isEdited = !!editingTickets[ticket.id]

                return (
                  <Collapsible
                    key={ticket.id}
                    open={expandedTickets.has(ticket.id)}
                    onOpenChange={() => toggleTicketExpanded(ticket.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <button className="w-full">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 text-left">
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    expandedTickets.has(ticket.id) ? "" : "-rotate-90"
                                  }`}
                                />
                                <div className="space-y-1">
                                  <CardTitle>{currentTicket.name}</CardTitle>
                                  {currentTicket.description && (
                                    <CardDescription>{currentTicket.description}</CardDescription>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                {isEdited && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveTicketChanges(ticket.id)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => handleDeleteTicket(ticket.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTicket(ticket)
                                    fetchQuestions(ticket.id)
                                    setShowQuestionsSheet(true)
                                  }}
                                >
                                  <HelpCircle className="mr-2 h-4 w-4" />
                                  Questions
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4 border-t pt-4">
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`name-${ticket.id}`}>Ticket Name</Label>
                              <Input
                                id={`name-${ticket.id}`}
                                value={editingTickets[ticket.id]?.name ?? ticket.name}
                                onChange={(e) => handleTicketFieldChange(ticket.id, { name: e.target.value })}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`description-${ticket.id}`}>Description</Label>
                              <Textarea
                                id={`description-${ticket.id}`}
                                value={editingTickets[ticket.id]?.description ?? ticket.description ?? ""}
                                onChange={(e) => handleTicketFieldChange(ticket.id, { description: e.target.value })}
                                className="mt-1"
                                rows={3}
                              />
                            </div>

                            {/* Inside the ticket card CollapsibleContent, replace the pricing section */}
                            <div className="border rounded-lg p-4 bg-muted/30 dark:bg-muted/10 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">Date-Based Pricing Tiers</h4>
                                <Button size="sm" variant="outline" onClick={() => fetchPricingTiers(ticket.id)}>
                                  Refresh
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Create custom pricing tiers that automatically apply based on dates. The first active
                                tier will be used.
                              </p>

                              {/* Base/Default Price */}
                              <div className="pt-2 border-b pb-4">
                                <Label htmlFor={`price-${ticket.id}`} className="text-xs font-semibold">
                                  Base Price (Fallback)
                                </Label>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                  <Input
                                    id={`price-${ticket.id}`}
                                    type="number"
                                    step="0.01"
                                    value={editingTickets[ticket.id]?.price ?? ticket.price}
                                    onChange={(e) =>
                                      handleTicketFieldChange(ticket.id, {
                                        price: Number.parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveTicketChanges(ticket.id)}
                                    disabled={isSaving || !editingTickets[ticket.id]}
                                  >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Base Price"}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Used when no pricing tier is active
                                </p>
                              </div>

                              {/* Existing Pricing Tiers */}
                              {pricingTiers[ticket.id] && pricingTiers[ticket.id].length > 0 && (
                                <div className="space-y-3">
                                  <Label className="text-xs font-semibold">Active Pricing Tiers</Label>
                                  {pricingTiers[ticket.id].map((tier) => (
                                    <Card key={tier.id} className="p-3">
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-xs">Tier Name</Label>
                                            <Input
                                              value={tier.tier_name}
                                              onChange={(e) => {
                                                setPricingTiers((prev) => ({
                                                  ...prev,
                                                  [ticket.id]: prev[ticket.id].map((t) =>
                                                    t.id === tier.id ? { ...t, tier_name: e.target.value } : t,
                                                  ),
                                                }))
                                              }}
                                              placeholder="e.g., Early Bird, Student Rate"
                                              className="mt-1"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Price</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={tier.price}
                                              onChange={(e) => {
                                                setPricingTiers((prev) => ({
                                                  ...prev,
                                                  [ticket.id]: prev[ticket.id].map((t) =>
                                                    t.id === tier.id
                                                      ? { ...t, price: Number.parseFloat(e.target.value) }
                                                      : t,
                                                  ),
                                                }))
                                              }}
                                              className="mt-1"
                                            />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-xs">Start Date (Optional)</Label>
                                            <Input
                                              type="datetime-local"
                                              value={tier.start_date || ""}
                                              onChange={(e) => {
                                                setPricingTiers((prev) => ({
                                                  ...prev,
                                                  [ticket.id]: prev[ticket.id].map((t) =>
                                                    t.id === tier.id ? { ...t, start_date: e.target.value || null } : t,
                                                  ),
                                                }))
                                              }}
                                              className="mt-1"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">End Date (Optional)</Label>
                                            <Input
                                              type="datetime-local"
                                              value={tier.end_date || ""}
                                              onChange={(e) => {
                                                setPricingTiers((prev) => ({
                                                  ...prev,
                                                  [ticket.id]: prev[ticket.id].map((t) =>
                                                    t.id === tier.id ? { ...t, end_date: e.target.value || null } : t,
                                                  ),
                                                }))
                                              }}
                                              className="mt-1"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeletePricingTier(ticket.id, tier.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleSavePricingTier(ticket.id, tier)}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Tier"}
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )}

                              {/* Add New Pricing Tier */}
                              <div className="border-t pt-4">
                                <Label className="text-xs font-semibold">Add New Pricing Tier</Label>
                                <div className="space-y-3 mt-2">
                                  <div className="grid grid-cols-2 gap-3">
                                    <Input
                                      placeholder="Tier Name (e.g., Early Bird)"
                                      value={newTier[ticket.id]?.tier_name || ""}
                                      onChange={(e) =>
                                        setNewTier((prev) => ({
                                          ...prev,
                                          [ticket.id]: { ...prev[ticket.id], tier_name: e.target.value },
                                        }))
                                      }
                                    />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Price"
                                      value={newTier[ticket.id]?.price || ""}
                                      onChange={(e) =>
                                        setNewTier((prev) => ({
                                          ...prev,
                                          [ticket.id]: { ...prev[ticket.id], price: Number.parseFloat(e.target.value) },
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground mb-1">Start Date *</Label>
                                      <Input
                                        type="datetime-local"
                                        placeholder="Start Date"
                                        required
                                        value={newTier[ticket.id]?.start_date || ""}
                                        onChange={(e) =>
                                          setNewTier((prev) => ({
                                            ...prev,
                                            [ticket.id]: { ...prev[ticket.id], start_date: e.target.value },
                                          }))
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground mb-1">End Date *</Label>
                                      <Input
                                        type="datetime-local"
                                        placeholder="End Date"
                                        required
                                        value={newTier[ticket.id]?.end_date || ""}
                                        onChange={(e) =>
                                          setNewTier((prev) => ({
                                            ...prev,
                                            [ticket.id]: { ...prev[ticket.id], end_date: e.target.value },
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCreatePricingTier(ticket.id)}
                                    disabled={isSaving}
                                    className="w-full"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {isSaving ? "Creating..." : "Add Pricing Tier"}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`instructions-${ticket.id}`}>Instructions/Agenda</Label>
                              <RichTextEditor
                                value={editingTickets[ticket.id]?.instructions ?? ticket.instructions ?? ""}
                                onChange={(value) => handleTicketFieldChange(ticket.id, { instructions: value })}
                                placeholder="Add event schedule, what to bring, parking info, etc..."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`quantity-${ticket.id}`}>Quantity Available</Label>
                                <Input
                                  id={`quantity-${ticket.id}`}
                                  type="number"
                                  placeholder="Unlimited"
                                  value={
                                    editingTickets[ticket.id]?.quantity_available ?? ticket.quantity_available ?? ""
                                  }
                                  onChange={(e) =>
                                    handleTicketFieldChange(ticket.id, {
                                      quantity_available: e.target.value ? Number.parseInt(e.target.value) : null,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`display-order-${ticket.id}`}>Display Order</Label>
                                <Input
                                  id={`display-order-${ticket.id}`}
                                  type="number"
                                  value={editingTickets[ticket.id]?.display_order ?? ticket.display_order}
                                  onChange={(e) =>
                                    handleTicketFieldChange(ticket.id, {
                                      display_order: Number.parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`active-${ticket.id}`}
                                  checked={editingTickets[ticket.id]?.is_active ?? ticket.is_active}
                                  onCheckedChange={(checked) =>
                                    handleTicketFieldChange(ticket.id, { is_active: checked })
                                  }
                                />
                                <Label htmlFor={`active-${ticket.id}`}>Active</Label>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTicket(ticket)
                                    fetchQuestions(ticket.id)
                                    setShowQuestionsSheet(true)
                                  }}
                                >
                                  <HelpCircle className="h-4 w-4 mr-1" />
                                  Questions
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSaveTicketChanges(ticket.id)}
                                  disabled={isSaving || !editingTickets[ticket.id]}
                                >
                                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save All"}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteTicket(ticket.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Event Registrations</CardTitle>
              <CardDescription>All users who have registered for this event</CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name or email..."
                    value={purchaseFilters.search}
                    onChange={(e) => setPurchaseFilters({ ...purchaseFilters, search: e.target.value })}
                  />
                </div>
                <select
                  className="border rounded-md px-3 py-2"
                  value={purchaseFilters.ticketType}
                  onChange={(e) => setPurchaseFilters({ ...purchaseFilters, ticketType: e.target.value })}
                >
                  <option value="">All Ticket Types</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  className="border rounded-md px-3 py-2"
                  value={purchaseFilters.status}
                  onChange={(e) => setPurchaseFilters({ ...purchaseFilters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPurchases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {purchases.length === 0 ? "No registrations yet" : "No results match your filters"}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ticket Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Claimed</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow
                        key={purchase.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(purchase.id)}
                      >
                        <TableCell className="font-medium">{purchase.user_name}</TableCell>
                        <TableCell>{purchase.user_email}</TableCell>
                        <TableCell>{purchase.ticket_name}</TableCell>
                        <TableCell>{purchase.quantity}</TableCell>
                        <TableCell>${Number(purchase.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              purchase.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : purchase.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {purchase.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={purchase.is_claimed ? "default" : "secondary"}>
                            {purchase.is_claimed ? "Claimed" : "Not Claimed"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(purchase.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses">
          {/* Add analytics section above the table */}
          {responseAnalytics && responseAnalytics.totalResponses > 0 && (
            <div className="space-y-4 mb-6">
              <div className="grid gap-3 md:gap-4 grid-cols-3">
                <Card className="shadow-md">
                  <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                    <CardTitle className="text-xs md:text-sm font-medium">Total Responses</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                    <div className="text-xl md:text-2xl font-bold">{responseAnalytics.totalResponses}</div>
                    <p className="text-xs text-muted-foreground hidden md:block">Across all questions</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md">
                  <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                    <CardTitle className="text-xs md:text-sm font-medium">Unique Respondents</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                    <div className="text-xl md:text-2xl font-bold">{responseAnalytics.uniqueUsers}</div>
                    <p className="text-xs text-muted-foreground hidden md:block">People who answered</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md">
                  <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                    <CardTitle className="text-xs md:text-sm font-medium">Questions Answered</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                    <div className="text-xl md:text-2xl font-bold">{responseAnalytics.questionStats.length}</div>
                    <p className="text-xs text-muted-foreground hidden md:block">Different questions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts by Question */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Response Breakdown by Question</CardTitle>
                  <CardDescription className="text-sm">Visual summary of all question responses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 md:space-y-8">
                  {responseAnalytics.questionStats.map((stat) => (
                    <div key={stat.questionId} className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm md:text-base">{stat.questionText}</h4>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                          <span>{stat.ticketName}</span>
                          <span>•</span>
                          <span>{stat.totalResponses} responses</span>
                          <span>•</span>
                          <span>{stat.uniqueResponseCount} submissions</span>
                        </div>
                      </div>

                      {stat.questionType === "text" ? (
                        <div className="bg-muted p-3 md:p-4 rounded-md">
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {stat.totalResponses} text responses received
                          </p>
                        </div>
                      ) : (
                        /* Stack charts vertically on mobile for better fit */
                        <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                          {/* Bar Chart */}
                          <ChartContainer
                            config={{
                              count: {
                                label: "Responses",
                                color: "hsl(var(--chart-1))",
                              },
                            }}
                            className="h-[200px] md:h-[200px] w-full"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stat.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="answer" angle={-45} textAnchor="end" height={80} fontSize={10} />
                                <YAxis fontSize={10} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>

                          {/* Pie Chart */}
                          <ChartContainer
                            config={{
                              count: {
                                label: "Responses",
                                color: "hsl(var(--chart-1))",
                              },
                            }}
                            className="h-[200px] md:h-[200px] w-full"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={stat.chartData}
                                  dataKey="count"
                                  nameKey="answer"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={60}
                                  label={({ percentage }) => `${percentage}%`}
                                  labelLine={false}
                                >
                                  {stat.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend wrapperStyle={{ fontSize: "12px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base md:text-lg">Question Responses</CardTitle>
                  <CardDescription className="text-sm">All responses to ticket registration questions</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredResponses.length === 0}
                  className="ml-2 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-0 md:mr-2" />
                  <span className="hidden md:inline">Export CSV</span>
                </Button>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search responses..."
                    value={responseFilters.search}
                    onChange={(e) => setResponseFilters({ ...responseFilters, search: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={responseFilters.ticketType}
                  onChange={(e) => setResponseFilters({ ...responseFilters, ticketType: e.target.value })}
                >
                  <option value="">All Ticket Types</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Filter by question..."
                  className="w-full md:w-64 text-sm"
                  value={responseFilters.question}
                  onChange={(e) => setResponseFilters({ ...responseFilters, question: e.target.value })}
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredResponses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {responses.length === 0 ? "No responses yet" : "No results match your filters"}
                </p>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Ticket Type</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Response</TableHead>
                          <TableHead className="text-center">Reg Count</TableHead> {/* Changed to text-center */}
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedResponses.map((response) => (
                          <TableRow key={response.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{response.user_name}</div>
                                <div className="text-sm text-muted-foreground">{response.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{response.ticket_name}</TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate">{response.question_text}</div>
                            </TableCell>
                            <TableCell className="max-w-md">
                              {response.question_type === "multiselect" && response.response_array ? (
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(response.response_array)
                                    ? response.response_array
                                    : JSON.parse(response.response_array as string)
                                  ).map((item: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="truncate">{response.response_text || "—"}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{response.registration_count || 1}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(response.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {paginatedResponses.map((response) => (
                      <Card key={response.id} className="shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{response.user_name}</p>
                              <p className="text-xs text-muted-foreground">{response.user_email}</p>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge variant="outline" className="text-xs">
                                {response.ticket_name}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {response.registration_count || 1} reg
                              </Badge>
                            </div>
                          </div>
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Question</p>
                            <p className="text-sm">{response.question_text}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
                            {response.question_type === "multiselect" && response.response_array ? (
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(response.response_array)
                                  ? response.response_array
                                  : JSON.parse(response.response_array as string)
                                ).map((item: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm">{response.response_text || "—"}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                            <span>{new Date(response.created_at).toLocaleDateString()}</span>

                            {/* Moved registration count display here for better mobile layout */}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={showQuestionsSheet} onOpenChange={setShowQuestionsSheet}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registration Questions</SheetTitle>
            <SheetDescription>Add custom questions for {selectedTicket?.name} registration</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <Button onClick={() => setShowAddQuestionDialog(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>

            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No registration questions added yet</p>
                <p className="text-sm mt-2">Add questions to collect additional information during registration</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">Q{index + 1}</span>
                            {question.is_required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {question.question_type}
                            </Badge>
                          </div>
                          <p className="font-medium mb-2">{question.question_text}</p>
                          {question.options && question.options.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium mb-1">Options:</p>
                              <ul className="list-disc list-inside">
                                {question.options.map((option, i) => (
                                  <li key={i}>{option}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showAddQuestionDialog} onOpenChange={setShowAddQuestionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Registration Question</DialogTitle>
            <DialogDescription>Create a custom question for ticket registration</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                placeholder="e.g., Will you be attending the luncheon?"
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Answer Type</Label>
              <Select
                value={newQuestion.question_type}
                onValueChange={(value: "text" | "select" | "multiselect") =>
                  setNewQuestion({ ...newQuestion, question_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Free Text</SelectItem>
                  <SelectItem value="select">Single Choice</SelectItem>
                  <SelectItem value="multiselect">Multiple Choice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newQuestion.question_type !== "text" && (
              <div className="space-y-2">
                <Label>Options</Label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options]
                        newOptions[index] = e.target.value
                        setNewQuestion({ ...newQuestion, options: newOptions })
                      }}
                    />
                    {newQuestion.options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOptions = newQuestion.options.filter((_, i) => i !== index)
                          setNewQuestion({ ...newQuestion, options: newOptions })
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ""] })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={newQuestion.is_required}
                onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_required: checked })}
              />
              <Label>Required field</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQuestion} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ticket Type</DialogTitle>
            <DialogDescription>Create a new ticket type for event registration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ticket Name *</Label>
              <Input
                id="name"
                placeholder="e.g., General Admission"
                value={newTicket.name}
                onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-instructions">Instructions / Agenda</Label>
              <Textarea
                id="new-instructions"
                value={newTicket.instructions}
                onChange={(e) => setNewTicket({ ...newTicket, instructions: e.target.value })}
                placeholder="Detailed instructions, agenda, or details for ticket holders (optional)"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be shown to ticket holders with a dedicated button
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTicket.price}
                  onChange={(e) => setNewTicket({ ...newTicket, price: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Enter 0 for free tickets</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Unlimited"
                  value={newTicket.quantity_available}
                  onChange={(e) => setNewTicket({ ...newTicket, quantity_available: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave blank for unlimited</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={newTicket.is_active}
                onCheckedChange={(checked) => setNewTicket({ ...newTicket, is_active: checked })}
              />
              <Label>Make ticket available immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTicket} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isEditPanelOpen} onOpenChange={setIsEditPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-4 py-3">
          {selectedPurchase && (
            <>
              <SheetHeader>
                <SheetTitle>Ticket Purchase Details</SheetTitle>
                <SheetDescription>Manage this ticket purchase, add notes, or process refunds</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Purchase Info */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Purchase ID</Label>
                    <p className="text-sm font-mono">{selectedPurchase.id.slice(0, 8)}...</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant={selectedPurchase.status === "completed" ? "default" : "secondary"}>
                          {selectedPurchase.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Purchase Date</Label>
                      <p className="text-sm">{new Date(selectedPurchase.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold">Customer Information</h4>
                  <div className="space-y-1">
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <p className="text-sm">{selectedPurchase.user_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="text-sm">{selectedPurchase.user_email}</p>
                    </div>
                    {selectedPurchase.user_phone && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="text-sm">{selectedPurchase.user_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold">Ticket Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Ticket Type</Label>
                      <p className="text-sm">{selectedPurchase.ticket_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <p className="text-sm">{selectedPurchase.quantity}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Unit Price</Label>
                      <p className="text-sm">${Number(selectedPurchase.ticket_price || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Amount</Label>
                      <p className="text-sm font-semibold">${Number(selectedPurchase.total_amount).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {selectedPurchase.stripe_payment_intent && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold">Payment Information</h4>
                    <div className="space-y-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">Payment Intent</Label>
                        <p className="text-xs font-mono break-all">{selectedPurchase.stripe_payment_intent}</p>
                      </div>
                      {selectedPurchase.stripe_session_id && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Session ID</Label>
                          <p className="text-xs font-mono break-all">{selectedPurchase.stripe_session_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Refund Status */}
                {selectedPurchase.refund_status && selectedPurchase.refund_status !== "none" && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold">Refund Information</h4>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Refund Status</Label>
                        <div className="mt-1">
                          <Badge variant="outline">{selectedPurchase.refund_status}</Badge>
                        </div>
                      </div>
                      {selectedPurchase.refund_amount && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Refund Amount</Label>
                          <p className="text-sm">${Number(selectedPurchase.refund_amount).toFixed(2)}</p>
                        </div>
                      )}
                      {selectedPurchase.refunded_at && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Refunded At</Label>
                          <p className="text-sm">{new Date(selectedPurchase.refunded_at!).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Revoke Status */}
                {selectedPurchase.is_revoked && (
                  <Alert variant="destructive">
                    <AlertTitle>Revoked</AlertTitle>
                    <AlertDescription>
                      This ticket was revoked on {new Date(selectedPurchase.revoked_at!).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Admin Notes */}
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="admin-notes">Admin Notes</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Add internal notes about this purchase..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={4}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleUpdatePurchase({ admin_notes: editNotes })}
                    disabled={isProcessing}
                  >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Notes
                  </Button>
                </div>

                {/* Actions */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold mb-4">Actions</h4>
                  <div className="flex flex-col gap-2">
                    {!selectedPurchase.is_revoked && selectedPurchase.status === "completed" && (
                      <>
                        {(!selectedPurchase.refund_status || selectedPurchase.refund_status === "none") && (
                          <Button variant="outline" onClick={handleRefund} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Process Refund
                          </Button>
                        )}
                        <Button variant="destructive" onClick={handleRevoke} disabled={isProcessing}>
                          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Revoke Ticket
                        </Button>
                      </>
                    )}
                    {selectedPurchase.stripe_payment_intent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://dashboard.stripe.com/payments/${selectedPurchase.stripe_payment_intent}`,
                            "_blank",
                          )
                        }
                      >
                        View in Stripe
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                    {/* Claim/Unclaim Buttons */}
                    {selectedPurchase.status === "completed" && (
                      <>
                        {selectedPurchase.is_claimed ? (
                          <Button variant="outline" onClick={handleUnclaim} disabled={isClaimProcessing}>
                            {isClaimProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unclaim Ticket
                          </Button>
                        ) : (
                          <Button variant="default" onClick={handleSetClaimed} disabled={isClaimProcessing}>
                            {isClaimProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Claim Ticket
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
