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
    onRecaptchaLoad: () => void
  }
}

export default function InteractiveTourMap() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("")
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false)
  const [isRecaptchaLoaded, setIsRecaptchaLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const recaptchaRef = useRef<string | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

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

  // Geocode homes that don't have coordinates
  const geocodeHomes = useCallback(
    async (homesList: Home[]) => {
      if (!isRecaptchaVerified || !recaptchaRef.current) {
        console.log("[v0] Recaptcha not verified, skipping geocoding")
        return homesList
      }

      const homesNeedingGeocode = homesList.filter(
        (h) => h.address && (!h.latitude || !h.longitude)
      )

      if (homesNeedingGeocode.length === 0) {
        console.log("[v0] All homes have coordinates")
        return homesList
      }

      console.log(
        "[v0] Geocoding",
        homesNeedingGeocode.length,
        "homes with reCAPTCHA token"
      )

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
            recaptchaToken: recaptchaRef.current,
          }),
        })

        if (response.ok) {
          const geocodedData = await response.json()
          console.log("[v0] Geocoded homes:", geocodedData)

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
        } else {
          console.error("[v0] Geocoding failed:", await response.text())
          // Reset recaptcha on failure
          if (window.grecaptcha && recaptchaSiteKey) {
            window.grecaptcha.reset()
            setIsRecaptchaVerified(false)
            recaptchaRef.current = null
          }
        }
      } catch (error) {
        console.error("[v0] Error geocoding homes:", error)
      }

      return homesList
    },
    [isRecaptchaVerified, recaptchaSiteKey]
  )

  // Initialize map
  const initializeMap = useCallback(
    (homesList: Home[]) => {
      if (!mapRef.current || !window.google?.maps || !isGoogleMapsLoaded) {
        console.log("[v0] Cannot initialize map - prerequisites not met")
        return
      }

      const homesWithCoords = homesList.filter(
        (h) => h.latitude && h.longitude
      )

      if (homesWithCoords.length === 0) {
        console.log("[v0] No homes with coordinates for map")
        return
      }

      console.log("[v0] Initializing map with", homesWithCoords.length, "homes")

      // Calculate bounds
      const bounds = new window.google.maps.LatLngBounds()
      homesWithCoords.forEach((home) => {
        bounds.extend(
          new window.google.maps.LatLng(home.latitude!, home.longitude!)
        )
      })

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: bounds.getCenter(),
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map
      map.fitBounds(bounds)

      // Add markers
      homesWithCoords.forEach((home, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: home.latitude!, lng: home.longitude! },
          map,
          title: home.name || home.address,
          label: {
            text: String.fromCharCode(65 + index), // A, B, C...
            color: "white",
            fontWeight: "bold",
          },
          animation: window.google.maps.Animation.DROP,
        })

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
    },
    [isGoogleMapsLoaded]
  )

  // Fetch homes
  useEffect(() => {
    const fetchHomes = async () => {
      if (!event?.id) {
        console.log("[v0] No event ID, skipping homes fetch")
        return
      }

      try {
        console.log("[v0] Fetching homes for event:", event.id)
        setLoading(true)
        const response = await fetch(`/api/events/${event.id}/homes`)

        if (response.ok) {
          const data = await response.json()
          const sortedHomes = (Array.isArray(data) ? data : []).sort(
            (a: Home, b: Home) => a.display_order - b.display_order
          )
          console.log("[v0] Fetched homes:", sortedHomes.length)
          setHomes(sortedHomes)
          setGoogleMapsUrl(buildGoogleMapsUrl(sortedHomes))

          // If recaptcha is verified, geocode immediately
          if (isRecaptchaVerified) {
            const geocodedHomes = await geocodeHomes(sortedHomes)
            setHomes(geocodedHomes)
            if (isGoogleMapsLoaded) {
              initializeMap(geocodedHomes)
            }
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
  }, [event?.id, toast, buildGoogleMapsUrl, isRecaptchaVerified])

  // Handle recaptcha callback
  const handleRecaptchaVerify = useCallback(
    async (token: string) => {
      console.log("[v0] reCAPTCHA verified, token received")
      recaptchaRef.current = token
      setIsRecaptchaVerified(true)

      // Geocode homes if already loaded
      if (homes.length > 0) {
        const geocodedHomes = await geocodeHomes(homes)
        setHomes(geocodedHomes)
        if (isGoogleMapsLoaded) {
          initializeMap(geocodedHomes)
        }
      }
    },
    [homes, geocodeHomes, isGoogleMapsLoaded, initializeMap]
  )

  // Setup recaptcha when loaded
  useEffect(() => {
    if (isRecaptchaLoaded && recaptchaSiteKey && window.grecaptcha) {
      console.log("[v0] Rendering reCAPTCHA")
      window.grecaptcha.render("recaptcha-container", {
        sitekey: recaptchaSiteKey,
        callback: handleRecaptchaVerify,
      })
    }
  }, [isRecaptchaLoaded, recaptchaSiteKey, handleRecaptchaVerify])

  // Initialize map when both Google Maps and homes are ready
  useEffect(() => {
    if (isGoogleMapsLoaded && homes.length > 0 && isRecaptchaVerified) {
      console.log("[v0] Initializing map with loaded homes")
      initializeMap(homes)
    }
  }, [isGoogleMapsLoaded, homes, isRecaptchaVerified, initializeMap])

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
          console.log("[v0] Google Maps API loaded")
          setIsGoogleMapsLoaded(true)
        }}
      />
      <Script
        src={`https://www.google.com/recaptcha/api.js`}
        onLoad={() => {
          console.log("[v0] reCAPTCHA loaded")
          setIsRecaptchaLoaded(true)
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
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            {/* Tour Stops Sidebar */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="space-y-2">
                {homes.map((home, index) => (
                  <Link
                    key={home.id}
                    href={`/homes/${home.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors">
                      <div className="relative flex flex-col items-center">
                        {index > 0 && (
                          <div
                            className="absolute -top-3 w-0.5 h-3 bg-primary/30"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)",
                            }}
                          />
                        )}

                        <div className="relative z-10 w-10 h-10 rounded-full bg-background border-4 border-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>

                        {index < homes.length - 1 && (
                          <div
                            className="absolute -bottom-3 w-0.5 h-3 bg-primary/30"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)",
                            }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold uppercase tracking-wide group-hover:text-primary transition-colors">
                          {home.address ? getShortAddress(home) : home.name}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {googleMapsUrl && (
                <Button onClick={openInGoogleMaps} className="w-full" size="lg">
                  <Navigation className="mr-2 h-5 w-5" />
                  Open in Google Maps
                </Button>
              )}
            </div>

            {/* Map */}
            <div className="order-1 lg:order-2">
              <Card>
                <CardContent className="p-6">
                  {!isRecaptchaVerified ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-6">
                      <AlertCircle className="h-12 w-12 text-muted-foreground" />
                      <p className="text-center text-muted-foreground mb-4">
                        Please verify you're not a robot to view the interactive
                        map
                      </p>
                      <div id="recaptcha-container"></div>
                    </div>
                  ) : !isGoogleMapsLoaded ? (
                    <div className="h-[600px] lg:h-[800px] flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading map...</p>
                      </div>
                    </div>
                  ) : homes.filter((h) => h.latitude && h.longitude).length ===
                    0 ? (
                    <div className="h-[600px] lg:h-[800px] flex flex-col items-center justify-center gap-4">
                      <AlertCircle className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No homes with location data available
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div
                        ref={mapRef}
                        className="h-[600px] lg:h-[800px] w-full rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground text-center mt-4">
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
