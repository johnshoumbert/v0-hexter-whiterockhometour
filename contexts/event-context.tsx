"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useEventStore } from "@/stores/event-store"
import { requestCache } from "@/lib/request-cache"
import { normalizeDomain } from "@/lib/normalize-domain"

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
  enable_sponsor: boolean // Added enable_sponsor flag
  theme?: EventTheme
  tickets?: TicketType[] // Added tickets array to Event interface
  shop_title?: string // Added shop_title field
  shop_description?: string // Added shop_description field
}

interface EventContextType {
  event: Event | null
  isLoading: boolean
  isError: boolean
  isMainDomain: boolean
  refetchEvent: () => Promise<void>
  switchEvent: (eventId: string) => Promise<void>
  invalidateCache: () => void
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  const {
    event,
    isLoading,
    isError,
    cachedDomain,
    setEvent,
    setCachedDomain,
    setLastFetchTime,
    setIsLoading,
    setIsError,
    invalidateCache,
    isCacheValid,
  } = useEventStore()

  const [isFetching, setIsFetching] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const isBrowser = typeof window !== "undefined"

  const fetchEventByDomain = async (force = false) => {
    if (!isMounted || !isBrowser) {
      return
    }

    if (!force && isFetching) {
      return
    }

    try {
      const host = window.location.host
      const normalizedHost = normalizeDomain(host)
      const isMain = normalizedHost === "myschoolauction.com"

      if (isMain) {
        console.log("[v0] Main domain detected, clearing event state")
        setEvent(null)
        setCachedDomain(null)
        setIsLoading(false)
        return
      }

      if (!force && isCacheValid(host)) {
        console.log("[v0] Cache valid for host, checking cached event")
        if (isBrowser) {
          const cached = localStorage.getItem("cached_event")
          if (cached) {
            try {
              const cachedEvent = JSON.parse(cached)
              const cachedEventDomain = normalizeDomain(cachedEvent.domain || "")
              const currentDomain = normalizeDomain(host)

              if (cachedEventDomain === currentDomain) {
                console.log("[v0] Using cached event data for matching domain")
                setEvent(cachedEvent)
                setCachedDomain(host)
                setIsLoading(false)
                return
              } else {
                console.log("[v0] Cached event domain mismatch, clearing cache", {
                  cached: cachedEventDomain,
                  current: currentDomain,
                })
                localStorage.removeItem("cached_event")
                localStorage.removeItem("current_event_id")
                invalidateCache()
              }
            } catch (e) {
              console.error("[v0] Failed to parse cached event:", e)
              localStorage.removeItem("cached_event")
              localStorage.removeItem("current_event_id")
            }
          }
        }
      }

      console.log("[v0] Fetching event by domain:", host)
      setIsFetching(true)
      setIsLoading(true)
      setIsError(false)

      const cacheKey = `event-by-domain-${host}`

      const data = await requestCache.fetch(
        cacheKey,
        async () => {
          const response = await fetch(`/api/events/by-domain?host=${encodeURIComponent(host)}`)

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("Event not found")
            } else {
              throw new Error("Failed to fetch event")
            }
          }

          return response.json()
        },
        30000, // Cache for 30 seconds
      )

      console.log("[v0] Event fetched successfully:", data.event?.event_name)
      console.log("[v0] Event tickets from API:", data.event?.tickets)
      console.log("[v0] Number of tickets:", data.event?.tickets?.length || 0)
      console.log("[v0] Shop title from API:", data.event?.shop_title)
      console.log("[v0] Shop description from API:", data.event?.shop_description)
      setEvent(data.event)
      setCachedDomain(host)
      setLastFetchTime(Date.now())

      localStorage.setItem("cached_event", JSON.stringify(data.event))
      localStorage.setItem("current_event_id", data.event.id)
    } catch (error) {
      console.error("[v0] Failed to fetch event:", error)
      setIsError(true)
      setEvent(null)

      if (isBrowser) {
        localStorage.removeItem("cached_event")
        localStorage.removeItem("current_event_id")
      }
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  const switchEvent = async (eventId: string) => {
    if (!isMounted || !isBrowser) {
      return
    }

    try {
      const cacheKey = `event-${eventId}`

      const data = await requestCache.fetch(
        cacheKey,
        async () => {
          const response = await fetch(`/api/events/${eventId}`)
          if (!response.ok) {
            throw new Error("Failed to fetch event")
          }
          return response.json()
        },
        30000, // Cache for 30 seconds
      )

      setEvent(data.event)
      invalidateCache()

      localStorage.setItem("cached_event", JSON.stringify(data.event))
      localStorage.setItem("current_event_id", data.event.id)
    } catch (error) {
      console.error("[v0] Failed to switch event:", error)
    }
  }

  useEffect(() => {
    setIsMounted(true)

    if (isBrowser) {
      const cached = localStorage.getItem("cached_event")
      if (cached) {
        try {
          const cachedEvent = JSON.parse(cached)
          const host = window.location.host
          const cachedEventDomain = normalizeDomain(cachedEvent.domain || "")
          const currentDomain = normalizeDomain(host)

          if (cachedEventDomain !== currentDomain) {
            console.log("[v0] Clearing stale cached event on mount")
            localStorage.removeItem("cached_event")
            localStorage.removeItem("current_event_id")
          }
        } catch (e) {
          console.error("[v0] Failed to validate cached event:", e)
          localStorage.removeItem("cached_event")
          localStorage.removeItem("current_event_id")
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!isMounted) {
      return
    }

    let mounted = true

    const initializeEvent = async () => {
      if (mounted) {
        await fetchEventByDomain()
      }
    }

    initializeEvent()

    return () => {
      mounted = false
    }
  }, [isMounted])

  const isMainDomain =
    isMounted && isBrowser
      ? (() => {
          const host = window.location.host.split(":")[0].toLowerCase()
          return host === "myschoolauction.com" || host === "www.myschoolauction.com"
        })()
      : false

  return (
    <EventContext.Provider
      value={{
        event,
        isLoading,
        isError,
        isMainDomain,
        refetchEvent: () => fetchEventByDomain(true),
        switchEvent,
        invalidateCache,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error("useEvent must be used within an EventProvider")
  }
  return context
}
