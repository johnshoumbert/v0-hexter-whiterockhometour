"use client"

import { Switch } from "@/components/ui/switch"

import { SheetTrigger } from "@/components/ui/sheet"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Check, X, MoreVertical, FileText } from "lucide-react"
import { toast } from "sonner"
import { useEvent } from "@/contexts/event-context"
import { Badge } from "@/components/ui/badge"
import { InvoiceSheet } from "@/components/invoice-sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

interface Sponsor {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  level: string
  sponsorship_amount: number | null
  contact_name: string
  contact_email: string
  contact_phone?: string
  description?: string
  internal_notes?: string
  show_on_home?: boolean
  show_on_auction_item?: boolean
  created_at: string
}

interface SponsorLevel {
  level: string
  name: string
  amount: number
  description: string
  benefits: string[]
  sponsor_limit?: number | null
  show_on_home?: boolean
  show_on_auction_item?: boolean
}

interface SponsorRequest {
  id: string
  contact_name: string
  contact_email: string
  company_name: string
  sponsorship_level: string
  custom_amount: number
  payment_method: string
  status: string
  payment_status?: string
  invoice_id?: string
  invoice_number?: string
  created_at: string
}

export default function AdminSponsorsPage() {
  const { event } = useEvent()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [sponsorLevels, setSponsorLevels] = useState<SponsorLevel[]>([])
  const [sponsorRequests, setSponsorRequests] = useState<SponsorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())
  const [editingLevels, setEditingLevels] = useState<Record<string, Partial<SponsorLevel>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null)
  const [sponsorFilter, setSponsorFilter] = useState<"all" | "assigned" | "unassigned">("all")
  const [selectedRequest, setSelectedRequest] = useState<SponsorRequest | null>(null)
  const [requestSheetOpen, setRequestSheetOpen] = useState(false)
  const [newLevelSheetOpen, setNewLevelSheetOpen] = useState(false)
  const [newLevelData, setNewLevelData] = useState({
    name: "",
    level: "",
    amount: "",
    description: "",
    sponsor_limit: "",
    benefits: [""] as string[],
    show_on_home: true,
    show_on_auction_item: true,
  })
  const [formData, setFormData] = useState<{
    name: string
    logo_url: string
    website_url: string
    level: string
    sponsorship_amount: string
    contact_name: string
    contact_email: string
    contact_phone: string
    description: string
    internal_notes: string
    show_on_home: boolean
    show_on_auction_item: boolean
  }>({
    name: "",
    logo_url: "",
    website_url: "",
    level: "",
    sponsorship_amount: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    internal_notes: "",
    show_on_home: true,
    show_on_auction_item: true,
  })
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [requestSearchQuery, setRequestSearchQuery] = useState("")
  const [requestLevelFilter, setRequestLevelFilter] = useState<string>("all")

  useEffect(() => {
    if (event?.id) {
      fetchData()
    }
  }, [event?.id])

  const fetchData = async () => {
    if (!event?.id) return
    setLoading(true)
    try {
      await Promise.all([fetchSponsors(), fetchSponsorLevels(), fetchSponsorRequests()])
    } finally {
      setLoading(false)
    }
  }

  const fetchSponsors = async () => {
    try {
      const response = await fetch(`/api/events/${event?.id}/sponsors`)
      const data = await response.json()
      setSponsors(data.sponsors || [])
    } catch (error) {
      toast.error("Failed to load sponsors")
    }
  }

  const fetchSponsorLevels = async () => {
    try {
      const response = await fetch(`/api/events/${event?.id}/sponsor-levels`)
      const data = await response.json()
      const mappedLevels =
        data.levels?.map((level: any) => ({
          ...level,
          benefits: level.benefits?.map((b: any) => b.benefit_text) || [],
        })) || getDefaultLevels()
      setSponsorLevels(mappedLevels)
    } catch (error) {
      setSponsorLevels(getDefaultLevels())
    }
  }

  const fetchSponsorRequests = async () => {
    try {
      const response = await fetch(`/api/events/${event?.id}/sponsor-requests`)
      const data = await response.json()
      setSponsorRequests(data.requests || [])
    } catch (error) {
      toast.error("Failed to load sponsor requests")
    }
  }

  const getDefaultLevels = (): SponsorLevel[] => [
    {
      name: "Platinum",
      level: "platinum",
      amount: 5000,
      description: "Premium sponsorship with maximum visibility",
      benefits: [
        "Complimentary event tickets",
        "Logo on all promotional materials",
        "Recognition on event screens",
        "Social media mentions",
      ],
      sponsor_limit: null,
    },
    {
      name: "Gold",
      level: "gold",
      amount: 2500,
      description: "High-visibility sponsorship",
      benefits: ["Logo on promotional materials", "Event recognition", "Social media mention"],
      sponsor_limit: null,
    },
    {
      name: "Silver",
      level: "silver",
      amount: 1000,
      description: "Standard sponsorship",
      benefits: ["Logo on website", "Program listing"],
      sponsor_limit: null,
    },
    {
      name: "Bronze",
      level: "bronze",
      amount: 500,
      description: "Entry-level sponsorship",
      benefits: ["Website mention"],
      sponsor_limit: null,
    },
  ]

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: uploadFormData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setFormData((prev) => ({ ...prev, logo_url: data.url }))
      toast.success("Logo uploaded successfully")
    } catch (error) {
      toast.error("Failed to upload logo")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event?.id) return

    setLoading(true)
    try {
      const url = `/api/events/${event.id}/sponsors`
      const method = editingSponsorId ? "PUT" : "POST"
      const body = editingSponsorId ? { ...formData, id: editingSponsorId } : formData

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error(`Failed to ${editingSponsorId ? "update" : "create"} sponsor`)

      toast.success(`Sponsor ${editingSponsorId ? "updated" : "added"} successfully`)
      setDialogOpen(false)
      resetForm()
      fetchSponsors()
    } catch (error) {
      toast.error(`Failed to ${editingSponsorId ? "update" : "add"} sponsor`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      website_url: "",
      level: "",
      sponsorship_amount: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      description: "",
      internal_notes: "",
      show_on_home: true,
      show_on_auction_item: true,
    })
    setEditingSponsorId(null)
    setShowCustomAmount(false)
  }

  const handleEditSponsor = (sponsor: Sponsor) => {
    setEditingSponsorId(sponsor.id)
    setFormData({
      name: sponsor.name,
      logo_url: sponsor.logo_url || "",
      website_url: sponsor.website_url || "",
      level: sponsor.level || "",
      sponsorship_amount: sponsor.sponsorship_amount?.toString() || "",
      contact_name: sponsor.contact_name,
      contact_email: sponsor.contact_email,
      contact_phone: sponsor.contact_phone || "",
      description: sponsor.description || "",
      internal_notes: sponsor.internal_notes || "",
      show_on_home: sponsor.show_on_home ?? true,
      show_on_auction_item: sponsor.show_on_auction_item ?? true,
    })
    setShowCustomAmount(sponsor.level === "custom")
    setDialogOpen(true)
  }

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm("Are you sure?") || !event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/sponsors?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")

      toast.success("Sponsor deleted")
      fetchSponsors()
    } catch (error) {
      toast.error("Failed to delete sponsor")
    }
  }

  const handleApproveRequest = async (id: string) => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/sponsor-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      })

      if (!response.ok) throw new Error("Failed to approve")

      toast.success("Request approved")
      setRequestSheetOpen(false)
      fetchSponsorRequests()
      fetchSponsors()
    } catch (error) {
      toast.error("Failed to approve request")
    }
  }

  const handleRejectRequest = async (id: string) => {
    if (!event?.id) return
    
    try {
      const response = await fetch(`/api/events/${event.id}/sponsor-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      })
      
      if (!response.ok) throw new Error("Failed to reject")
      
      toast.success("Request rejected")
      setRequestSheetOpen(false)
      fetchSponsorRequests()
    } catch (error) {
      toast.error("Failed to reject request")
    }
  }

  const handleDeleteRequest = async () => {
    if (!event?.id || !requestToDelete) return
    
    try {
      const response = await fetch(`/api/events/${event.id}/sponsor-requests/${requestToDelete}`, {
        method: "DELETE",
      })
      
      if (!response.ok) throw new Error("Failed to delete")
      
      toast.success("Request deleted")
      setDeleteDialogOpen(false)
      setRequestToDelete(null)
      fetchSponsorRequests()
    } catch (error) {
      toast.error("Failed to delete request")
    }
  }

  const handleSendInvoice = async (request: SponsorRequest) => {
    if (!event?.id) return

    try {
      // Check if invoice already exists
      if (request.invoice_id) {
        // Open existing invoice
        setSelectedInvoiceId(request.invoice_id)
        setInvoiceSheetOpen(true)
        return
      }

      // Create new invoice for sponsor request
      const response = await fetch(`/api/events/${event.id}/sponsor-requests/${request.id}/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: request.contact_name,
          contactEmail: request.contact_email,
          companyName: request.company_name,
          amount: request.custom_amount,
          sponsorshipLevel: request.sponsorship_level,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create invoice")
      }

      const data = await response.json()
      
      // Open invoice sheet with the invoice (existing or newly created)
      setSelectedInvoiceId(data.invoiceId)
      setInvoiceSheetOpen(true)
      
      if (data.alreadyExists) {
        toast.success("Opening existing invoice")
      } else {
        toast.success("Invoice created successfully")
        // Refresh sponsor requests to update the table
        fetchSponsorRequests()
      }
    } catch (error: any) {
      console.error("[v0] Failed to create invoice:", error)
      toast.error(error.message || "Failed to create invoice")
    }
  }

  const toggleLevel = (level: string) => {
    const newExpanded = new Set(expandedLevels)
    if (newExpanded.has(level)) {
      newExpanded.delete(level)
    } else {
      newExpanded.add(level)
    }
    setExpandedLevels(newExpanded)
  }

  const handleLevelFieldChange = (level: string, updates: Partial<SponsorLevel>) => {
    setEditingLevels((prev) => ({
      ...prev,
      [level]: {
        ...(prev[level] || sponsorLevels.find((l) => l.level === level)),
        ...updates,
      },
    }))
  }

  const handleSaveLevelChanges = async (level: string) => {
    if (!event || !editingLevels[level]) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${event.id}/sponsor-levels/${level}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLevels[level]),
      })

      if (!res.ok) {
        throw new Error("Failed to update sponsor level")
      }

      toast.success("Sponsor level updated successfully")

      // Clear editing state
      setEditingLevels((prev) => {
        const updated = { ...prev }
        delete updated[level]
        return updated
      })

      fetchSponsorLevels()
    } catch (error) {
      toast.error("Failed to save sponsor level")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddBenefit = (level: string) => {
    const currentLevel = editingLevels[level] || sponsorLevels.find((l) => l.level === level)
    if (!currentLevel) return

    const newBenefits = [...(currentLevel.benefits || []), ""]
    handleLevelFieldChange(level, { benefits: newBenefits })
  }

  const handleRemoveBenefit = (level: string, index: number) => {
    const currentLevel = editingLevels[level] || sponsorLevels.find((l) => l.level === level)
    if (!currentLevel) return

    const newBenefits = currentLevel.benefits?.filter((_, i) => i !== index) || []
    handleLevelFieldChange(level, { benefits: newBenefits })
  }

  const handleUpdateBenefit = (level: string, index: number, value: string) => {
    const currentLevel = editingLevels[level] || sponsorLevels.find((l) => l.level === level)
    if (!currentLevel) return

    const newBenefits = [...(currentLevel.benefits || [])]
    newBenefits[index] = value
    handleLevelFieldChange(level, { benefits: newBenefits })
  }

  const handleSaveLevel = (level: string) => {
    // Implementation for handleSaveLevel
  }

  const handleCancelEdit = (level: string) => {
    // Implementation for handleCancelEdit
  }

  const filteredRequests = useMemo(() => {
    return sponsorRequests.filter((request) => {
      // Search filter
      const searchLower = requestSearchQuery.toLowerCase()
      const matchesSearch = 
        request.company_name.toLowerCase().includes(searchLower) ||
        request.contact_name.toLowerCase().includes(searchLower) ||
        request.contact_email.toLowerCase().includes(searchLower)
      
      // Level filter
      const matchesLevel = requestLevelFilter === "all" || request.sponsorship_level === requestLevelFilter
      
      return matchesSearch && matchesLevel
    })
  }, [sponsorRequests, requestSearchQuery, requestLevelFilter])

  const analytics = useMemo(() => {
    const totalSponsors = sponsors.length
    const totalRaised = sponsors.reduce((sum, sponsor) => {
      const amount = Number(sponsor.sponsorship_amount) || 0
      return sum + amount
    }, 0)
    const pendingRequests = sponsorRequests.filter((r) => r.status === "pending").length

    const sponsorsByLevel = sponsorLevels.map((level) => {
      const levelSponsors = sponsors.filter((s) => s.level === level.level)
      const levelTotal = levelSponsors.reduce((sum, s) => {
        const amount = Number(s.sponsorship_amount) || 0
        return sum + amount
      }, 0)
      return {
        name: level.name,
        count: levelSponsors.length,
        amount: levelTotal,
        limit: level.sponsor_limit,
      }
    })

    return {
      totalSponsors,
      totalRaised,
      sponsorsByLevel,
      pendingRequests,
    }
  }, [sponsors, sponsorLevels, sponsorRequests])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getSponsorsForLevel = (level: string) => {
    return sponsors.filter((s) => s.level === level)
  }

  const handleViewRequest = (request: SponsorRequest) => {
    setSelectedRequest(request)
    setRequestSheetOpen(true)
  }

  const handleEditRequestAsSponsor = (request: SponsorRequest) => {
    setFormData({
      name: request.company_name,
      logo_url: "",
      website_url: "",
      level: request.sponsorship_level || "",
      sponsorship_amount: request.custom_amount?.toString() || "",
      contact_name: request.contact_name,
      contact_email: request.contact_email,
      contact_phone: "",
      description: "",
    })
    setShowCustomAmount(request.sponsorship_level === "custom" || !request.sponsorship_level)
    setRequestSheetOpen(false)
    setDialogOpen(true)
  }

  const resetNewLevelForm = () => {
    setNewLevelData({
      name: "",
      level: "",
      amount: "",
      description: "",
      sponsor_limit: "",
      benefits: [""],
    })
  }

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event?.id) return

    if (!newLevelData.name || !newLevelData.level) {
      toast.error("Name and level key are required")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/events/${event.id}/sponsor-levels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLevelData.name,
          level: newLevelData.level.toLowerCase().replace(/\s+/g, "-"),
          amount: Number.parseFloat(newLevelData.amount) || 0,
          description: newLevelData.description,
          sponsor_limit: newLevelData.sponsor_limit ? Number.parseInt(newLevelData.sponsor_limit) : null,
          benefits: newLevelData.benefits.filter((b) => b.trim() !== ""),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create sponsor level")
      }

      toast.success("Sponsor level created successfully")
      setNewLevelSheetOpen(false)
      resetNewLevelForm()
      fetchSponsorLevels()
    } catch (error: any) {
      toast.error(error.message || "Failed to create sponsor level")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddNewLevelBenefit = () => {
    setNewLevelData((prev) => ({
      ...prev,
      benefits: [...prev.benefits, ""],
    }))
  }

  const handleRemoveNewLevelBenefit = (index: number) => {
    setNewLevelData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }))
  }

  const handleUpdateNewLevelBenefit = (index: number, value: string) => {
    setNewLevelData((prev) => {
      const newBenefits = [...prev.benefits]
      newBenefits[index] = value
      return { ...prev, benefits: newBenefits }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sponsors</h1>
          <p className="text-muted-foreground">Manage sponsorship opportunities and partners</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sponsors</CardDescription>
            <CardTitle className="text-3xl">{analytics.totalSponsors}</CardTitle>
            {analytics.pendingRequests > 0 && (
              <p className="text-sm text-muted-foreground">
                {analytics.pendingRequests} pending request{analytics.pendingRequests !== 1 ? "s" : ""}
              </p>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Raised</CardDescription>
            <CardTitle className="text-3xl">${analytics.totalRaised.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sponsors by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: "Amount",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[150px]"
            >
              <BarChart data={analytics.sponsorsByLevel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="levels">Sponsor Levels</TabsTrigger>
          <TabsTrigger value="sponsors">Active Sponsors</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-4">
          <div className="flex justify-end">
            <Sheet
              open={newLevelSheetOpen}
              onOpenChange={(open) => {
                setNewLevelSheetOpen(open)
                if (!open) resetNewLevelForm()
              }}
            >
              <SheetTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Sponsor Level
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add New Sponsor Level</SheetTitle>
                  <SheetDescription>Create a new sponsorship tier for your event</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleCreateLevel} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="levelName">Level Name</Label>
                    <Input
                      id="levelName"
                      value={newLevelData.name}
                      onChange={(e) => setNewLevelData({ ...newLevelData, name: e.target.value })}
                      placeholder="e.g., Diamond, Title Sponsor"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="levelKey">Level Key</Label>
                    <Input
                      id="levelKey"
                      value={newLevelData.level}
                      onChange={(e) => setNewLevelData({ ...newLevelData, level: e.target.value })}
                      placeholder="e.g., diamond, title-sponsor"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Unique identifier (lowercase, no spaces)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="levelAmount">Amount ($)</Label>
                    <Input
                      id="levelAmount"
                      type="number"
                      step="100"
                      value={newLevelData.amount}
                      onChange={(e) => setNewLevelData({ ...newLevelData, amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="levelLimit">Sponsor Limit (optional)</Label>
                    <Input
                      id="levelLimit"
                      type="number"
                      min="0"
                      value={newLevelData.sponsor_limit}
                      onChange={(e) => setNewLevelData({ ...newLevelData, sponsor_limit: e.target.value })}
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for unlimited sponsors</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="levelDescription">Description</Label>
                    <Textarea
                      id="levelDescription"
                      value={newLevelData.description}
                      onChange={(e) => setNewLevelData({ ...newLevelData, description: e.target.value })}
                      placeholder="Brief description of this sponsorship level"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-4 pt-2 border-t">
                    <Label className="text-sm font-semibold">Default Display Settings</Label>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="new_show_on_home" className="text-sm">Show on Home Page</Label>
                        <p className="text-xs text-muted-foreground">Default visibility for sponsors of this level on the home page</p>
                      </div>
                      <Switch
                        id="new_show_on_home"
                        checked={newLevelData.show_on_home ?? true}
                        onCheckedChange={(checked) => setNewLevelData({ ...newLevelData, show_on_home: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="new_show_on_auction_item" className="text-sm">Show on Auction Items</Label>
                        <p className="text-xs text-muted-foreground">Default visibility for sponsors of this level on auction item pages</p>
                      </div>
                      <Switch
                        id="new_show_on_auction_item"
                        checked={newLevelData.show_on_auction_item ?? true}
                        onCheckedChange={(checked) => setNewLevelData({ ...newLevelData, show_on_auction_item: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Benefits</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddNewLevelBenefit}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Benefit
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {newLevelData.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={benefit}
                            onChange={(e) => handleUpdateNewLevelBenefit(idx, e.target.value)}
                            placeholder="Enter benefit"
                          />
                          {newLevelData.benefits.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveNewLevelBenefit(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <SheetFooter>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Sponsor Level
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>
          <div className="grid gap-4">
            {sponsorLevels.map((level) => {
              const currentLevel = editingLevels[level.level] || level
              return (
                <Collapsible 
                  key={level.level} 
                  open={expandedLevels.has(level.level)}
                  onOpenChange={() => toggleLevel(level.level)}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {level.name}
                          </Badge>
                          <CardTitle className="text-base">{level.name}</CardTitle>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Display Name</Label>
                          <Input
                            type="text"
                            placeholder="e.g., Gold Sponsor"
                            value={currentLevel.name || ""}
                            onChange={(e) =>
                              handleLevelFieldChange(level.level, {
                                name: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Amount ($)</Label>
                          <Input
                            type="number"
                            step="100"
                            placeholder="0"
                            value={currentLevel.amount.toString()}
                            onChange={(e) =>
                              handleLevelFieldChange(level.level, {
                                amount: Number.parseInt(e.target.value),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Sponsor Limit (optional)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Unlimited"
                            value={
                              currentLevel.sponsor_limit !== null && currentLevel.sponsor_limit !== undefined
                                ? currentLevel.sponsor_limit
                                : ""
                            }
                            onChange={(e) =>
                              handleLevelFieldChange(level.level, {
                                sponsor_limit: e.target.value ? Number.parseInt(e.target.value) : null,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">Leave empty for unlimited sponsors</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={currentLevel.description}
                            onChange={(e) => handleLevelFieldChange(level.level, { description: e.target.value })}
                            placeholder="Brief description of this sponsorship level"
                          />
                        </div>

                        <div className="space-y-4 pt-2 border-t">
                          <Label className="text-sm font-semibold">Default Display Settings</Label>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor={`show_on_home_${level.level}`} className="text-sm">Show on Home Page</Label>
                              <p className="text-xs text-muted-foreground">Default visibility for sponsors of this level on the home page</p>
                            </div>
                            <Switch
                              id={`show_on_home_${level.level}`}
                              checked={currentLevel.show_on_home ?? true}
                              onCheckedChange={(checked) => handleLevelFieldChange(level.level, { show_on_home: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor={`show_on_auction_item_${level.level}`} className="text-sm">Show on Auction Items</Label>
                              <p className="text-xs text-muted-foreground">Default visibility for sponsors of this level on auction item pages</p>
                            </div>
                            <Switch
                              id={`show_on_auction_item_${level.level}`}
                              checked={currentLevel.show_on_auction_item ?? true}
                              onCheckedChange={(checked) => handleLevelFieldChange(level.level, { show_on_auction_item: checked })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Benefits</Label>
                            <Button variant="outline" size="sm" onClick={() => handleAddBenefit(level.level)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Benefit
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {currentLevel.benefits?.map((benefit, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  value={benefit}
                                  onChange={(e) => handleUpdateBenefit(level.level, idx, e.target.value)}
                                  placeholder="Enter benefit"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveBenefit(level.level, idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )) || []}
                          </div>
                        </div>

                        {editingLevels[level.level] && (
                          <div className="flex gap-2 pt-4">
                            <Button 
                              onClick={() => handleSaveLevelChanges(level.level)} 
                              className="flex-1"
                            >
                              Save Changes
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setEditingLevels((prev) => {
                                const updated = { ...prev }
                                delete updated[level.level]
                                return updated
                              })}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Filter:</Label>
              <Select value={sponsorFilter} onValueChange={(value) => setSponsorFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sponsors</SelectItem>
                  <SelectItem value="assigned">Assigned to Level</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Sheet
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) resetForm()
              }}
            >
              <SheetTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Sponsor
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto lg:max-w-[50vw]">
                <SheetHeader>
                  <SheetTitle>{editingSponsorId ? "Edit Sponsor" : "Add New Sponsor"}</SheetTitle>
                  <SheetDescription>
                    {editingSponsorId ? "Update sponsor information" : "Add a sponsor to display on your event page"}
                  </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo</Label>
                    <Input id="logo" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url || "/placeholder.svg"}
                        alt="Preview"
                        className="h-12 w-auto rounded"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">External Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the sponsor (shown publicly)"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Sponsorship Level</Label>
                    <select
                      id="level"
                      value={formData.level}
                      onChange={(e) => {
                        setFormData({ ...formData, level: e.target.value })
                        setShowCustomAmount(e.target.value === "custom")
                        if (e.target.value !== "custom") {
                          const selectedLevel = sponsorLevels.find((l) => l.level === e.target.value)
                          if (selectedLevel) {
                            setFormData((prev) => ({
                              ...prev,
                              sponsorship_amount: selectedLevel.amount.toString(),
                            }))
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="" disabled>
                        Select a sponsorship level
                      </option>
                      {sponsorLevels.map((l) => (
                        <option key={l.level} value={l.level}>
                          {l.name} (${l.amount})
                        </option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {showCustomAmount && (
                    <div className="space-y-2">
                      <Label htmlFor="customAmount">Custom Sponsorship Amount ($)</Label>
                      <Input
                        id="customAmount"
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.sponsorship_amount}
                        onChange={(e) => setFormData({ ...formData, sponsorship_amount: e.target.value })}
                        placeholder="Enter custom amount"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Name</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internal_notes">Internal Notes</Label>
                    <Textarea
                      id="internal_notes"
                      value={formData.internal_notes || ""}
                      onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                      placeholder="Internal notes about this sponsor (not shown publicly)"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base font-semibold">Display Settings</Label>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_on_home">Show on Home Page</Label>
                        <p className="text-sm text-muted-foreground">Display this sponsor in the sponsors section on the home page</p>
                      </div>
                      <Switch
                        id="show_on_home"
                        checked={formData.show_on_home ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_on_home: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_on_auction_item">Show on Auction Items</Label>
                        <p className="text-sm text-muted-foreground">Display this sponsor in the footer of auction item pages</p>
                      </div>
                      <Switch
                        id="show_on_auction_item"
                        checked={formData.show_on_auction_item ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_on_auction_item: checked })}
                      />
                    </div>
                  </div>

                  <SheetFooter>
                    <Button type="submit" disabled={uploading}>
                      {editingSponsorId ? "Update" : "Add"} Sponsor
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sponsors
              .filter((sponsor) => {
                if (sponsorFilter === "assigned") return sponsor.level && sponsor.level !== ""
                if (sponsorFilter === "unassigned") return !sponsor.level || sponsor.level === ""
                return true
              })
              .map((sponsor) => (
                <Card
                  key={sponsor.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleEditSponsor(sponsor)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {sponsor.logo_url && (
                        <img
                          src={sponsor.logo_url || "/placeholder.svg"}
                          alt={sponsor.name}
                          className="h-12 w-12 object-contain rounded border flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{sponsor.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {sponsor.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Amount Donated</p>
                      <p className="text-lg font-semibold text-primary">
                        ${(sponsor.sponsorship_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <p>
                        <span className="font-medium">Contact:</span> {sponsor.contact_name}
                      </p>
                      <p className="truncate">{sponsor.contact_email}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSponsor(sponsor.id)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>

          {sponsors.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No sponsors yet. Add your first sponsor!
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sponsor Requests</CardTitle>
              <CardDescription>Review and manage sponsorship requests from potential sponsors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by company name, contact name, or email..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <Select value={requestLevelFilter} onValueChange={setRequestLevelFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {sponsorLevels.map((level) => (
                      <SelectItem key={level.level} value={level.level}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewRequest(request)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-48">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                                onClick={() => handleSendInvoice(request)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Send Invoice
                              </Button>
                              {request.status === "rejected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() => handleApproveRequest(request.id)}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              )}
                              {request.status === "approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() => handleRejectRequest(request.id)}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start text-destructive hover:text-destructive"
                                onClick={() => {
                                  setRequestToDelete(request.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="font-medium">{request.company_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{request.contact_name}</p>
                          <p className="text-xs text-muted-foreground">{request.contact_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{request.sponsorship_level || "Custom"}</TableCell>
                      <TableCell>
                        ${request.custom_amount 
                          ? request.custom_amount.toLocaleString() 
                          : sponsorLevels.find(l => l.level === request.sponsorship_level)?.amount.toLocaleString() || "TBD"}
                      </TableCell>
                      <TableCell>
                        {request.invoice_number ? (
                          <span className="text-xs font-mono text-muted-foreground">{request.invoice_number}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.payment_status === "paid" || request.payment_status === "succeeded" || request.payment_status === "completed"
                              ? "default"
                              : request.payment_status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            request.payment_status === "paid" || request.payment_status === "succeeded" || request.payment_status === "completed"
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          {request.payment_status === "paid" || request.payment_status === "succeeded" || request.payment_status === "completed"
                            ? "Paid"
                            : request.payment_status === "pending"
                            ? "Pending"
                            : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2" onClick={(e) => e.stopPropagation()}>
                        {request.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleApproveRequest(request.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectRequest(request.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {sponsorRequests.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No sponsorship requests yet</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={requestSheetOpen} onOpenChange={setRequestSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sponsorship Request</SheetTitle>
            <SheetDescription>Review and manage this sponsorship request</SheetDescription>
          </SheetHeader>

          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Company Name</Label>
                  <p className="text-lg font-semibold">{selectedRequest.company_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Contact Name</Label>
                    <p className="font-medium">{selectedRequest.contact_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge
                      variant={
                        selectedRequest.status === "approved"
                          ? "default"
                          : selectedRequest.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="mt-1"
                    >
                      {selectedRequest.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.contact_email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Sponsorship Level</Label>
                    <p className="font-medium capitalize">{selectedRequest.sponsorship_level || "Custom"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <p className="text-lg font-semibold text-primary">
                      ${(selectedRequest.custom_amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Payment Method</Label>
                  <p className="font-medium capitalize">{selectedRequest.payment_method}</p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {selectedRequest && selectedRequest.status === "pending" && (
            <SheetFooter className="flex-col sm:flex-col gap-2">
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleEditRequestAsSponsor(selectedRequest)}
              >
                Edit as Sponsor
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  handleApproveRequest(selectedRequest.id)
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve Request
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  handleRejectRequest(selectedRequest.id)
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Reject Request
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sponsorship request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleDeleteRequest}>Delete</AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvoiceSheet
        open={invoiceSheetOpen}
        onOpenChange={setInvoiceSheetOpen}
        invoiceId={selectedInvoiceId}
        eventId={event?.id || ""}
      />
    </div>
  )
}
