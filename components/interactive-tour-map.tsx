"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Home {
  id: string
  address: string
  latitude: number | null
  longitude: number | null
  name: string
  description: string | null
  image_url: string | null
}

interface InteractiveTourMapProps {
  homes: Home[]
  apiKey: string
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export function InteractiveTourMap({ homes, apiKey }: InteractiveTourMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key not configured")
      return
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setIsLoaded(true)
      initializeMap()
      return
    }

    // Load Google Maps script
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoaded(true)
      initializeMap()
    }
    script.onerror = () => {
      setError("Failed to load Google Maps")
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [apiKey])

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return

    // Filter homes with valid coordinates
    const homesWithCoords = homes.filter(
      (home) => home.latitude !== null && home.longitude !== null
    )

    if (homesWithCoords.length === 0) {
      setError("No homes with location data available")
      return
    }

    // Calculate center and bounds
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

    // Fit bounds to show all markers
    map.fitBounds(bounds)

    // Add markers and info windows
    homesWithCoords.forEach((home, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: home.latitude!, lng: home.longitude! },
        map,
        title: home.name || home.address,
        label: {
          text: `${index + 1}`,
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
            ${home.description ? `<p style="margin: 0; font-size: 13px; color: #888;">${home.description}</p>` : ""}
            <a href="/homes/${home.id}" style="display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-size: 14px;">View Details →</a>
          </div>
        `,
      })

      marker.addListener("click", () => {
        infoWindow.open(map, marker)
      })
    })
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card className="p-8 flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-[600px] rounded-lg shadow-lg" />
      <div className="mt-4 text-sm text-muted-foreground text-center">
        Click on markers to view home details
      </div>
    </div>
  )
}
