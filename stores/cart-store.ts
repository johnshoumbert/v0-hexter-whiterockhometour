import { create } from "zustand"
import { persist } from "zustand/middleware"

// Helper function to track cart additions
async function trackCartAddition(
  itemType: string,
  itemId: string,
  itemName: string,
  quantity: number,
  unitPrice: number
) {
  try {
    // Get event ID from the current URL or context
    const pathMatch = window.location.pathname.match(/\/events\/([^\/]+)/)
    const eventId = pathMatch ? pathMatch[1] : null
    
    if (!eventId) {
      console.warn("[v0] Cannot track cart: no event ID found in URL")
      return
    }

    const response = await fetch(`/api/events/${eventId}/cart/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_type: itemType,
        item_id: itemId,
        item_name: itemName,
        quantity,
        unit_price: unitPrice,
      }),
    })

    if (!response.ok) {
      console.error("[v0] Failed to track cart addition:", await response.text())
    } else {
      console.log("[v0] Cart addition tracked successfully")
    }
  } catch (error) {
    console.error("[v0] Error tracking cart addition:", error)
  }
}

export interface ShopItem {
  id: string
  title: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  quantity_type: "unlimited" | "limited" | "preorder"
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
  featured: boolean
  options?: ProductOption[]
}

export interface ProductOption {
  id: string
  name: string
  type: "dropdown" | "radio" | "checkbox"
  required: boolean
  values: ProductOptionValue[]
}

export interface ProductOptionValue {
  id: string
  label: string
  priceModifier?: number
  quantity?: number
}

export interface TicketItem {
  id: string
  name: string
  description: string | null
  price: number
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
  pricingTiers?: any[]
}

export interface CartItem {
  type: "shop" | "ticket"
  item: ShopItem | TicketItem
  quantity: number
  selectedOptions?: Record<string, string | string[]>
}

interface CartStore {
  cart: CartItem[]
  isCartOpen: boolean
  addToCart: (item: ShopItem, quantity: number, selectedOptions?: Record<string, string | string[]>) => void
  addTicketToCart: (ticket: TicketItem, quantity: number) => void
  removeFromCart: (itemId: string, optionsKey?: string) => void
  updateQuantity: (itemId: string, quantity: number, optionsKey?: string) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartCount: () => number
  setCartOpen: (open: boolean) => void
}

const generateOptionsKey = (selectedOptions?: Record<string, string | string[]>): string => {
  if (!selectedOptions) return ""
  return JSON.stringify(selectedOptions)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: [],
      isCartOpen: false,

      addToCart: (item, quantity, selectedOptions) => {
        const optionsKey = generateOptionsKey(selectedOptions)
        const existingItemIndex = get().cart.findIndex(
          (cartItem) =>
            cartItem.type === "shop" &&
            cartItem.item.id === item.id &&
            generateOptionsKey(cartItem.selectedOptions) === optionsKey,
        )

        if (existingItemIndex >= 0) {
          set((state) => ({
            cart: state.cart.map((cartItem, index) =>
              index === existingItemIndex ? { ...cartItem, quantity: cartItem.quantity + quantity } : cartItem,
            ),
          }))
        } else {
          set((state) => ({
            cart: [...state.cart, { type: "shop", item, quantity, selectedOptions }],
          }))
        }

        // Track cart addition for abandoned cart analytics
        trackCartAddition("shop", item.id, item.title, quantity, item.price).catch(console.error)
      },

      addTicketToCart: (ticket, quantity) => {
        // Calculate the active price considering pricing tiers
        let activePrice = Number(ticket.price)
        if (ticket.pricingTiers && ticket.pricingTiers.length > 0) {
          const activeTier = ticket.pricingTiers.find((tier: any) => tier.isActive)
          if (activeTier) {
            activePrice = Number(activeTier.price)
          }
        }

        // Create a new ticket object with the active price
        const ticketWithActivePrice = { ...ticket, price: activePrice }

        const existingItemIndex = get().cart.findIndex(
          (cartItem) => cartItem.type === "ticket" && cartItem.item.id === ticket.id,
        )

        if (existingItemIndex >= 0) {
          set((state) => ({
            cart: state.cart.map((cartItem, index) =>
              index === existingItemIndex ? { ...cartItem, quantity: cartItem.quantity + quantity } : cartItem,
            ),
          }))
        } else {
          set((state) => ({
            cart: [
              ...state.cart,
              { type: "ticket", item: ticketWithActivePrice, quantity, selectedOptions: undefined },
            ],
          }))
        }

        // Track cart addition for abandoned cart analytics
        trackCartAddition("ticket", ticket.id, ticket.name, quantity, activePrice).catch(console.error)
      },

      removeFromCart: (itemId, optionsKey) => {
        set((state) => ({
          cart: state.cart.filter(
            (cartItem) =>
              !(
                cartItem.item.id === itemId &&
                (!optionsKey || generateOptionsKey(cartItem.selectedOptions) === optionsKey)
              ),
          ),
        }))
      },

      updateQuantity: (itemId, quantity, optionsKey) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId, optionsKey)
          return
        }

        set((state) => ({
          cart: state.cart.map((cartItem) =>
            cartItem.item.id === itemId && (!optionsKey || generateOptionsKey(cartItem.selectedOptions) === optionsKey)
              ? { ...cartItem, quantity }
              : cartItem,
          ),
        }))
      },

      clearCart: () => set({ cart: [] }),

      getCartTotal: () => {
        return get().cart.reduce((total, cartItem) => {
          let itemPrice = Number(cartItem.item.price)

          if (
            cartItem.type === "shop" &&
            cartItem.selectedOptions &&
            "options" in cartItem.item &&
            cartItem.item.options
          ) {
            Object.entries(cartItem.selectedOptions).forEach(([optionId, value]) => {
              const option = cartItem.item.options?.find((o: any) => o.id === optionId)
              if (option) {
                const values = Array.isArray(value) ? value : [value]
                values.forEach((v) => {
                  const optionValue = option.values.find((ov: any) => ov.id === v)
                  if (optionValue?.priceModifier) {
                    itemPrice += optionValue.priceModifier
                  }
                })
              }
            })
          }

          return total + itemPrice * cartItem.quantity
        }, 0)
      },

      getCartCount: () => {
        return get().cart.reduce((count, cartItem) => count + cartItem.quantity, 0)
      },

      setCartOpen: (open) => set({ isCartOpen: open }),
    }),
    {
      name: "cart-storage",
    },
  ),
)
