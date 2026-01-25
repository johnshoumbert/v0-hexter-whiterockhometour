import { create } from "zustand"

interface EventTheme {
  primary_color?: string
  secondary_color?: string
  logo_url?: string
}

interface TicketType {
  id: string
  name: string
  description: string | null
  price: number
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
}

interface Event {
  id: string
  event_name: string
  start_date: string
  end_date: string
  go_live_date: string
  domain: string
  show_qr_codes: boolean
  allow_likes: boolean
  max_bidding: boolean
  auto_bids: boolean
  hero_image_url: string | null
  enable_gallery: boolean
  enable_voting: boolean
  enable_donation: boolean
  enable_shop: boolean
  enable_sponsor: boolean
  theme?: EventTheme
  tickets?: TicketType[] // Added tickets array to Event interface
}

interface EventStore {
  event: Event | null
  cachedDomain: string | null
  lastFetchTime: number | null
  isLoading: boolean
  isError: boolean

  setEvent: (event: Event | null) => void
  setCachedDomain: (domain: string | null) => void
  setLastFetchTime: (time: number | null) => void
  setIsLoading: (loading: boolean) => void
  setIsError: (error: boolean) => void

  // Invalidate cache (called when admin makes changes)
  invalidateCache: () => void

  // Check if cache is valid
  isCacheValid: (currentDomain: string) => boolean
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useEventStore = create<EventStore>((set, get) => ({
  event: null,
  cachedDomain: null,
  lastFetchTime: null,
  isLoading: false,
  isError: false,

  setEvent: (event) => set({ event }),
  setCachedDomain: (domain) => set({ cachedDomain: domain }),
  setLastFetchTime: (time) => set({ lastFetchTime: time }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsError: (error) => set({ isError: error }),

  invalidateCache: () => {
    set({ lastFetchTime: null })
  },

  isCacheValid: (currentDomain: string) => {
    const state = get()

    // Cache is invalid if domain changed
    if (state.cachedDomain !== currentDomain) {
      return false
    }

    // Cache is invalid if no fetch time
    if (!state.lastFetchTime) {
      return false
    }

    if (!state.event) {
      return false
    }

    // Cache is invalid if older than CACHE_DURATION
    const now = Date.now()
    if (now - state.lastFetchTime > CACHE_DURATION) {
      return false
    }

    // Cache is valid
    return true
  },
}))

export const invalidateEventCache = () => {
  useEventStore.getState().invalidateCache()
}
