"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Edit, Trash2, Trophy, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

export default function AdminRafflesPage() {
  const { event, isLoading: eventLoading } = useEvent()
  const { toast } = useToast()
  const [raffles, setRaffles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteRaffleId, setDeleteRaffleId] = useState<string | null>(null)
  const [drawingWinner, setDrawingWinner] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    ticket_price: "0",
    max_tickets_per_user: "",
    total_tickets_available: "",
    image_url: "",
    start_date: "",
    end_date: "",
    is_active: true,
  })

  useEffect(() => {
    if (!eventLoading && event) {
      fetchRaffles()
    }
  }, [eventLoading, event])

  const fetchRaffles = async () => {
    if (!event) return

    try {
      const res = await fetch(`/api/events/${event.id}/raffles`)
      if (!res.ok) throw new Error("Failed to fetch raffles")
      const data = await res.json()
      if (data.message) {
        setSetupMessage(data.message)
      }
      setRaffles(data.raffles || [])
    } catch (error) {
      console.error("[v0] Error fetching raffles:", error)
      toast({
        title: "Error",
        description: "Failed to load raffles",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const uploadResponse = await fetch("/api/blob/upload", {
        method: "POST",
        body: formDataUpload,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await uploadResponse.json()
      setFormData({ ...formData, image_url: url })
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    setIsSubmitting(true)
    try {
      const url = formData.id ? `/api/events/${event.id}/raffles/${formData.id}` : `/api/events/${event.id}/raffles`

      const method = formData.id ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ticket_price: Number.parseFloat(formData.ticket_price) || 0,
          max_tickets_per_user: formData.max_tickets_per_user ? Number.parseInt(formData.max_tickets_per_user) : null,
          total_tickets_available: formData.total_tickets_available
            ? Number.parseInt(formData.total_tickets_available)
            : null,
        }),
      })

      if (!res.ok) throw new Error("Failed to save raffle")

      toast({
        title: "Success",
        description: formData.id ? "Raffle updated successfully" : "Raffle created successfully",
      })

      setIsDialogOpen(false)
      resetForm()
      fetchRaffles()
    } catch (error) {
      console.error("[v0] Error saving raffle:", error)
      toast({
        title: "Error",
        description: "Failed to save raffle",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !deleteRaffleId) return

    try {
      const res = await fetch(`/api/events/${event.id}/raffles/${deleteRaffleId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete raffle")

      toast({
        title: "Success",
        description: "Raffle deleted successfully",
      })

      setDeleteRaffleId(null)
      fetchRaffles()
    } catch (error) {
      console.error("[v0] Error deleting raffle:", error)
      toast({
        title: "Error",
        description: "Failed to delete raffle",
        variant: "destructive",
      })
    }
  }

  const handleDrawWinner = async (raffleId: string) => {
    if (!event) return

    setDrawingWinner(raffleId)
    try {
      const res = await fetch(`/api/events/${event.id}/raffles/${raffleId}/draw`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Failed to draw winner")

      const data = await res.json()
      toast({
        title: "Winner Selected!",
        description: `${data.winner.name} won with ticket #${data.winner.ticket_number}`,
      })

      fetchRaffles()
    } catch (error) {
      console.error("[v0] Error drawing winner:", error)
      toast({
        title: "Error",
        description: "Failed to draw winner",
        variant: "destructive",
      })
    } finally {
      setDrawingWinner(null)
    }
  }

  const resetForm = () => {
    setFormData({
      id: "",
      title: "",
      description: "",
      ticket_price: "0",
      max_tickets_per_user: "",
      total_tickets_available: "",
      image_url: "",
      start_date: "",
      end_date: "",
      is_active: true,
    })
  }

  const openEditDialog = (raffle: any) => {
    setFormData({
      id: raffle.id,
      title: raffle.title,
      description: raffle.description || "",
      ticket_price: raffle.ticket_price.toString(),
      max_tickets_per_user: raffle.max_tickets_per_user?.toString() || "",
      total_tickets_available: raffle.total_tickets_available?.toString() || "",
      image_url: raffle.image_url || "",
      start_date: new Date(raffle.start_date).toISOString().slice(0, 16),
      end_date: new Date(raffle.end_date).toISOString().slice(0, 16),
      is_active: raffle.is_active,
    })
    setIsDialogOpen(true)
  }

  if (eventLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No event found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raffles</h1>
          <p className="text-muted-foreground">Manage raffles for your event</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Raffle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{formData.id ? "Edit Raffle" : "Create New Raffle"}</DialogTitle>
              <DialogDescription>
                {formData.id ? "Update raffle details" : "Set up a new raffle for your event"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket_price">Ticket Price ($)</Label>
                  <Input
                    id="ticket_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_tickets_per_user">Max Tickets per User</Label>
                  <Input
                    id="max_tickets_per_user"
                    type="number"
                    min="1"
                    value={formData.max_tickets_per_user}
                    onChange={(e) => setFormData({ ...formData, max_tickets_per_user: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_tickets_available">Total Tickets Available</Label>
                <Input
                  id="total_tickets_available"
                  type="number"
                  min="1"
                  value={formData.total_tickets_available}
                  onChange={(e) => setFormData({ ...formData, total_tickets_available: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image</Label>
                {formData.image_url && (
                  <div className="relative w-full h-48 mb-2 rounded-lg border overflow-hidden">
                    <img
                      src={formData.image_url || "/placeholder.svg"}
                      alt="Raffle"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  asChild
                  className="w-full bg-transparent"
                >
                  <label className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">Show this raffle to users</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {formData.id ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {setupMessage && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Trophy className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 dark:text-amber-300 mb-4">{setupMessage}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              To set up the raffle system, run the SQL script from the Scripts section in your project settings.
            </p>
          </CardContent>
        </Card>
      )}

      {raffles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No raffles yet</p>
            <p className="text-muted-foreground mb-4">Create your first raffle to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Raffle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {raffles.map((raffle) => (
            <Card key={raffle.id}>
              <CardHeader>
                {raffle.image_url && (
                  <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
                    <img
                      src={raffle.image_url || "/placeholder.svg"}
                      alt={raffle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardTitle>{raffle.title}</CardTitle>
                <CardDescription>{raffle.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ticket Price</p>
                    <p className="font-semibold">
                      {Number.parseFloat(raffle.ticket_price) === 0
                        ? "Free"
                        : `$${Number.parseFloat(raffle.ticket_price).toFixed(2)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tickets Sold</p>
                    <p className="font-semibold">
                      {raffle.tickets_sold || 0}
                      {raffle.total_tickets_available ? ` / ${raffle.total_tickets_available}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold">{raffle.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entries</p>
                    <p className="font-semibold">{raffle.entry_count || 0}</p>
                  </div>
                </div>

                {raffle.winner_name && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium text-primary mb-1">Winner</p>
                    <p className="font-semibold">{raffle.winner_name}</p>
                    <p className="text-sm text-muted-foreground">Ticket #{raffle.winner_ticket_number}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!raffle.winner_user_id && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDrawWinner(raffle.id)}
                      disabled={drawingWinner === raffle.id || (raffle.entry_count || 0) === 0}
                    >
                      {drawingWinner === raffle.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trophy className="mr-2 h-4 w-4" />
                      )}
                      Pick Winner
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(raffle)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteRaffleId(raffle.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteRaffleId} onOpenChange={() => setDeleteRaffleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this raffle and all associated entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
