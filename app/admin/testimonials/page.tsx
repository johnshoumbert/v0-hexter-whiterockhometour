"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Plus, Loader2 } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Drag3 } from "lucide-react"

export interface Testimonial {
  id: string
  author_name: string
  author_title: string
  author_avatar?: string
  quote: string
  display_order: number
}

interface TestimonialFormProps {
  initialData?: Testimonial
  onSuccess: () => void
  onDelete: () => void
}

function TestimonialForm({ initialData, onSuccess, onDelete }: TestimonialFormProps) {
  const { event } = useEvent()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.author_avatar || null)
  const [formData, setFormData] = useState(
    initialData || {
      author_name: "",
      author_title: "",
      author_avatar: "",
      quote: "",
      display_order: 0,
    }
  )

  const handleAvatarUpload = async (file: File) => {
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: formDataUpload,
      })

      if (res.ok) {
        const data = await res.json()
        setFormData({ ...formData, author_avatar: data.url })
        setAvatarPreview(data.url)
        toast({
          title: "Success",
          description: "Avatar uploaded successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event?.id) return

    setIsSubmitting(true)
    try {
      const url = initialData
        ? `/api/events/${event.id}/testimonials/${initialData.id}`
        : `/api/events/${event.id}/testimonials`

      const response = await fetch(url, {
        method: initialData ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Testimonial ${initialData ? "updated" : "created"} successfully`,
        })
        onSuccess()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save testimonial",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save testimonial",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!event?.id || !initialData) return
    if (!confirm("Are you sure you want to delete this testimonial?")) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/testimonials/${initialData.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Testimonial deleted successfully",
        })
        onDelete()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete testimonial",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete testimonial",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">{initialData ? "Edit Testimonial" : "Add New Testimonial"}</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Author Avatar</label>
          <div className="flex items-end gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatarPreview || ""} />
              <AvatarFallback>{formData.author_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAvatarUpload(file)
                }}
                className="hidden"
                id="avatar-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("avatar-input")?.click()}
              >
                Upload Avatar
              </Button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Author Name *</label>
          <Input
            value={formData.author_name}
            onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
            placeholder="Enter author name"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Author Title</label>
          <Input
            value={formData.author_title}
            onChange={(e) => setFormData({ ...formData, author_title: e.target.value })}
            placeholder="e.g., Dallas Center for Architecture"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Testimonial Quote *</label>
          <Textarea
            value={formData.quote}
            onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
            placeholder="Enter the testimonial quote"
            rows={5}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Display Order</label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
      </form>

      <div className="border-t p-4 flex gap-2">
        {initialData && (
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            Delete
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isSubmitting} className="ml-auto">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {initialData ? "Update" : "Create"} Testimonial
        </Button>
      </div>
    </div>
  )
}

export default function TestimonialsAdminPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | undefined>()

  // Fetch testimonials
  const fetchTestimonials = async () => {
    if (!event?.id) return

    try {
      setIsLoading(true)
      const res = await fetch(`/api/events/${event.id}/testimonials`, {
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setTestimonials(data.testimonials)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch testimonials",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch testimonials",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTestimonials()
  }, [event?.id])

  const handleFormSuccess = () => {
    setIsSheetOpen(false)
    setEditingTestimonial(undefined)
    fetchTestimonials()
  }

  const handleFormDelete = () => {
    setIsSheetOpen(false)
    setEditingTestimonial(undefined)
    fetchTestimonials()
  }

  const handleEditClick = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial)
    setIsSheetOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testimonials</h1>
          <p className="text-muted-foreground">Manage testimonials displayed on the home page carousel</p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      {/* Testimonials Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card
            key={testimonial.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleEditClick(testimonial)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage src={testimonial.author_avatar || ""} />
                  <AvatarFallback>{testimonial.author_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{testimonial.author_name}</h3>
                  {testimonial.author_title && (
                    <p className="text-xs text-muted-foreground truncate">{testimonial.author_title}</p>
                  )}
                </div>
              </div>
              <p className="text-sm italic text-gray-700 line-clamp-3 mb-2">"{testimonial.quote}"</p>
              <p className="text-xs text-muted-foreground">Order: {testimonial.display_order}</p>
            </CardContent>
          </Card>
        ))}

        {testimonials.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No testimonials yet</p>
              <Button onClick={() => setIsSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Testimonial
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
          <TestimonialForm
            initialData={editingTestimonial}
            onSuccess={handleFormSuccess}
            onDelete={handleFormDelete}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
