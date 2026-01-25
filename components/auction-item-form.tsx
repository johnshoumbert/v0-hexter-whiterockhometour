"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Upload, X, Package, Info, Settings, ImageIcon, Box, MessageSquare, Trash2, Copy } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { generateSlug } from "@/lib/utils"
import { useEvent } from "@/contexts/event-context"
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
import { cn } from "@/lib/utils"

interface AuctionItemFormProps {
  initialData?: any
  onSuccess?: () => void
  onDelete?: () => void
}

export function AuctionItemForm({ initialData, onSuccess, onDelete }: AuctionItemFormProps) {
  const { event } = useEvent()
  const [activeTab, setActiveTab] = useState("info")
  const [categories, setCategories] = useState<string[]>([
    "Travel",
    "Sports",
    "Dining",
    "Education",
    "Technology",
    "Wellness",
    "Services",
    "Art",
    "Entertainment",
    "Other",
  ])

  const parseImageUrls = (imageUrl: string | null) => {
    if (!imageUrl) return []
    try {
      const parsed = JSON.parse(imageUrl)
      return Array.isArray(parsed) ? parsed : [imageUrl]
    } catch {
      return [imageUrl]
    }
  }

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    category: initialData?.category || "general",
    donor: initialData?.donor || "",
    min_bid: initialData?.min_bid || 0,
    bid_increment: initialData?.bid_increment || 5,
    valued_at: initialData?.valued_at || 0,
    priceless: initialData?.priceless || false,
    buy_now_price: initialData?.buy_now_price || 0,
    buy_type: initialData?.buy_type || "auction",
    pickup_instructions: initialData?.pickup_instructions || "",
    use_event_pickup_instructions: initialData?.use_event_pickup_instructions || false,
    use_event_times: !initialData?.start_time && !initialData?.end_time ? true : false,
    count: initialData?.count || 1,
    start_time: initialData?.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : "",
    end_time: initialData?.end_time ? new Date(initialData.end_time).toISOString().slice(0, 16) : "",
    status: initialData?.status || "active",
    featured: initialData?.featured || false,
    image_url: initialData?.image_url || "",
  })

  const [images, setImages] = useState<string[]>(parseImageUrls(initialData?.image_url))
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (event?.id) {
      fetch(`/api/events/${event.id}/settings?page=auction&object=categories`)
        .then((res) => res.json())
        .then((data) => {
          if (data.settings?.value?.categories) {
            setCategories(data.settings.value.categories)
          }
        })
        .catch((err) => {
          console.error("[v0] Error fetching categories:", err)
        })
    }
  }, [event])

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    await uploadImage(file, 0)
  }

  const handleAdditionalImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setIsUploading(true)

    try {
      for (const file of files) {
        await uploadImage(file, images.length)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const uploadImage = async (file: File, index: number) => {
    setIsUploading(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: formDataUpload,
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const { url } = await response.json()

      setImages((prev) => {
        const newImages = [...prev]
        if (index < newImages.length) {
          newImages[index] = url
        } else {
          newImages.push(url)
        }
        return newImages
      })

      setImageError((prev) => ({ ...prev, [index]: false }))
      toast.success("Image uploaded successfully")
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImageError((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index]
      return newErrors
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!event?.id) {
        throw new Error("No event selected")
      }

      const payload = {
        ...formData,
        start_time: formData.use_event_times || !formData.start_time ? null : formData.start_time,
        end_time: formData.use_event_times || !formData.end_time ? null : formData.end_time,
        image_url: images.join(","),
        min_bid: Number(formData.min_bid),
        bid_increment: Number(formData.bid_increment),
        valued_at: Number(formData.valued_at),
        buy_now_price: Number(formData.buy_now_price),
        count: Number(formData.count),
        event_id: event?.id,
      }

      const url = initialData?.id
        ? `/api/events/${event.id}/auctions/${initialData.id}`
        : `/api/events/${event.id}/auctions`
      const method = initialData?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || "Failed to save auction"
        throw new Error(errorMessage)
      }

      toast.success(initialData?.id ? "Auction updated successfully" : "Auction created successfully")
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error saving auction:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save auction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData?.id) return

    try {
      if (!event?.id) {
        throw new Error("No event selected")
      }

      const response = await fetch(`/api/events/${event.id}/auctions/${initialData.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete auction")
      }

      toast.success("Auction deleted successfully")
      setShowDeleteDialog(false)
      onDelete?.()
    } catch (error) {
      console.error("[v0] Failed to delete auction:", error)
      toast.error("Failed to delete auction")
    }
  }

  const handleDuplicate = async () => {
    try {
      const duplicatedData = {
        ...formData,
        title: `${formData.title} (Copy)`,
        slug: generateSlug(`${formData.title} copy`),
        status: "draft",
      }

      if (!event?.id) throw new Error("No event selected")

      const imageUrl = images.length > 0 ? JSON.stringify(images) : null

      const response = await fetch(`/api/events/${event.id}/auctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...duplicatedData,
          image_url: imageUrl,
          min_bid: Number.parseFloat(duplicatedData.min_bid.toString()),
          bid_increment: Number.parseFloat(duplicatedData.bid_increment.toString()),
          valued_at: duplicatedData.valued_at ? Number.parseFloat(duplicatedData.valued_at.toString()) : null,
          priceless: duplicatedData.priceless || false,
          buy_now_price: duplicatedData.buy_now_price
            ? Number.parseFloat(duplicatedData.buy_now_price.toString())
            : null,
          buy_type: duplicatedData.buy_type,
          pickup_instructions: duplicatedData.pickup_instructions || null,
          use_event_pickup_instructions: duplicatedData.use_event_pickup_instructions || false,
          count: duplicatedData.count || 1,
          start_time: duplicatedData.start_time ? new Date(duplicatedData.start_time).toISOString() : null,
          end_time: duplicatedData.end_time ? new Date(duplicatedData.end_time).toISOString() : null,
        }),
      })

      if (!response.ok) throw new Error("Failed to duplicate auction")

      toast.success("Item duplicated successfully")
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error duplicating item:", error)
      toast.error("Failed to duplicate item")
    }
  }

  const mainImage = images[0]
  const additionalImages = images.slice(1)

  const tabs = [
    { id: "info", label: "Details", icon: Info },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "pickup", label: "Pickup", icon: Package },
    { id: "inventory", label: "Inventory", icon: Box },
    { id: "comments", label: "Comments", icon: MessageSquare },
  ]

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="border-b px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{initialData?.id ? "Edit Item" : "Add Item"}</h2>
              <p className="text-xs text-muted-foreground">Update item information and images</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-16 sm:w-56 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
            <nav className="flex flex-col gap-1 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      "hover:bg-background/80",
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6">
              {activeTab === "info" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Item Details</h3>
                  </div>

                  <div>
                    <Label htmlFor="title">Item Name</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value
                        setFormData({
                          ...formData,
                          title: newTitle,
                          slug: !initialData?.id ? generateSlug(newTitle) : formData.slug,
                        })
                      }}
                      required
                      className="mt-1"
                      placeholder="Emergency Contact NFC Pet Tags"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                      required
                      className="mt-1"
                      placeholder="emergency-contact-nfc-pet-tags"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be used in the URL: /auctions/{formData.slug || "your-slug-here"}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="buy_type">Listing Type</Label>
                    <Select
                      value={formData.buy_type}
                      onValueChange={(value) => setFormData({ ...formData, buy_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select listing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auction">Auction Only</SelectItem>
                        <SelectItem value="buy_now">Buy Now Only</SelectItem>
                        <SelectItem value="hybrid">Auction + Buy Now</SelectItem>
                        <SelectItem value="in_person">In-Person Only (QR Code)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.buy_type === "in_person" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        This item can only be bid on by scanning the QR code at the physical event. Online bidding is
                        disabled.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {formData.buy_type !== "buy_now" && (
                      <>
                        <div>
                          <Label htmlFor="min_bid">Minimum Bid</Label>
                          <Input
                            id="min_bid"
                            type="number"
                            step="0.01"
                            value={formData.min_bid}
                            onChange={(e) => setFormData({ ...formData, min_bid: Number.parseFloat(e.target.value) })}
                            required={formData.buy_type !== "buy_now"}
                            className="mt-1"
                            placeholder="22.00"
                          />
                          {formData.buy_type === "in_person" && (
                            <p className="text-xs text-muted-foreground mt-1">For in-person bidding only</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="bid_increment">Bid Increment</Label>
                          <Input
                            id="bid_increment"
                            type="number"
                            step="0.01"
                            value={formData.bid_increment}
                            onChange={(e) =>
                              setFormData({ ...formData, bid_increment: Number.parseFloat(e.target.value) })
                            }
                            required={formData.buy_type !== "buy_now"}
                            className="mt-1"
                            placeholder="5.00"
                          />
                        </div>
                      </>
                    )}

                    {(formData.buy_type === "buy_now" || formData.buy_type === "hybrid") && (
                      <>
                        <div>
                          <Label htmlFor="buy_now_price">Buy Now Price</Label>
                          <Input
                            id="buy_now_price"
                            type="number"
                            step="0.01"
                            value={formData.buy_now_price}
                            onChange={(e) =>
                              setFormData({ ...formData, buy_now_price: Number.parseFloat(e.target.value) })
                            }
                            required
                            className="mt-1"
                            placeholder="100.00"
                          />
                        </div>

                        <div>
                          <Label htmlFor="count">Quantity Available</Label>
                          <Input
                            id="count"
                            type="number"
                            step="1"
                            min="1"
                            value={formData.count}
                            onChange={(e) => setFormData({ ...formData, count: Number.parseInt(e.target.value) })}
                            required
                            className="mt-1"
                            placeholder="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">How many are available for purchase</p>
                        </div>
                      </>
                    )}

                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="valued_at">Valued At</Label>
                        <Input
                          id="valued_at"
                          type="number"
                          step="0.01"
                          value={formData.valued_at}
                          onChange={(e) => setFormData({ ...formData, valued_at: Number.parseFloat(e.target.value) })}
                          disabled={formData.priceless}
                          className="mt-1"
                          placeholder="100.00"
                        />
                      </div>

                      <div className="flex items-end pb-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="priceless"
                            checked={formData.priceless}
                            onCheckedChange={(checked) => setFormData({ ...formData, priceless: checked })}
                          />
                          <Label htmlFor="priceless" className="cursor-pointer text-sm">
                            Priceless
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="donor">Donor</Label>
                    <Input
                      id="donor"
                      value={formData.donor}
                      onChange={(e) => setFormData({ ...formData, donor: e.target.value })}
                      className="mt-1"
                      placeholder="Company or individual name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={6}
                      className="mt-1"
                      placeholder="Describe the auction item in detail..."
                    />
                  </div>

                  <div className="flex items-center space-x-2 rounded-lg border bg-muted/50 p-4">
                    <Switch
                      id="use_event_times"
                      checked={formData.use_event_times}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          use_event_times: checked,
                          // Clear custom times when using event times
                          start_time: checked ? "" : formData.start_time,
                          end_time: checked ? "" : formData.end_time,
                        })
                      }}
                    />
                    <Label htmlFor="use_event_times" className="cursor-pointer">
                      Use event-level auction start and end times
                    </Label>
                  </div>

                  {!formData.use_event_times && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_time">Start Time</Label>
                          <div className="flex gap-2">
                            <Input
                              id="start_time"
                              type="datetime-local"
                              value={formData.start_time}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              className="mt-1"
                            />
                            {formData.start_time && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setFormData({ ...formData, start_time: "" })}
                                className="mt-1 shrink-0"
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="end_time">End Time</Label>
                          <div className="flex gap-2">
                            <Input
                              id="end_time"
                              type="datetime-local"
                              value={formData.end_time}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              className="mt-1"
                            />
                            {formData.end_time && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setFormData({ ...formData, end_time: "" })}
                                className="mt-1 shrink-0"
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Leave empty to use event-level auction times. Custom times will override the event default.
                      </p>
                    </div>
                  )}

                  {formData.use_event_times && event && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Using Event-Level Times
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-200">
                        This item will use the event auction start and end times:{" "}
                        {event.start_date ? new Date(event.start_date).toLocaleString() : "Not set"} to{" "}
                        {event.end_date ? new Date(event.end_date).toLocaleString() : "Not set"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Auction Settings</h3>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="featured" className="cursor-pointer">
                      Feature this item on the home page
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="use_event_times"
                      checked={formData.use_event_times}
                      onChange={(e) => setFormData({ ...formData, use_event_times: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="use_event_times" className="cursor-pointer">
                      Use event-level times
                    </Label>
                  </div>
                </div>
              )}

              {activeTab === "images" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Product Images</h3>
                  </div>

                  <div className="space-y-2">
                    <Label>Main Product Image</Label>
                    {mainImage && !imageError[0] ? (
                      <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-dashed border-border">
                        <Image
                          src={mainImage || "/placeholder.svg"}
                          alt="Main item preview"
                          fill
                          className="object-contain p-4"
                          onError={() => setImageError((prev) => ({ ...prev, 0: true }))}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeImage(0)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30">
                        {isUploading ? (
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Uploading image...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Upload main product image</p>
                          </div>
                        )}
                      </div>
                    )}

                    <Input
                      type="file"
                      onChange={handleMainImageUpload}
                      accept="image/*"
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Product Thumbnails</Label>

                    {additionalImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {additionalImages.map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                            <Image
                              src={url || "/placeholder.svg"}
                              alt={`Additional image ${index + 1}`}
                              fill
                              className="object-cover"
                              onError={() => setImageError((prev) => ({ ...prev, [index + 1]: true }))}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => removeImage(index + 1)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">No thumbnails uploaded yet</p>
                    )}

                    <Input
                      type="file"
                      onChange={handleAdditionalImagesUpload}
                      accept="image/*"
                      multiple
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">You can select multiple images</p>
                  </div>
                </div>
              )}

              {activeTab === "pickup" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Pickup & Shipping Instructions</h3>
                    <p className="text-sm text-muted-foreground">
                      Provide details about item pickup or delivery for winners
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 rounded-lg border bg-muted/50 p-4">
                    <Switch
                      id="use_event_pickup"
                      checked={formData.use_event_pickup_instructions}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, use_event_pickup_instructions: checked })
                      }
                    />
                    <Label htmlFor="use_event_pickup" className="cursor-pointer">
                      Use event-level pickup instructions
                    </Label>
                  </div>

                  {!formData.use_event_pickup_instructions ? (
                    <div>
                      <Label htmlFor="pickup_instructions">Item-Specific Instructions</Label>
                      <Textarea
                        id="pickup_instructions"
                        value={formData.pickup_instructions}
                        onChange={(e) => setFormData({ ...formData, pickup_instructions: e.target.value })}
                        rows={10}
                        className="mt-1"
                        placeholder="Example:&#10;&#10;You do not have to attend the event in-person to bid and win auction items.&#10;&#10;Items are available after the auction closes on March 29th at 11 pm at Elks Lodge (8550 Lullwater Dr, Dallas, TX 75238) or at Reilly Elementary Flaming Lane driveway on Sunday, March 30th from 3 pm-4 pm.&#10;&#10;Additional pickup is available: text Amy Otto at 917-528-1467.&#10;&#10;Shipping is not available for any item.&#10;Item number and proof of purchase is required. (Receipt and driver's license/ID)&#10;All items are sold as-is and all sales are final and non-refundable."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        These instructions will override the event-level default for this item only
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Using Event-Level Instructions
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-200">
                        This item will use the default pickup instructions configured in Event Settings. Winners will
                        see the event-level instructions when they win this item. You can configure the default
                        instructions in the Event Settings page.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Inventory Management</h3>
                  </div>
                  <div className="text-center py-12 text-muted-foreground">
                    <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Inventory tracking coming soon</p>
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Item Comments</h3>
                  </div>
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Comments section coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-4 bg-background flex-shrink-0">
          <div className="flex justify-between items-center gap-3">
            <div className="flex gap-3">
              {initialData?.id && (
                <>
                  <Button type="button" variant="outline" onClick={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Duplicate Item</span>
                    <span className="sm:hidden">Duplicate</span>
                  </Button>

                  <Button type="button" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Delete Item</span>
                    <span className="sm:hidden">Delete</span>
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting || isUploading} className="min-w-[100px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Item"
              )}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the auction "{initialData?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
