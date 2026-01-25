"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface SponsorFormProps {
  sponsor?: {
    id: string
    name: string
    logo_url: string | null
    website_url: string | null
    tier?: string
    description?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    address?: string | null
    event_id: string
  }
  eventId: string
  onSuccess?: () => void
  onDelete?: () => void
}

export function SponsorForm({ sponsor, eventId, onSuccess, onDelete }: SponsorFormProps) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: sponsor?.name || "",
    logo_url: sponsor?.logo_url || "",
    website_url: sponsor?.website_url || "",
    tier: (sponsor as any)?.tier || "bronze", // Added tier field that exists in database
    // description: sponsor?.description || "",
    // contact_email: sponsor?.contact_email || "",
    // contact_phone: sponsor?.contact_phone || "",
    // address: sponsor?.address || "",
  })

  useEffect(() => {
    if (sponsor) {
      setFormData({
        name: sponsor.name || "",
        logo_url: sponsor.logo_url || "",
        website_url: sponsor.website_url || "",
        tier: (sponsor as any)?.tier || "bronze",
        // description: sponsor.description || "",
        // contact_email: sponsor.contact_email || "",
        // contact_phone: sponsor.contact_phone || "",
        // address: sponsor.address || "",
      })
    }
  }, [sponsor])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: formDataUpload,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setFormData((prev) => ({ ...prev, logo_url: data.url }))
      toast.success("Logo uploaded successfully")
    } catch (error) {
      console.error("[v0] Error uploading logo:", error)
      toast.error("Failed to upload logo")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = sponsor ? `/api/sponsors/${sponsor.id}` : `/api/events/${eventId}/sponsors`

      const method = sponsor ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error(`Failed to ${sponsor ? "update" : "create"} sponsor`)

      toast.success(`Sponsor ${sponsor ? "updated" : "created"} successfully`)
      onSuccess?.()
    } catch (error) {
      console.error(`[v0] Error ${sponsor ? "updating" : "creating"} sponsor:`, error)
      toast.error(`Failed to ${sponsor ? "update" : "create"} sponsor`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!sponsor) return
    if (!confirm("Are you sure you want to delete this sponsor?")) return

    try {
      const response = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete sponsor")

      toast.success("Sponsor deleted successfully")
      onDelete?.()
    } catch (error) {
      console.error("[v0] Error deleting sponsor:", error)
      toast.error("Failed to delete sponsor")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Sponsor Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Company Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo</Label>
          <Input id="logo" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          {formData.logo_url && (
            <div className="mt-2 rounded border bg-muted p-4 flex justify-center">
              <img
                src={formData.logo_url || "/placeholder.svg"}
                alt="Logo preview"
                className="h-20 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description about the sponsor..."
            rows={3}
          />
        </div> */}

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
          />
        </div>

        {/* <div className="space-y-2">
          <Label htmlFor="email">Contact Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@example.com"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Contact Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main St, City, State 12345"
            rows={2}
          />
        </div> */}
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving || uploading}>
          {saving ? "Saving..." : sponsor ? "Update Sponsor" : "Create Sponsor"}
        </Button>
        {sponsor && onDelete && (
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
