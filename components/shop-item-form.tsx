"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  Upload,
  X,
  Package,
  Info,
  Settings,
  ImageIcon,
  Box,
  MessageSquare,
  Trash2,
  Copy,
  Plus,
  GripVertical,
  FileText,
} from "lucide-react"
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
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface ProductOption {
  id: string
  name: string
  columnName: string
  type: "dropdown" | "radio" | "checkbox"
  allowMultiple: boolean
  required: boolean // Added required field to interface
  values: { id: string; label: string; quantity: number | null }[]
}

// Added interface for order form fields
interface OrderFormField {
  id: string
  label: string
  field_type: "text" | "textarea" | "number" | "select" | "checkbox"
  required: boolean
  options: string | null // Comma-separated string for select type
  max_length: number | null
  order_index: number
  isNew?: boolean // To distinguish between newly added and existing fields
}

interface ShopItemFormProps {
  isOpen?: boolean
  onClose?: () => void
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
  item?: any
  eventId?: string
  initialFormData?: any
  setImageFile?: any
  setImagePreview?: any
  fileInputRef?: any
  handleImageChange?: any
  isSubmitting?: boolean
  setFormData?: any
  onSubmit?: any
  onDelete?: any
}

export function ShopItemForm({
  isOpen,
  onClose,
  initialData,
  onSuccess,
  onCancel,
  item,
  eventId,
  initialFormData,
  setImageFile: externalSetImageFile,
  setImagePreview: externalSetImagePreview,
  fileInputRef: externalFileInputRef,
  handleImageChange: externalHandleImageChange,
  isSubmitting: externalIsSubmitting,
  setFormData: externalSetFormData,
  onSubmit: externalOnSubmit,
  onDelete: externalOnDelete,
}: ShopItemFormProps) {
  const { event } = useEvent()
  const [activeTab, setActiveTab] = useState("details")

  const effectiveInitialData = item || initialData

  const [formData, setFormData] = useState({
    title: effectiveInitialData?.title || "",
    slug: effectiveInitialData?.slug || "",
    description: effectiveInitialData?.description || "",
    category: effectiveInitialData?.category || "",
    price: effectiveInitialData?.price || 0,
    quantity_type: effectiveInitialData?.quantity_type || "unlimited",
    quantity_available: effectiveInitialData?.quantity_available || null,
    image_url: effectiveInitialData?.image_url || "",
    is_active: effectiveInitialData?.is_active ?? true,
    featured: effectiveInitialData?.featured || false,
  })

  const [options, setOptions] = useState<ProductOption[]>([])
  const [orderFormFields, setOrderFormFields] = useState<OrderFormField[]>([])
  const [isLoadingFormFields, setIsLoadingFormFields] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(() => {
    if (effectiveInitialData?.image_url) {
      try {
        const parsed = JSON.parse(effectiveInitialData.image_url as string)
        return Array.isArray(parsed) ? parsed[0] : effectiveInitialData.image_url
      } catch {
        return effectiveInitialData.image_url
      }
    }
    return null
  })
  const [additionalImages, setAdditionalImages] = useState<string[]>(() => {
    if (effectiveInitialData?.additional_images) {
      try {
        return JSON.parse(effectiveInitialData.additional_images as string)
      } catch {
        return []
      }
    }
    return []
  })
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({})
  // </CHANGE>
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const additionalImagesInputRef = useRef<HTMLInputElement>(null)
  // </CHANGE>

  useEffect(() => {
    if (effectiveInitialData) {
      console.log("[v0] Loading item data:", effectiveInitialData)
      setFormData({
        title: effectiveInitialData.title || "",
        slug: effectiveInitialData.slug || "",
        description: effectiveInitialData.description || "",
        category: effectiveInitialData.category || "",
        price: effectiveInitialData.price || 0,
        quantity_type: effectiveInitialData.quantity_type || "unlimited",
        quantity_available: effectiveInitialData.quantity_available || null,
        image_url: effectiveInitialData.image_url || "",
        is_active: effectiveInitialData.is_active ?? true,
        featured: effectiveInitialData.featured || false,
      })
      if (effectiveInitialData.image_url) {
        try {
          const parsed = JSON.parse(effectiveInitialData.image_url as string)
          setImagePreview(Array.isArray(parsed) ? parsed[0] : effectiveInitialData.image_url)
        } catch {
          setImagePreview(effectiveInitialData.image_url)
        }
      } else {
        setImagePreview(null)
      }
      setImageFile(null)
      if (effectiveInitialData?.additional_images) {
        try {
          setAdditionalImages(JSON.parse(effectiveInitialData.additional_images as string))
        } catch {
          setAdditionalImages([])
        }
      } else {
        setAdditionalImages([])
      }

      if (effectiveInitialData.options && Array.isArray(effectiveInitialData.options)) {
        // Ensure all existing options have the 'required' property, defaulting to false if not present
        setOptions(
          effectiveInitialData.options.map((opt: ProductOption) => ({
            ...opt,
            required: opt.required ?? false, // Default to false if not present
          })),
        )
      } else {
        setOptions([])
      }

      if (effectiveInitialData.id) {
        fetchOrderFormFields(effectiveInitialData.id)
      }
    } else {
      setFormData({
        title: "",
        slug: "",
        description: "",
        category: "",
        price: 0,
        quantity_type: "unlimited",
        quantity_available: null,
        image_url: "",
        is_active: true,
        featured: false,
      })
      setImagePreview(null)
      setImageFile(null)
      setAdditionalImages([])
      setOptions([])
      setOrderFormFields([])
    }
  }, [effectiveInitialData])

  const fetchOrderFormFields = async (itemId: string) => {
    setIsLoadingFormFields(true)
    console.log("[v0] Fetching order form fields for item:", itemId)
    try {
      const effectiveEventId = event?.id || eventId
      console.log("[v0] Using event ID:", effectiveEventId)
      const url = `/api/events/${effectiveEventId}/shop/items/${itemId}/order-forms`
      console.log("[v0] Fetching from URL:", url)

      const response = await fetch(url, {
        credentials: "include",
      })

      console.log("[v0] Response status:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Order form fields received:", data)
        setOrderFormFields(data.fields || [])
      } else {
        const responseText = await response.text()
        console.error("[v0] Error response:", responseText)

        try {
          const errorData = JSON.parse(responseText)
          if (errorData.needsMigration) {
            toast.error(`Database migration required! Please run: ${errorData.migrationScript}`, { duration: 10000 })
          } else {
            toast.error(errorData.details || errorData.error || "Failed to load order form fields")
          }
        } catch {
          // Response is not JSON, show generic error
          toast.error("Failed to load order form fields. The database tables may not exist yet.")
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching order form fields:", error)
      toast.error("Error loading order form fields")
    } finally {
      setIsLoadingFormFields(false)
    }
  }

  const addFormField = () => {
    const newField: OrderFormField = {
      id: `temp-${Date.now()}`,
      label: "",
      field_type: "text",
      required: false,
      options: null,
      max_length: null,
      order_index: orderFormFields.length,
      isNew: true,
    }
    setOrderFormFields([...orderFormFields, newField])
  }

  const updateFormField = (fieldId: string, updates: Partial<OrderFormField>) => {
    setOrderFormFields(orderFormFields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)))
  }

  const deleteFormField = async (fieldId: string) => {
    const field = orderFormFields.find((f) => f.id === fieldId)
    if (field?.isNew) {
      setOrderFormFields(orderFormFields.filter((f) => f.id !== fieldId))
      return
    }

    try {
      const effectiveEventId = event?.id || eventId
      const response = await fetch(
        `/api/events/${effectiveEventId}/shop/items/${effectiveInitialData.id}/order-forms/${fieldId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      )

      if (response.ok) {
        setOrderFormFields(orderFormFields.filter((f) => f.id !== fieldId))
        toast.success("Field deleted")
      } else {
        let errorMessage = "Failed to delete field"
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          // If JSON parsing fails, read as text
          const textError = await response.text()
          errorMessage = textError || errorMessage
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Error deleting field:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete field")
    }
  }

  const saveFormField = async (field: OrderFormField) => {
    try {
      const effectiveEventId = event?.id || eventId
      const url = field.isNew
        ? `/api/events/${effectiveEventId}/shop/items/${effectiveInitialData.id}/order-forms`
        : `/api/events/${effectiveEventId}/shop/items/${effectiveInitialData.id}/order-forms/${field.id}`
      const method = field.isNew ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          field_name: field.label.toLowerCase().replace(/\s+/g, "_"), // Add field_name based on label
          field_label: field.label,
          field_type: field.field_type,
          is_required: field.required,
          options: field.options,
          max_length: field.max_length,
          display_order: field.order_index,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          // Check if it's a database error about missing table
          if (error.details && error.details.includes("relation") && error.details.includes("does not exist")) {
            throw new Error(
              "Database tables not found. Please run the migration script: scripts/create-and-seed-order-forms-v1.sql",
            )
          }
          throw new Error(error.error || error.details || "Failed to save field")
        } else {
          // Response is not JSON, likely HTML error page
          const text = await response.text()
          console.error("Non-JSON response:", text)
          throw new Error(
            "Server error. The order form tables may not exist. Please run: scripts/create-and-seed-order-forms-v1.sql",
          )
        }
      }

      const data = await response.json()
      setOrderFormFields(orderFormFields.map((f) => (f.id === field.id ? { ...data.field, isNew: false } : f)))
      toast.success("Field saved")
    } catch (error) {
      console.error("Error saving field:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save field")
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        await uploadAdditionalImage(file)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const uploadImage = async (file: File, index: number) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error("Invalid file type. Please upload JPEG, PNG, GIF, or WebP images")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

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

      if (index === 0) {
        setImagePreview(url)
        setFormData((prev) => ({ ...prev, image_url: url }))
      }

      toast.success("Image uploaded successfully")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const uploadAdditionalImage = async (file: File) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error("Invalid file type. Please upload JPEG, PNG, GIF, or WebP images")
      return
    }

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

      setAdditionalImages((prev) => [...prev, url])
      toast.success("Additional image uploaded successfully")
    } catch (error) {
      console.error("Error uploading additional image:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload image")
    }
  }
  // </CHANGE>

  const removeImage = () => {
    setImagePreview(null)
    setFormData((prev) => ({ ...prev, image_url: "" }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index))
    setImageError((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index + 1]
      return newErrors
    })
  }
  // </CHANGE>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const category = formData.category // Declare category variable here

    if (externalOnSubmit) {
      await externalOnSubmit({
        ...formData,
        options: options,
        orderFormFields: category === "order_form" ? orderFormFields : [], // Include order form fields if category is order_form
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (!event?.id && !eventId) {
        throw new Error("No event selected")
      }

      const effectiveEventId = event?.id || eventId

      const url = effectiveInitialData?.id
        ? `/api/events/${effectiveEventId}/shop/items/${effectiveInitialData.id}`
        : `/api/events/${effectiveEventId}/shop/items`
      const method = effectiveInitialData?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          price: Number.parseFloat(formData.price.toString()),
          quantity_available:
            formData.quantity_type === "limited"
              ? Number.parseInt(formData.quantity_available?.toString() || "0")
              : null,
          options: options,
          additional_images: JSON.stringify(additionalImages),
          // Include order form fields if category is order_form
          orderFormFields: formData.category === "order_form" ? orderFormFields : [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save shop item")
      }

      toast.success(effectiveInitialData?.id ? "Item updated successfully" : "Item created successfully")
      onSuccess?.()
      onClose?.()
    } catch (error) {
      console.error("Error saving shop item:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save shop item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (externalOnDelete) {
      await externalOnDelete()
      return
    }

    if (!effectiveInitialData?.id) return

    try {
      if (!event?.id && !eventId) {
        throw new Error("No event selected")
      }

      const effectiveEventId = event?.id || eventId

      const response = await fetch(`/api/events/${effectiveEventId}/shop/items/${effectiveInitialData.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete item")
      }

      toast.success("Item deleted successfully")
      setShowDeleteDialog(false)
      onCancel?.()
      onClose?.()
    } catch (error) {
      console.error("Failed to delete item:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete item")
    }
  }

  const addOption = () => {
    const newOption: ProductOption = {
      id: crypto.randomUUID(),
      name: "",
      columnName: "",
      type: "dropdown",
      allowMultiple: false,
      required: false, // Initialize required field as false
      values: [
        {
          id: crypto.randomUUID(),
          label: "",
          quantity: null,
        },
      ],
    }
    setOptions([...options, newOption])
  }

  const updateOption = (optionId: string, updates: Partial<ProductOption>) => {
    setOptions(options.map((opt) => (opt.id === optionId ? { ...opt, ...updates } : opt)))
  }

  const removeOption = (optionId: string) => {
    setOptions(options.filter((opt) => opt.id !== optionId))
  }

  const addOptionValue = (optionId: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: [
                ...opt.values,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  quantity: null,
                },
              ],
            }
          : opt,
      ),
    )
  }

  const updateOptionValue = (optionId: string, valueId: string, label: string, quantity: number | null) => {
    setOptions(
      options.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: opt.values.map((val) => (val.id === valueId ? { ...val, label, quantity } : val)),
            }
          : opt,
      ),
    )
  }

  const removeOptionValue = (optionId: string, valueId: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: opt.values.filter((val) => val.id !== valueId),
            }
          : opt,
      ),
    )
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{effectiveInitialData?.id ? "Edit Item" : "Add Item"}</h2>
            <p className="text-xs text-muted-foreground">Update item information and images</p>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Sidebar Navigation */}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            {activeTab === "details" && (
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
                        slug: !effectiveInitialData?.id ? generateSlug(newTitle) : formData.slug,
                      })
                    }}
                    required
                    className="mt-1"
                    placeholder="School Spirit T-Shirt"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: generateSlug(e.target.value),
                      })
                    }
                    required
                    className="mt-1"
                    placeholder="school-spirit-t-shirt"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be used in the URL: /shop/
                    {formData.slug || "your-slug-here"}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: Number.parseFloat(e.target.value),
                        })
                      }
                      required
                      className="mt-1"
                      placeholder="25.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apparel">Apparel</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="food">Food & Beverage</SelectItem>
                        <SelectItem value="tickets">Tickets</SelectItem>
                        <SelectItem value="order_form">Order Form</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select "Order Form" for items that require custom input fields
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="mt-1"
                    placeholder="Describe the product in detail..."
                  />
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Product Settings</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active (visible in store)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                  <Label htmlFor="featured" className="cursor-pointer">
                    Feature this item on the home page
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
                  {imagePreview ? (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-dashed border-border">
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="Product preview"
                        fill
                        className="object-contain p-4"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-64 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <div className="text-center">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No image uploaded</p>
                      </div>
                    </div>
                  )}

                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleImageUpload}
                    accept="image/*"
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  {isUploading && (
                    <p className="text-sm text-muted-foreground">
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Additional Product Images</Label>

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
                          {imageError[index + 1] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted">
                              <p className="text-xs text-muted-foreground">Failed to load</p>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => removeAdditionalImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No additional images uploaded yet</p>
                    </div>
                  )}

                  <Input
                    ref={additionalImagesInputRef}
                    type="file"
                    onChange={handleAdditionalImagesUpload}
                    accept="image/*"
                    multiple
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">You can select multiple images to upload at once</p>
                </div>
                {/* </CHANGE> */}
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Inventory & Options</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage product variants like size, color, or material with individual quantities
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Product Options</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {options.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No options added yet. Add options like Size, Color, or Material.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {options.map((option) => (
                        <Card key={option.id} className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-4">
                                <div>
                                  <Label>Option Title</Label>
                                  <Input
                                    placeholder="e.g., Select Your Backpack Keychain Color Combo"
                                    value={option.name}
                                    onChange={(e) =>
                                      updateOption(option.id, {
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </div>

                                <div>
                                  <Label>Apply to column</Label>
                                  <Input
                                    placeholder="Option name"
                                    value={option.columnName}
                                    onChange={(e) =>
                                      updateOption(option.id, {
                                        columnName: e.target.value,
                                      })
                                    }
                                  />
                                </div>

                                <div>
                                  <Label>Criteria</Label>
                                  <Select
                                    value={option.type}
                                    onValueChange={(value: any) => updateOption(option.id, { type: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="dropdown">Dropdown</SelectItem>
                                      <SelectItem value="radio">Radio Buttons</SelectItem>
                                      <SelectItem value="checkbox">Checkboxes</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  {option.values.map((val, index) => (
                                    <div key={val.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      <div className="h-10 w-10 rounded bg-primary/20 flex-shrink-0" />
                                      <Input
                                        placeholder="Value name"
                                        value={val.label}
                                        onChange={(e) =>
                                          updateOptionValue(option.id, val.id, e.target.value, val.quantity)
                                        }
                                        className="flex-1"
                                      />
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          placeholder="Qty"
                                          value={val.quantity ?? ""}
                                          onChange={(e) =>
                                            updateOptionValue(
                                              option.id,
                                              val.id,
                                              val.label,
                                              e.target.value ? Number.parseInt(e.target.value) : null,
                                            )
                                          }
                                          className="w-20"
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeOptionValue(option.id, val.id)}
                                          disabled={option.values.length === 1}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-dashed bg-transparent"
                                    onClick={() => addOptionValue(option.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add another item
                                  </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`allow-multiple-${option.id}`}
                                    checked={option.allowMultiple}
                                    onCheckedChange={(checked) =>
                                      updateOption(option.id, {
                                        allowMultiple: checked as boolean,
                                      })
                                    }
                                  />
                                  <Label htmlFor={`allow-multiple-${option.id}`} className="cursor-pointer">
                                    Allow multiple selections
                                  </Label>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`required-${option.id}`}
                                    checked={option.required}
                                    onCheckedChange={(checked) =>
                                      updateOption(option.id, {
                                        required: checked as boolean,
                                      })
                                    }
                                  />
                                  <Label htmlFor={`required-${option.id}`} className="cursor-pointer">
                                    Required field
                                  </Label>
                                </div>
                                {/* </CHANGE> */}
                              </div>

                              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(option.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Comments & Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Internal notes about this product (not visible to customers)
                  </p>
                </div>

                <div>
                  <Textarea placeholder="Add internal notes about this product..." rows={8} className="resize-none" />
                </div>
              </div>
            )}

            {activeTab === "order-form" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Custom Order Form Fields</h3>
                  <p className="text-sm text-muted-foreground">
                    Add custom fields for customers to fill out when ordering this item
                  </p>
                </div>

                {!effectiveInitialData?.id ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Save this item first to add custom order form fields.
                    </p>
                  </div>
                ) : isLoadingFormFields ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold">Form Fields</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addFormField}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>

                    {orderFormFields.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No custom fields added yet. Add fields to collect information from customers.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orderFormFields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="space-y-4">
                              <div className="flex items-start gap-4">
                                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                                <div className="flex-1 space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Field Label</Label>
                                      <Input
                                        placeholder="e.g., Line 1 Text"
                                        value={field.label}
                                        onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Field Type</Label>
                                      <Select
                                        value={field.field_type}
                                        onValueChange={(value) => updateFormField(field.id, { field_type: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="text">Text</SelectItem>
                                          <SelectItem value="textarea">Text Area</SelectItem>
                                          <SelectItem value="number">Number</SelectItem>
                                          <SelectItem value="select">Dropdown</SelectItem>
                                          <SelectItem value="checkbox">Checkbox</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {field.field_type === "text" && (
                                    <div>
                                      <Label>Max Characters</Label>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 16"
                                        value={field.max_length || ""}
                                        onChange={(e) =>
                                          updateFormField(field.id, {
                                            max_length: e.target.value ? Number.parseInt(e.target.value) : null,
                                          })
                                        }
                                      />
                                    </div>
                                  )}

                                  {field.field_type === "select" && (
                                    <div>
                                      <Label>Options (comma separated)</Label>
                                      <Input
                                        placeholder="e.g., 4x8 - With Logo, 4x8 - No Logo"
                                        value={field.options || ""}
                                        onChange={(e) => updateFormField(field.id, { options: e.target.value })}
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`required-${field.id}`}
                                      checked={field.required}
                                      onCheckedChange={(checked) =>
                                        updateFormField(field.id, { required: checked as boolean })
                                      }
                                    />
                                    <Label htmlFor={`required-${field.id}`} className="cursor-pointer">
                                      Required field
                                    </Label>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => saveFormField(field)}
                                    >
                                      Save Field
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteFormField(field.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t px-4 py-4 bg-background flex-shrink-0">
        <div className="flex justify-between items-center gap-3">
          <div className="flex gap-3">
            {effectiveInitialData?.id && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDuplicate(formData, setFormData, event, onSuccess)}
                >
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
          <Button
            type="submit"
            disabled={externalIsSubmitting || isSubmitting || isUploading}
            className="min-w-[100px]"
          >
            {externalIsSubmitting || isSubmitting ? (
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
  )

  return (
    <>
      {isOpen ? (
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent className="overflow-y-auto sm:max-w-4xl p-0 flex">{formContent}</SheetContent>
        </Sheet>
      ) : (
        formContent
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the item "{effectiveInitialData?.title}". This action cannot be undone.
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

const tabs = [
  { id: "details", label: "Details", icon: Info },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "inventory", label: "Inventory & Options", icon: Box },
  { id: "order-form", label: "Order Form Fields", icon: FileText }, // Added for order form fields
  { id: "comments", label: "Comments & Notes", icon: MessageSquare },
]

const handleDuplicate = async (formData: any, setFormData: any, event: any, onSuccess: any) => {
  try {
    const duplicatedData = {
      ...formData,
      title: `${formData.title} (Copy)`,
      slug: generateSlug(`${formData.title} copy`),
    }

    if (!event?.id) throw new Error("No event selected")

    const response = await fetch(`/api/events/${event.id}/shop/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...duplicatedData,
        price: Number.parseFloat(duplicatedData.price.toString()),
        quantity_available:
          duplicatedData.quantity_type === "limited"
            ? Number.parseInt(duplicatedData.quantity_available?.toString() || "0")
            : null,
        // Include order form fields if duplicating an order form item
        orderFormFields: duplicatedData.category === "order_form" ? formData.orderFormFields : [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to duplicate item")
    }

    toast.success("Item duplicated successfully")
    onSuccess?.()
  } catch (error) {
    console.error("Error duplicating item:", error)
    toast.error(error instanceof Error ? error.message : "Failed to duplicate item")
  }
}
