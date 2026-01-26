"use client"

import { useEffect, useState, useCallback } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation, MapPin, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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
}

export default function TourMapPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("")

  // Build Google Maps directions URL
  const buildGoogleMapsUrl = useCallback((homesList: Home[]) => {
    const homesWithAddresses = homesList.filter((h) => h.address)
    if (homesWithAddresses.length === 0) return ""

    const addresses = homesWithAddresses.map((h) => {
      // Build full address string
      const parts = [h.address]
      if (h.city) parts.push(h.city)
      if (h.state) parts.push(h.state)
      if (h.zip_code) parts.push(h.zip_code)
      return encodeURIComponent(parts.join(", "))
    })

    return `https://www.google.com/maps/dir/${addresses.join("/")}`
  }, [])

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
        console.log("[v0] Homes API response status:", response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Homes API response data:", data)
          console.log("[v0] Number of homes received:", Array.isArray(data) ? data.length : 0)
          
          // The API returns the homes array directly, not wrapped in an object
          const sortedHomes = (Array.isArray(data) ? data : []).sort(
            (a: Home, b: Home) => a.display_order - b.display_order
          )
          console.log("[v0] Sorted homes:", sortedHomes)
          setHomes(sortedHomes)
          setGoogleMapsUrl(buildGoogleMapsUrl(sortedHomes))
        } else {
          console.log("[v0] Homes API error:", await response.text())
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
  }, [event?.id, toast, buildGoogleMapsUrl])



  const openInGoogleMaps = useCallback(() => {
    if (googleMapsUrl) {
      window.open(googleMapsUrl, "_blank")
    }
  }, [googleMapsUrl])

  const getShortAddress = (home: Home) => {
    // Extract just the street address without city/state/zip
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
                    {/* Marker with connecting line */}
                    <div className="relative flex flex-col items-center">
                      {/* Connecting line (top) */}
                      {index > 0 && (
                        <div className="absolute -top-3 w-0.5 h-3 bg-primary/30" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)' }} />
                      )}
                      
                      {/* Marker */}
                      <div className="relative z-10 w-10 h-10 rounded-full bg-background border-4 border-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-primary">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>

                      {/* Connecting line (bottom) */}
                      {index < homes.length - 1 && (
                        <div className="absolute -bottom-3 w-0.5 h-3 bg-primary/30" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)' }} />
                      )}
                    </div>

                    {/* Address */}
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold uppercase tracking-wide group-hover:text-primary transition-colors">
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
                <Navigation className="mr-2 h-5 w-5" />
                Open in Google Maps
              </Button>
            )}
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="h-[600px] lg:h-[800px] flex items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : homes.filter((h) => h.address).length === 0 ? (
                  <div className="h-[600px] lg:h-[800px] flex flex-col items-center justify-center bg-muted gap-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No homes with addresses available</p>
                  </div>
                ) : googleMapsUrl ? (
                  <iframe
                    src={googleMapsUrl}
                    className="h-[600px] lg:h-[800px] w-full rounded-lg"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="h-[600px] lg:h-[800px] flex flex-col items-center justify-center bg-muted gap-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Unable to generate map</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
