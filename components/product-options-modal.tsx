"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Minus, Plus, Loader2 } from "lucide-react"
import type { ShopItem } from "@/stores/cart-store"
import { useEvent } from "@/contexts/event-context"

interface ProductOptionsModalProps {
  item: ShopItem | null
  open: boolean
  onClose: () => void
  onAddToCart: (selectedOptions: Record<string, string | string[]>, quantity: number) => void
  shopClosed?: boolean
}

export function ProductOptionsModal({ item, open, onClose, onAddToCart, shopClosed }: ProductOptionsModalProps) {
  const { event } = useEvent()
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [availability, setAvailability] = useState<Record<string, Record<string, number>>>({})
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)

  useEffect(() => {
    if (item && event?.id && open) {
      fetchAvailability()
    }
  }, [item, event?.id, open])

  const fetchAvailability = async () => {
    if (!item || !event?.id) return

    setIsLoadingAvailability(true)
    try {
      const response = await fetch(`/api/events/${event.id}/shop/items/${item.id}/availability`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data.optionAvailability || {})
      }
    } catch (error) {
      console.error("Error fetching availability:", error)
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  const handleOptionChange = (optionId: string, value: string | string[]) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const handleCheckboxChange = (optionId: string, valueId: string, checked: boolean) => {
    setSelectedOptions((prev) => {
      const current = (prev[optionId] as string[]) || []
      if (checked) {
        return { ...prev, [optionId]: [...current, valueId] }
      } else {
        return { ...prev, [optionId]: current.filter((id) => id !== valueId) }
      }
    })
  }

  const isValid = () => {
    if (!item?.options) return true

    return item.options.every((option) => {
      if (!option.required) return true
      const value = selectedOptions[option.id]
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return !!value
    })
  }

  const getAvailability = (optionId: string, valueId: string): number => {
    return availability[optionId]?.[valueId] ?? 999
  }

  const handleSubmit = () => {
    if (!isValid() || shopClosed) return
    onAddToCart(selectedOptions, quantity)
    setSelectedOptions({})
    setQuantity(1)
    onClose()
  }

  const handleClose = () => {
    setSelectedOptions({})
    setQuantity(1)
    onClose()
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Options for {item.title}</DialogTitle>
        </DialogHeader>

        {isLoadingAvailability ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            {item.options?.map((option) => (
              <div key={option.id} className="space-y-3">
                <Label className="text-base font-semibold">
                  {option.name}
                  {option.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {option.type === "dropdown" && (
                  <Select
                    value={selectedOptions[option.id] as string}
                    onValueChange={(value) => handleOptionChange(option.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option">
                        {(() => {
                          const selectedId = selectedOptions[option.id]
                          if (!selectedId) return "Select an option"

                          const selectedValue = option.values.find((v) => v.id === selectedId)
                          if (!selectedValue) return "Select an option"

                          const available = getAvailability(option.id, selectedValue.id)
                          return `${selectedValue.label}${available < 999 ? ` (${available} available)` : ""}`
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {option.values.map((value) => {
                        const available = getAvailability(option.id, value.id)
                        const isOutOfStock = available <= 0

                        return (
                          <SelectItem key={value.id} value={value.id} disabled={isOutOfStock}>
                            {value.value}
                            {available < 999 && (
                              <span
                                className={`text-xs ml-2 ${isOutOfStock ? "text-destructive" : "text-muted-foreground"}`}
                              >
                                ({isOutOfStock ? "Sold out" : `${available} available`})
                              </span>
                            )}
                            {value.priceModifier && value.priceModifier !== 0 && (
                              <span className="text-muted-foreground ml-2">
                                ({value.priceModifier > 0 ? "+" : ""}${value.priceModifier.toFixed(2)})
                              </span>
                            )}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}

                {option.type === "radio" && (
                  <RadioGroup
                    value={selectedOptions[option.id] as string}
                    onValueChange={(value) => handleOptionChange(option.id, value)}
                  >
                    {option.values.map((value) => {
                      const available = getAvailability(option.id, value.id)
                      const isOutOfStock = available <= 0

                      return (
                        <div key={value.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={value.id} id={`${option.id}-${value.id}`} disabled={isOutOfStock} />
                          <Label
                            htmlFor={`${option.id}-${value.id}`}
                            className={`font-normal cursor-pointer ${isOutOfStock ? "text-muted-foreground line-through" : ""}`}
                          >
                            {value.label}
                            {value.priceModifier && value.priceModifier !== 0 && (
                              <span className="text-muted-foreground ml-2">
                                ({value.priceModifier > 0 ? "+" : ""}${value.priceModifier.toFixed(2)})
                              </span>
                            )}
                            {available < 999 && (
                              <span
                                className={`text-xs ml-2 ${isOutOfStock ? "text-destructive" : "text-muted-foreground"}`}
                              >
                                ({isOutOfStock ? "Sold out" : `${available} available`})
                              </span>
                            )}
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                )}

                {option.type === "checkbox" && (
                  <div className="space-y-2">
                    {option.values.map((value) => {
                      const available = getAvailability(option.id, value.id)
                      const isOutOfStock = available <= 0

                      return (
                        <div key={value.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${option.id}-${value.id}`}
                            checked={((selectedOptions[option.id] as string[]) || []).includes(value.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(option.id, value.id, checked as boolean)}
                            disabled={isOutOfStock}
                          />
                          <Label
                            htmlFor={`${option.id}-${value.id}`}
                            className={`font-normal cursor-pointer ${isOutOfStock ? "text-muted-foreground line-through" : ""}`}
                          >
                            {value.label}
                            {value.priceModifier && value.priceModifier !== 0 && (
                              <span className="text-muted-foreground ml-2">
                                ({value.priceModifier > 0 ? "+" : ""}${value.priceModifier.toFixed(2)})
                              </span>
                            )}
                            {available < 999 && (
                              <span
                                className={`text-xs ml-2 ${isOutOfStock ? "text-destructive" : "text-muted-foreground"}`}
                              >
                                ({isOutOfStock ? "Sold out" : `${available} available`})
                              </span>
                            )}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            <div className="space-y-3">
              <Label className="text-base font-semibold">Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid() || isLoadingAvailability || shopClosed}>
            {shopClosed ? "Not Available" : "Add to Cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
