"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import type { ShopItem } from "@/stores/cart-store"

interface OrderFormField {
  id: string
  field_name: string
  field_label: string
  field_type: string
  is_required: boolean
  placeholder?: string
  help_text?: string
  max_length?: number
  options?: string[]
  display_order: number
}

interface ShopOrderFormModalProps {
  item: ShopItem | null
  open: boolean
  onClose: () => void
  onSubmit: (formData: Record<string, string>, quantity: number) => void
}

export function ShopOrderFormModal({ item, open, onClose, onSubmit }: ShopOrderFormModalProps) {
  const { event } = useEvent()
  const { toast } = useToast()
  const [fields, setFields] = useState<OrderFormField[]>([])
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (item && open) {
      fetchOrderFormFields()
    }
  }, [item, open])

  const fetchOrderFormFields = async () => {
    if (!item || !event?.id) return

    setIsFetching(true)
    try {
      const response = await fetch(`/api/events/${event.id}/shop/items/${item.id}/order-forms`)
      if (response.ok) {
        const data = await response.json()
        setFields(data.fields || [])

        // Initialize form data with empty values
        const initialData: Record<string, string> = {}
        data.fields.forEach((field: OrderFormField) => {
          initialData[field.field_name] = ""
        })
        setFormData(initialData)
      }
    } catch (error) {
      console.error("Error fetching order form fields:", error)
      toast({
        title: "Error",
        description: "Failed to load order form",
        variant: "destructive",
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const missingFields = fields.filter((field) => field.is_required && !formData[field.field_name]?.trim())

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.map((f) => f.field_label).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // Validate max length
    const tooLongFields = fields.filter(
      (field) => field.max_length && formData[field.field_name]?.length > field.max_length,
    )

    if (tooLongFields.length > 0) {
      toast({
        title: "Text too long",
        description: `Some fields exceed the maximum length`,
        variant: "destructive",
      })
      return
    }

    onSubmit(formData, quantity)
    onClose()
    setFormData({})
    setQuantity(1)
  }

  const updateFormData = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }

  const getMaxLength = (field: OrderFormField): number | undefined => {
    // Adjust max length based on brick size selection
    if (field.field_name.startsWith("line_") && formData.brick_size) {
      if (formData.brick_size.includes("With Logo")) {
        return 13
      }
      return 16
    }
    return field.max_length
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize {item.title}</DialogTitle>
          <DialogDescription>Fill in the form below to customize your order</DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.field_name}>
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.field_type === "text" && (
                  <div className="space-y-1">
                    <Input
                      id={field.field_name}
                      value={formData[field.field_name] || ""}
                      onChange={(e) => updateFormData(field.field_name, e.target.value)}
                      placeholder={field.placeholder}
                      maxLength={getMaxLength(field)}
                      required={field.is_required}
                    />
                    {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                    {getMaxLength(field) && (
                      <p className="text-xs text-muted-foreground text-right">
                        {formData[field.field_name]?.length || 0} / {getMaxLength(field)}
                      </p>
                    )}
                  </div>
                )}

                {field.field_type === "textarea" && (
                  <div className="space-y-1">
                    <Textarea
                      id={field.field_name}
                      value={formData[field.field_name] || ""}
                      onChange={(e) => updateFormData(field.field_name, e.target.value)}
                      placeholder={field.placeholder}
                      maxLength={field.max_length}
                      required={field.is_required}
                      rows={4}
                    />
                    {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                  </div>
                )}

                {field.field_type === "select" && field.options && (
                  <div className="space-y-1">
                    <Select
                      value={formData[field.field_name] || ""}
                      onValueChange={(value) => updateFormData(field.field_name, value)}
                      required={field.is_required}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                  </div>
                )}

                {field.field_type === "number" && (
                  <div className="space-y-1">
                    <Input
                      id={field.field_name}
                      type="number"
                      value={formData[field.field_name] || ""}
                      onChange={(e) => updateFormData(field.field_name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.is_required}
                    />
                    {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                  </div>
                )}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add to Cart - ${(Number(item.price) * quantity).toFixed(2)}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
