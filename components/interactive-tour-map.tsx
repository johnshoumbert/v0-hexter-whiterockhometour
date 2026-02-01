"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Script from "next/script"

interface Home {
  id: string
  name: string
  address: string
  sponsor?: string
  short_description?: string
  display_order: number
  directions_url?: string
  city?: string
  state?: string
  zip_code?: string
  latitude?: number | null
  longitude?: number | null
  image_url?: string | null
}

declare global {
  interface Window {
    google: any
    grecaptcha: any
  }
}

export default function InteractiveTourMap() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("")
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const enableRecaptcha = process.env.NEXT_PUBLIC_ENABLE_TOUR_MAP_RECAPTCHA === "true"

  useEffect(() => {
    console.log("[v0] Google Maps API Key present:", !!apiKey)
    console.log("[v0] reCAPTCHA enabled:", enableRecaptcha)
  }, [])

  // Build Google Maps directions URL
  const buildGoogleMapsUrl = useCallback((homesList: Home[]) => {
    const homesWithAddresses = homesList.filter((h) => h.address)
    if (homesWithAddresses.length === 0) return ""

    const addresses = homesWithAddresses.map((h) => {
      const parts = [h.address]
      if (h.city) parts.push(h.city)
      if (h.state) parts.push(h.state)
      if (h.zip_code) parts.push(h.zip_code)
      return encodeURIComponent(parts.join(", "))
    })

    return `https://www.google.com/maps/dir/${addresses.join("/")}`
  }, [])

  // Geocode homes
  const geocodeHomes = useCallback(
    async (homesList: Home[]) => {
      const homesNeedingGeocode = homesList.filter(
        (h) => h.address && (!h.latitude || !h.longitude)
      )

      if (homesNeedingGeocode.length === 0) {
        return homesList
      }

      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homes: homesNeedingGeocode.map((h) => ({
              id: h.id,
              address: [h.address, h.city, h.state, h.zip_code]
                .filter(Boolean)
                .join(", "),
            })),
          }),
        })

        if (response.ok) {
          const geocodedData = await response.json()

          // Merge geocoded data back into homes
          const updatedHomes = homesList.map((home) => {
            const geocoded = geocodedData.results?.find(
              (g: any) => g.id === home.id
            )
            if (geocoded) {
              return { ...home, ...geocoded }
            }
            return home
          })

          return updatedHomes
        }
      } catch (error) {
        console.error("[v0] Error geocoding homes:", error)
      }

      return homesList
    },
    []
  )

  // Initialize map
  const initializeMap = useCallback(
    (homesList: Home[]) => {
      console.log("[v0] initializeMap called with", homesList.length, "homes")
      console.log("[v0] mapRef.current:", !!mapRef.current)
      console.log("[v0] window.google?.maps:", !!window.google?.maps)
      console.log("[v0] isGoogleMapsLoaded:", isGoogleMapsLoaded)
      
      if (!mapRef.current || !window.google?.maps || !isGoogleMapsLoaded) {
        console.log("[v0] Map initialization failed - missing requirements")
        return
      }

      const homesWithCoords = homesList.filter(
        (h) => h.latitude && h.longitude
      )
      console.log("[v0] Homes with coordinates:", homesWithCoords.length)
      console.log("[v0] Home coordinates:", homesWithCoords.map(h => ({ id: h.id, lat: h.latitude, lng: h.longitude, types: typeof h.latitude, typeof: typeof h.longitude })))

      if (homesWithCoords.length === 0) {
        console.log("[v0] No homes with coordinates to display")
        return
      }

      // Calculate bounds
      const bounds = new window.google.maps.LatLngBounds()
      homesWithCoords.forEach((home) => {
        // Convert to numbers in case they're strings
        const lat = typeof home.latitude === 'string' ? parseFloat(home.latitude) : home.latitude!
        const lng = typeof home.longitude === 'string' ? parseFloat(home.longitude) : home.longitude!
        bounds.extend(
          new window.google.maps.LatLng(lat, lng)
        )
      })
      console.log("[v0] Map bounds calculated:", bounds.getCenter().toString())

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: bounds.getCenter(),
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })
      console.log("[v0] Map instance created")

      mapInstanceRef.current = map
      map.fitBounds(bounds)
      console.log("[v0] Map bounds fitted")

      // Add markers
      console.log("[v0] Adding", homesWithCoords.length, "markers")
      homesWithCoords.forEach((home, index) => {
        // Convert to numbers in case they're strings
        const lat = typeof home.latitude === 'string' ? parseFloat(home.latitude) : home.latitude!
        const lng = typeof home.longitude === 'string' ? parseFloat(home.longitude) : home.longitude!
        
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          title: home.name || home.address,
          label: {
            text: String.fromCharCode(65 + index),
            color: "white",
            fontWeight: "bold",
          },
          animation: window.google.maps.Animation.DROP,
        })
        console.log("[v0] Marker added:", String.fromCharCode(65 + index), lat, lng)

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 250px;">
              ${
                home.image_url
                  ? `<img src="${home.image_url}" alt="${home.name || home.address}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />`
                  : ""
              }
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${home.name || home.address}</h3>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${home.address}</p>
              ${home.short_description ? `<p style="margin: 0; font-size: 13px; color: #888;">${home.short_description}</p>` : ""}
              <a href="/homes/${home.id}" style="display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-size: 14px;">View Details →</a>
            </div>
          `,
        })

        marker.addListener("click", () => {
          infoWindow.open(map, marker)
        })
      })
      console.log("[v0] All markers added successfully")
    },
    [isGoogleMapsLoaded]
  )

  // Fetch homes
  useEffect(() => {
    const fetchHomes = async () => {
      if (!event?.id) {
        console.log("[v0] No event ID available")
        return
      }

      try {
        console.log("[v0] Fetching homes for event:", event.id)
        setLoading(true)
        const response = await fetch(`/api/events/${event.id}/homes`)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Fetched homes data:", data)
          const sortedHomes = (Array.isArray(data) ? data : []).sort(
            (a: Home, b: Home) => a.display_order - b.display_order
          )
          console.log("[v0] Sorted homes:", sortedHomes.length, "homes")
          
          // Geocode homes
          const geocodedHomes = await geocodeHomes(sortedHomes)
          console.log("[v0] Geocoded homes:", geocodedHomes)
          console.log("[v0] Homes with lat/lng:", geocodedHomes.filter(h => h.latitude && h.longitude).length)
          setHomes(geocodedHomes)
          setGoogleMapsUrl(buildGoogleMapsUrl(geocodedHomes))

          // Initialize map if Google Maps is already loaded
          if (isGoogleMapsLoaded) {
            console.log("[v0] Google Maps already loaded, initializing map")
            initializeMap(geocodedHomes)
          } else {
            console.log("[v0] Google Maps not loaded yet")
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching homes:", error)
        toast({
          title: "Error",
          description: "Failed to load tour homes",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHomes()
  }, [event?.id, toast, buildGoogleMapsUrl, geocodeHomes, isGoogleMapsLoaded, initializeMap])

  // Initialize map when both Google Maps and homes are ready
  useEffect(() => {
    if (isGoogleMapsLoaded && homes.length > 0) {
      initializeMap(homes)
    }
  }, [isGoogleMapsLoaded, homes, initializeMap])

  const openInGoogleMaps = useCallback(() => {
    if (googleMapsUrl) {
      window.open(googleMapsUrl, "_blank")
    }
  }, [googleMapsUrl])

  const getShortAddress = (home: Home) => {
    return home.address.split(",")[0].trim()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
        onLoad={() => {
          console.log("[v0] Google Maps script loaded")
          setIsGoogleMapsLoaded(true)
        }}
        onError={(e) => {
          console.error("[v0] Google Maps script failed to load:", e)
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-muted/30 border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Tour Map</h1>
            <p className="text-muted-foreground">
              Navigate the {event?.name || "home tour"} with our interactive map
              showing all {homes.length} homes in order
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Responsive Grid: flex-col on mobile, side-by-side on desktop */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Tour Stops Sidebar - Left */}
            <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
              <div className="space-y-0">
                {homes.map((home, index) => (
                  <Link
                    key={home.id}
                    href={`/homes/${home.id}`}
                    className="block group"
                  >
                    <div className="flex items-start gap-4 py-4 hover:bg-muted/50 rounded-lg px-3 transition-colors">
                      {/* Marker with connecting line */}
                      <div className="relative flex flex-col items-center pt-1 flex-shrink-0">
                        {/* Connecting line (top) */}
                        {index > 0 && (
                          <div
                            className="absolute -top-4 w-0.5 h-4 bg-primary/30"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 3px, transparent 3px, transparent 6px)",
                            }}
                          />
                        )}

                        {/* Marker */}
                        <div className="relative z-10 w-10 h-10 rounded-full bg-background border-3 border-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>

                        {/* Connecting line (bottom) */}
                        {index < homes.length - 1 && (
                          <div
                            className="absolute -bottom-4 w-0.5 h-4 bg-primary/30"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 3px, transparent 3px, transparent 6px)",
                            }}
                          />
                        )}
                      </div>

                      {/* Address */}
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="font-semibold uppercase tracking-wide text-sm group-hover:text-primary transition-colors leading-tight">
                          {home.address ? getShortAddress(home) : home.name}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Open in Google Maps Button */}
              {googleMapsUrl && (
                <Button onClick={openInGoogleMaps} className="w-full" size="lg">
                  <Navigation className="mr-2 h-4 w-4" />
                  Open in Google Maps
                </Button>
              )}
            </div>

            {/* Map - Right */}
            <div className="flex-1 min-w-0">
              <Card className="h-full">
                <CardContent className="p-0">
                  {!isGoogleMapsLoaded ? (
                    <div className="h-96 lg:h-[600px] flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading map...</p>
                      </div>
                    </div>
                  ) : homes.filter((h) => h.latitude && h.longitude).length ===
                    0 ? (
                    <div className="h-96 lg:h-[600px] flex flex-col items-center justify-center gap-4 bg-muted rounded-lg">
                      <AlertCircle className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No homes with location data available
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div
                        ref={mapRef}
                        className="h-96 lg:h-[600px] w-full rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground text-center mt-4 px-4 pb-4">
                        Click on markers to view home details
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
