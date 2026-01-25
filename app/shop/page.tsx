"use client"
import { useEvent } from "@/contexts/event-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ShopItemForm } from "@/components/shop-item-form"
import { ProductOptionsModal } from "@/components/product-options-modal"
import { ShopOrderFormModal } from "@/components/shop-order-form-modal"
import { ShopItemDetailDialog } from "@/components/shop-item-detail-dialog"
import { LoginModal } from "@/components/login-modal"
import { useAuth } from "@/contexts/auth-context"
import { useCartStore, type ShopItem } from "@/stores/cart-store"
import { ShoppingCart, Loader2, Plus, Package, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ShopPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const { user } = useAuth()
  const { addToCart, clearCart } = useCartStore()
  const [items, setItems] = useState<ShopItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Added state for options modal
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<ShopItem | null>(null)

  const [orderFormModalOpen, setOrderFormModalOpen] = useState(false)
  const [selectedItemForOrderForm, setSelectedItemForOrderForm] = useState<ShopItem | null>(null)

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ShopItem | null>(null)

  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // Added state for shop closure status
  const [shopClosed, setShopClosed] = useState(false)
  const [closureMessage, setClosureMessage] = useState("")

  useEffect(() => {
    checkAdminStatus()
  }, [])

  useEffect(() => {
    if (event?.id) {
      fetchItems()
      fetchShopStatus()
    }
  }, [event?.id])

  useEffect(() => {
    if (shopClosed) {
      clearCart()
    }
  }, [shopClosed, clearCart])

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      // Check if we returned from a cancelled checkout
      const urlParams = new URLSearchParams(window.location.search)
      const cancelledSessionId = sessionStorage.getItem("pending_shop_session_id")

      // If we have a pending session stored but no success session_id in URL, checkout was likely cancelled
      if (cancelledSessionId && !urlParams.get("session_id")) {
        console.log("[v0] Detected cancelled checkout, cleaning up orders...")

        try {
          const response = await fetch(`/api/events/${event?.id}/shop/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: cancelledSessionId }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`[v0] Cleaned up ${data.deletedCount} cancelled orders`)
          }
        } catch (error) {
          console.error("[v0] Error cleaning up cancelled orders:", error)
        } finally {
          // Clear the stored session
          sessionStorage.removeItem("pending_shop_session_id")
        }
      } else if (urlParams.get("session_id")) {
        // Success page - clear the stored session
        sessionStorage.removeItem("pending_shop_session_id")
      }
    }

    if (event?.id) {
      handleCheckoutReturn()
    }
  }, [event?.id])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/auth/check-admin")
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin)
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }

  const fetchItems = async () => {
    if (!event?.id) return

    setIsLoading(true)
    try {
      const activeParam = isAdmin ? "" : "?active=true"
      const response = await fetch(`/api/events/${event.id}/shop/items${activeParam}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching shop items:", error)
      toast({
        title: "Error",
        description: "Failed to load shop items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Added function to fetch shop closure status
  const fetchShopStatus = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/shop/status`)
      if (response.ok) {
        const data = await response.json()
        setShopClosed(data.closed || false)
        setClosureMessage(data.message || "")
      }
    } catch (error) {
      console.error("Error fetching shop status:", error)
    }
  }

  const openSheet = (item?: any) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem(null)
    }
    setIsSheetOpen(true)
  }

  const openDetailDialog = (item: ShopItem) => {
    setSelectedItemForDetail(item)
    setDetailDialogOpen(true)
  }

  // Updated handleAddToCart to check for options and order_form category
  const handleAddToCart = (item: ShopItem) => {
    if (!user) {
      setLoginModalOpen(true)
      return
    }

    // Check if item is an order form type
    if (item.category === "order_form") {
      setSelectedItemForOrderForm(item)
      setOrderFormModalOpen(true)
      return
    }

    // Check if item has options
    if (item.options && item.options.length > 0) {
      setSelectedItemForOptions(item)
      setOptionsModalOpen(true)
    } else {
      // No options, add directly to cart
      addToCart(item, 1)
      toast({
        title: "Added to cart",
        description: `${item.title} added to cart`,
      })
    }
  }

  const handleOrderFormSubmit = (formData: Record<string, string>, quantity: number) => {
    if (!selectedItemForOrderForm) return

    // Store the form data as selectedOptions
    addToCart(selectedItemForOrderForm, quantity, formData)
    toast({
      title: "Added to cart",
      description: `${selectedItemForOrderForm.title} (x${quantity}) added to cart with custom details`,
    })
  }

  const handleAddToCartWithOptions = (selectedOptions: Record<string, string | string[]>, quantity: number) => {
    if (!selectedItemForOptions) return

    addToCart(selectedItemForOptions, quantity, selectedOptions)
    toast({
      title: "Added to cart",
      description: `${selectedItemForOptions.title} (x${quantity}) added to cart`,
    })
  }

  const getAvailableQuantity = (item: ShopItem): number => {
    // If item has options, calculate total available from all option values
    if (item.options && Array.isArray(item.options) && item.options.length > 0) {
      let totalAvailable = 0

      item.options.forEach((option: any) => {
        if (option.values && Array.isArray(option.values)) {
          option.values.forEach((value: any) => {
            totalAvailable += value.quantity || 0
          })
        }
      })

      const totalSold = item.quantity_sold || 0
      return totalAvailable - totalSold
    }

    // Legacy handling for items without options
    if (item.quantity_type === "unlimited" || item.quantity_type === "preorder") {
      return 999
    }
    return (item.quantity_available || 0) - item.quantity_sold
  }

  const getQuantityDisplayText = (item: ShopItem): string => {
    // If item has options, calculate total available from all option values
    if (item.options && Array.isArray(item.options) && item.options.length > 0) {
      let totalAvailable = 0

      item.options.forEach((option: any) => {
        if (option.values && Array.isArray(option.values)) {
          option.values.forEach((value: any) => {
            totalAvailable += value.quantity || 0
          })
        }
      })

      const totalSold = item.quantity_sold || 0
      const available = totalAvailable - totalSold

      if (available <= 0) return "Out of Stock"
      return `${available} available`
    }

    // Legacy handling for items without options
    if (item.quantity_type === "unlimited") return "Unlimited"
    if (item.quantity_type === "preorder") return "Pre-order"

    const available = getAvailableQuantity(item)
    if (available <= 0) return "Out of Stock"
    return `${available} available`
  }

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const featuredItems = filteredItems.filter((item) => item.featured)
  const regularItems = filteredItems.filter((item) => !item.featured)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{event?.shop_title || "Shop"}</h1>
          <p className="text-muted-foreground mt-2">{event?.shop_description || "Browse and purchase items"}</p>
        </div>

        {isAdmin && (
          <Button onClick={() => openSheet()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {shopClosed && (
        <div className="mb-6 bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="font-semibold text-destructive">Shop is currently closed</p>
          {closureMessage && <p className="text-sm mt-1">{closureMessage}</p>}
        </div>
      )}

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {featuredItems.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Featured Items</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAddToCart={handleAddToCart}
                onClick={() => openDetailDialog(item)}
                availableQuantity={getAvailableQuantity(item)}
                quantityDisplayText={getQuantityDisplayText(item)}
                isAdmin={isAdmin}
                onView={() => openSheet(item)}
                shopClosed={shopClosed}
              />
            ))}
          </div>
        </section>
      )}

      {regularItems.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">All Items</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {regularItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAddToCart={handleAddToCart}
                onClick={() => openDetailDialog(item)}
                availableQuantity={getAvailableQuantity(item)}
                quantityDisplayText={getQuantityDisplayText(item)}
                isAdmin={isAdmin}
                onView={() => openSheet(item)}
                shopClosed={shopClosed}
              />
            ))}
          </div>
        </section>
      )}

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No items available</p>
            <p className="text-muted-foreground">Check back later for new items!</p>
          </CardContent>
        </Card>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
          <ShopItemForm
            initialData={editingItem}
            onSuccess={() => {
              setIsSheetOpen(false)
              fetchItems()
            }}
            onDelete={() => {
              setIsSheetOpen(false)
              fetchItems()
            }}
          />
        </SheetContent>
      </Sheet>

      <ShopItemDetailDialog
        item={selectedItemForDetail}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false)
          setSelectedItemForDetail(null)
        }}
        onAddToCart={handleAddToCart}
        availableQuantity={selectedItemForDetail ? getAvailableQuantity(selectedItemForDetail) : 0}
      />

      <ProductOptionsModal
        item={selectedItemForOptions}
        open={optionsModalOpen}
        onClose={() => {
          setOptionsModalOpen(false)
          setSelectedItemForOptions(null)
        }}
        onAddToCart={handleAddToCartWithOptions}
        shopClosed={shopClosed}
      />

      <ShopOrderFormModal
        item={selectedItemForOrderForm}
        open={orderFormModalOpen}
        onClose={() => {
          setOrderFormModalOpen(false)
          setSelectedItemForOrderForm(null)
        }}
        onSubmit={handleOrderFormSubmit}
      />

      {/* Render LoginModal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => {
          toast({
            title: "Logged in successfully",
            description: "You can now add items to your cart",
          })
        }}
      />
    </div>
  )
}

function ItemCard({
  item,
  onAddToCart,
  onClick,
  availableQuantity,
  quantityDisplayText,
  isAdmin,
  onView,
  shopClosed,
}: {
  item: ShopItem
  onAddToCart: (item: ShopItem) => void
  onClick?: () => void
  availableQuantity: number
  quantityDisplayText: string
  isAdmin: boolean
  onView: () => void
  shopClosed?: boolean
}) {
  const isOutOfStock = availableQuantity <= 0

  return (
    <Card className="flex flex-col cursor-pointer transition-shadow hover:shadow-lg" onClick={onClick}>
      {item.image_url && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img src={item.image_url || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">{item.title}</CardTitle>
          <div className="flex items-center gap-2">
            {item.featured && <Badge variant="outline">Featured</Badge>}
            {isAdmin && !item.is_active && <Badge variant="secondary">Inactive</Badge>}
          </div>
        </div>
        {item.category && (
          <CardDescription>
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {item.description && <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold">${Number(item.price).toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{quantityDisplayText}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !shopClosed && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onView()
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart(item)
            }}
            disabled={isOutOfStock || shopClosed}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {shopClosed ? "Not Available" : "Add to Cart"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
