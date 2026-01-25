"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, X, Home, Info, Settings, ImageIcon, Trash2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
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

interface HomeFormProps {
  initialData?: any
  onSuccess?: () => void
  onDelete?: () => void
}

export function HomeEditForm({ initialData, onSuccess, onDelete }: HomeFormProps) {
  const { event } = useEvent()
  const [activeTab, setActiveTab] = useState("info")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({})

  const parseImageUrls = (imageData: any): string[] => {
    if (!imageData) return []
    
    // If already an array, return it (filtering out empty arrays and invalid values)
    if (Array.isArray(imageData)) {
      return imageData.filter(item => typeof item === 'string' && item.length > 0)
    }
    
    // If it's a string, try to parse it
    if (typeof imageData === 'string') {
      try {
        const parsed = JSON.parse(imageData)
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string' && item.length > 0)
        }
        return [imageData]
      } catch {
        return [imageData]
      }
    }
    
    return []
  }

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    address: initialData?.address || "",
    sponsor: initialData?.sponsor || "",
    short_description: initialData?.short_description || "",
    full_description: initialData?.full_description || "",
    directions_url: initialData?.directions_url || "",
    display_order: initialData?.display_order || 0,
    item_images: initialData?.item_images || "",
  })

  const [images, setImages] = useState<string[]>(parseImageUrls(initialData?.item_images))

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
      setImageError((prev) => ({ ...prev, [index]: true }))
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
        item_images: images.length > 0 ? JSON.stringify(images) : null,
        display_order: Number(formData.display_order),
        event_id: event.id,
      }

      const url = initialData?.id
        ? `/api/events/${event.id}/homes/${initialData.id}`
        : `/api/events/${event.id}/homes`
      const method = initialData?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || "Failed to save home"
        throw new Error(errorMessage)
      }

      toast.success(initialData?.id ? "Home updated successfully" : "Home created successfully")
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error saving home:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save home"
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

      const response = await fetch(`/api/events/${event.id}/homes/${initialData.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete home")
      }

      toast.success("Home deleted successfully")
      setShowDeleteDialog(false)
      onDelete?.()
    } catch (error) {
      console.error("[v0] Failed to delete home:", error)
      toast.error("Failed to delete home")
    }
  }

  const mainImage = images[0]
  const additionalImages = images.slice(1)

  const tabs = [
    { id: "info", label: "Details", icon: Info },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "images", label: "Images", icon: ImageIcon },
  ]

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="border-b px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{initialData?.id ? "Edit Home" : "Add Home"}</h2>
              <p className="text-xs text-muted-foreground">Update home information and images</p>
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
                    <h3 className="text-lg font-semibold mb-4">Home Details</h3>
                  </div>

                  <div>
                    <Label htmlFor="name">Home Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="mt-1"
                      placeholder="e.g., Modern Lakefront Estate"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1"
                      placeholder="123 Main Street, City, State"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sponsor">Sponsor</Label>
                    <Input
                      id="sponsor"
                      value={formData.sponsor}
                      onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                      className="mt-1"
                      placeholder="e.g., ABC Realty Group"
                    />
                  </div>

                  <div>
                    <Label htmlFor="short_description">Short Description</Label>
                    <Input
                      id="short_description"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      className="mt-1"
                      placeholder="Brief one-line description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="full_description">Full Description</Label>
                    <Textarea
                      id="full_description"
                      value={formData.full_description}
                      onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                      className="mt-1"
                      placeholder="Detailed description of the home"
                      rows={6}
                    />
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Home Settings</h3>
                  </div>

                  <div>
                    <Label htmlFor="directions_url">Directions URL</Label>
                    <Input
                      id="directions_url"
                      value={formData.directions_url}
                      onChange={(e) => setFormData({ ...formData, directions_url: e.target.value })}
                      className="mt-1"
                      placeholder="https://google.com/maps/..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">Link to directions or map</p>
                  </div>

                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                      className="mt-1"
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
                  </div>
                </div>
              )}

              {activeTab === "images" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Home Images</h3>
                  </div>

                  {mainImage ? (
                    <div>
                      <Label>Main Image</Label>
                      <div className="mt-2 relative group">
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={mainImage}
                            alt="Main"
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=400&width=600"
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/50 rounded-lg">
                          <Upload className="h-6 w-6 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMainImageUpload}
                            disabled={isUploading}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Main Image</Label>
                      <label className="mt-2 flex items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">Upload main image</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {additionalImages.length > 0 && (
                    <div>
                      <Label>Additional Images ({additionalImages.length})</Label>
                      <div className="mt-2 grid grid-cols-3 gap-4">
                        {additionalImages.map((image, idx) => (
                          <div key={idx} className="relative group">
                            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                              <Image
                                src={image}
                                alt={`Image ${idx + 2}`}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=300&width=300"
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(idx + 1)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Add more images</p>
                      <p className="text-xs text-muted-foreground">Drag and drop or click to select</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleAdditionalImagesUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  {isUploading && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm text-muted-foreground">Uploading image...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex gap-2 justify-between flex-shrink-0">
          <div>
            {initialData?.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? "Update Home" : "Create Home"}
          </Button>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Home</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{initialData?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
