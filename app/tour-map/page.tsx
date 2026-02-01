"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import the interactive map to avoid SSR issues with Google Maps
const InteractiveTourMap = dynamic(
  () => import("@/components/interactive-tour-map"),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
)

export default function TourMapPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InteractiveTourMap />
    </Suspense>
  )
}
