"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import type { ShopItem } from "@/stores/cart-store"

interface ShopItemDetailDialogProps {
  item: ShopItem | null
  open: boolean
  onClose: () => void
  onAddToCart: (item: ShopItem) => void
  availableQuantity: number
}

export function ShopItemDetailDialog({
  item,
  open,
  onClose,
  onAddToCart,
  availableQuantity,
}: ShopItemDetailDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!item) return null

  // Parse additional images from JSON string
  const additionalImages = item.additional_images
    ? typeof item.additional_images === "string"
      ? JSON.parse(item.additional_images)
      : item.additional_images
    : []

  // Combine main image with additional images for gallery
  const allImages = [item.image_url, ...additionalImages].filter(Boolean)
  const hasMultipleImages = allImages.length > 1

  const isOutOfStock = item.quantity_type === "limited" && availableQuantity <= 0

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentImageIndex(0)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            {allImages.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={allImages[currentImageIndex] || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    className="object-contain"
                  />
                  {hasMultipleImages && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {allImages.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail Navigation */}
                {hasMultipleImages && (
                  <div className="grid grid-cols-5 gap-2">
                    {allImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                          currentImageIndex === index
                            ? "border-primary"
                            : "border-transparent hover:border-muted-foreground"
                        }`}
                      >
                        <Image
                          src={img || "/placeholder.svg"}
                          alt={`${item.title} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {item.featured && <Badge variant="default">Featured</Badge>}
                {item.category && <Badge variant="secondary">{item.category}</Badge>}
              </div>

              <div className="text-3xl font-bold mb-2">${Number(item.price).toFixed(2)}</div>

              <div className="text-sm text-muted-foreground mb-4">
                {item.quantity_type === "unlimited" && "Unlimited availability"}
                {item.quantity_type === "preorder" && "Pre-order"}
                {item.quantity_type === "limited" && (isOutOfStock ? "Out of Stock" : `${availableQuantity} in stock`)}
              </div>
            </div>

            {item.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
              </div>
            )}

            {item.options && item.options.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Available Options</h3>
                <div className="flex flex-wrap gap-2">
                  {item.options.map((option: any, index: number) => (
                    <Badge key={index} variant="outline">
                      {option.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                onAddToCart(item)
                onClose()
              }}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
