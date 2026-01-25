"use client"

import { useEffect, useState, useCallback } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation, MapPin, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Home {
  id: string
  name: string
  address: string
  sponsor?: string
  short_description?: string
  display_order: number
  directions_url?: string
}

export default function TourMapPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setIsScriptLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setIsScriptLoaded(true)
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load Google Maps",
        variant: "destructive",
      })
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [toast])

  // Fetch homes
  useEffect(() => {
    const fetchHomes = async () => {
      if (!event?.id) return

      try {
        setLoading(true)
        const response = await fetch(`/api/events/${event.id}/homes`)
        if (response.ok) {
          const data = await response.json()
          const sortedHomes = (data.homes || []).sort(
            (a: Home, b: Home) => a.display_order - b.display_order
          )
          setHomes(sortedHomes)
        }
      } catch (error) {
        console.error("Error fetching homes:", error)
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
  }, [event?.id, toast])

  // Initialize map
  useEffect(() => {
    if (!isScriptLoaded || !homes.length || map) return

    const mapElement = document.getElementById("tour-map")
    if (!mapElement) return

    // Default to Dallas, TX
    const defaultCenter = { lat: 32.8413, lng: -96.7781 }
    
    const newMap = new google.maps.Map(mapElement, {
      zoom: 12,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    })

    const newDirectionsRenderer = new google.maps.DirectionsRenderer({
      map: newMap,
      suppressMarkers: true, // We'll add custom markers
    })

    setMap(newMap)
    setDirectionsRenderer(newDirectionsRenderer)
  }, [isScriptLoaded, homes, map])

  // Add markers and route
  useEffect(() => {
    if (!map || !homes.length || !isScriptLoaded) return

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null))

    const newMarkers: google.maps.Marker[] = []
    const geocoder = new google.maps.Geocoder()
    const bounds = new google.maps.LatLngBounds()

    homes.forEach((home, index) => {
      if (!home.address) return

      geocoder.geocode({ address: home.address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const position = results[0].geometry.location

          const marker = new google.maps.Marker({
            position,
            map,
            label: {
              text: String.fromCharCode(65 + index), // A, B, C, etc.
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
            },
            title: home.name,
          })

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${home.name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 14px;">${home.address}</p>
                ${home.sponsor ? `<p style="margin: 0; font-size: 12px; color: #666;">Sponsored by ${home.sponsor}</p>` : ""}
              </div>
            `,
          })

          marker.addListener("click", () => {
            infoWindow.open(map, marker)
          })

          newMarkers.push(marker)
          bounds.extend(position)

          // Fit map to show all markers after last one is added
          if (newMarkers.length === homes.filter((h) => h.address).length) {
            map.fitBounds(bounds)
          }
        }
      })
    })

    setMarkers(newMarkers)

    // Draw route if we have at least 2 homes with addresses
    const homesWithAddresses = homes.filter((h) => h.address)
    if (homesWithAddresses.length >= 2 && directionsRenderer) {
      const directionsService = new google.maps.DirectionsService()

      const origin = homesWithAddresses[0].address
      const destination = homesWithAddresses[homesWithAddresses.length - 1].address
      const waypoints = homesWithAddresses.slice(1, -1).map((home) => ({
        location: home.address,
        stopover: true,
      }))

      directionsService.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false, // Keep the display_order
        },
        (result, status) => {
          if (status === "OK" && result) {
            directionsRenderer.setDirections(result)
          }
        }
      )
    }
  }, [map, homes, isScriptLoaded, directionsRenderer])

  const openInGoogleMaps = useCallback(() => {
    const homesWithAddresses = homes.filter((h) => h.address)
    if (homesWithAddresses.length === 0) return

    const addresses = homesWithAddresses.map((h) => encodeURIComponent(h.address)).join("/")
    const url = `https://www.google.com/maps/dir/${addresses}`
    window.open(url, "_blank")
  }, [homes])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Tour Map</h1>
          <p className="text-muted-foreground">
            Navigate the {event?.name || "home tour"} with our interactive map showing all {homes.length} homes in order
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                {!isScriptLoaded ? (
                  <div className="h-[600px] flex items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : homes.filter((h) => h.address).length === 0 ? (
                  <div className="h-[600px] flex flex-col items-center justify-center bg-muted gap-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No homes with addresses available</p>
                  </div>
                ) : (
                  <div id="tour-map" className="h-[600px] w-full rounded-lg" />
                )}
              </CardContent>
            </Card>

            {homes.filter((h) => h.address).length > 0 && (
              <div className="mt-4 flex gap-4">
                <Button onClick={openInGoogleMaps} className="flex-1" size="lg">
                  <Navigation className="mr-2 h-5 w-5" />
                  Open in Google Maps
                </Button>
              </div>
            )}
          </div>

          {/* Home List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Tour Stops</h2>
            <div className="space-y-3">
              {homes.map((home, index) => (
                <Card key={home.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate">{home.name}</h3>
                        {home.address && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{home.address}</span>
                          </p>
                        )}
                        {home.sponsor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sponsored by {home.sponsor}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
