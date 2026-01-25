"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Edit, MapPin, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface Home {
  id: string
  event_id: string
  name: string
  address: string | null
  sponsor: string | null
  short_description: string | null
  full_description: string | null
  item_images: string[]
  directions_url: string | null
  display_order: number
}

export default function TheHomesPage() {
  const { event } = useEvent()
  const { user, isEventAdmin } = useAuth()
  const { toast } = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndexes, setCurrentImageIndexes] = useState<{ [key: string]: number }>({})
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({})
  const [editingHome, setEditingHome] = useState<Home | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    if (event?.id) {
      fetchHomes()
    }
  }, [event?.id])

  // Auto-rotate carousel images every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndexes((prev) => {
        const updated = { ...prev }
        homes.forEach((home) => {
          if (home.item_images && home.item_images.length > 1) {
            const currentIndex = prev[home.id] || 0
            updated[home.id] = (currentIndex + 1) % home.item_images.length
          }
        })
        return updated
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [homes])

  const fetchHomes = async () => {
    try {
      const res = await fetch(`/api/events/${event?.id}/homes`)
      if (res.ok) {
        const data = await res.json()
        // Parse item_images if it's a JSON string
        const parsedHomes = data.map((home: any) => ({
          ...home,
          item_images: typeof home.item_images === 'string' 
            ? JSON.parse(home.item_images || '[]')
            : Array.isArray(home.item_images)
            ? home.item_images
            : []
        }))
        console.log('[v0] Parsed homes with images:', parsedHomes)
        setHomes(parsedHomes)
        // Initialize image indexes
        const indexes: { [key: string]: number } = {}
        parsedHomes.forEach((home: Home) => {
          indexes[home.id] = 0
        })
        setCurrentImageIndexes(indexes)
      }
    } catch (error) {
      console.error("[v0] Error fetching homes:", error)
    } finally {
      setLoading(false)
    }
  }

  const navigateCarousel = (homeId: string, direction: "prev" | "next") => {
    setCurrentImageIndexes((prev) => {
      const home = homes.find((h) => h.id === homeId)
      if (!home || !home.item_images || home.item_images.length === 0) return prev

      const currentIndex = prev[homeId] || 0
      const newIndex =
        direction === "next"
          ? (currentIndex + 1) % home.item_images.length
          : (currentIndex - 1 + home.item_images.length) % home.item_images.length

      return { ...prev, [homeId]: newIndex }
    })
  }

  const toggleDescription = (homeId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [homeId]: !prev[homeId],
    }))
  }

  const handleEditHome = (home: Home) => {
    setEditingHome(home)
    setIsEditDialogOpen(true)
  }

  const handleSaveHome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingHome) return

    const formData = new FormData(e.currentTarget)
    const images = formData.get("item_images") as string
    const imageArray = images.split("\n").filter((img) => img.trim())

    try {
      const res = await fetch(`/api/events/${event?.id}/homes/${editingHome.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          address: formData.get("address"),
          sponsor: formData.get("sponsor"),
          short_description: formData.get("short_description"),
          full_description: formData.get("full_description"),
          item_images: imageArray,
          directions_url: formData.get("directions_url"),
        }),
      })

      if (res.ok) {
        toast({ title: "Home updated successfully" })
        setIsEditDialogOpen(false)
        fetchHomes()
      } else {
        toast({ title: "Failed to update home", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error updating home", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading homes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image.png-kkrqBntcFJUXtRgBfIEWtOsbbkfNIF.jpeg"
          alt="The Homes"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center text-white space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-wider">THE HOMES</h1>
          <p className="text-lg md:text-xl italic font-light">
            Six magnificent midcentury and contemporary modern homes.
          </p>
        </div>
      </section>

      {/* Homes Section */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold uppercase mb-8">THE 2025 HOMES</h2>
          <Button
            variant="outline"
            size="lg"
            className="border-2 border-foreground hover:bg-foreground hover:text-background uppercase tracking-wider px-8"
          >
            CLICK FOR THE TOUR MAP
          </Button>
        </div>

        {/* Homes List */}
        <div className="space-y-24">
          {homes.map((home) => {
            const currentIndex = currentImageIndexes[home.id] || 0
            const hasImages = home.item_images && Array.isArray(home.item_images) && home.item_images.length > 0
            const currentImage = hasImages ? home.item_images[currentIndex] || home.item_images[0] : null
            const isExpanded = expandedDescriptions[home.id]

            return (
              <div key={home.id} className="grid md:grid-cols-2 gap-8 items-start">
                {/* Carousel */}
                <div className="relative aspect-[4/3] bg-muted overflow-hidden group">
                  {currentImage ? (
                    <Image 
                      src={currentImage} 
                      alt={home.name} 
                      fill 
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No image available</p>
                    </div>
                  )}

                  {/* Edit Button for Admins */}
                  {isEventAdmin && (
                    <button
                      onClick={() => handleEditHome(home)}
                      className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-10"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}

                  {/* Navigation Arrows */}
                  {hasImages && home.item_images.length > 1 && (
                    <>
                      <button
                        onClick={() => navigateCarousel(home.id, "prev")}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => navigateCarousel(home.id, "next")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Carousel Indicators */}
                  {hasImages && home.item_images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {home.item_images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            setCurrentImageIndexes((prev) => ({ ...prev, [home.id]: idx }))
                          }
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentIndex ? "bg-white w-6" : "bg-white/50"
                          }`}
                          aria-label={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Home Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-4xl md:text-5xl font-bold uppercase mb-2">{home.name}</h3>
                    {home.sponsor && (
                      <p className="text-muted-foreground text-sm uppercase tracking-wider">
                        Sponsored by <span className="font-semibold">{home.sponsor}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      asChild
                      variant="default"
                      className="uppercase tracking-wider"
                    >
                      <Link href={`/homes/${home.id}`}>
                        View Home Details
                      </Link>
                    </Button>
                    {home.directions_url && (
                      <Button
                        asChild
                        variant="outline"
                        className="uppercase tracking-wider"
                      >
                        <a href={home.directions_url} target="_blank" rel="noopener noreferrer">
                          <MapPin className="w-4 h-4 mr-2" />
                          GET DIRECTIONS
                        </a>
                      </Button>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={() => toggleDescription(home.id)}
                      className="flex items-center justify-between w-full text-left py-4 border-t border-b border-border hover:bg-muted/50 transition-colors group"
                    >
                      <span className="text-xl font-semibold uppercase tracking-wider">
                        HOME DESCRIPTION
                      </span>
                      <Plus
                        className={`w-6 h-6 transition-transform ${
                          isExpanded ? "rotate-45" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 text-muted-foreground">
                        {home.short_description && <p>{home.short_description}</p>}
                        {home.full_description && <p className="text-sm">{home.full_description}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {homes.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No homes available yet.</p>
          </div>
        )}
      </section>

      {/* Edit Home Dialog */}
      {editingHome && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Home</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveHome} className="space-y-4">
              <div>
                <Label htmlFor="name">Home Name</Label>
                <Input id="name" name="name" defaultValue={editingHome.name} required />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={editingHome.address || ""} />
              </div>
              <div>
                <Label htmlFor="sponsor">Sponsor</Label>
                <Input id="sponsor" name="sponsor" defaultValue={editingHome.sponsor || ""} />
              </div>
              <div>
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea
                  id="short_description"
                  name="short_description"
                  defaultValue={editingHome.short_description || ""}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="full_description">Full Description</Label>
                <Textarea
                  id="full_description"
                  name="full_description"
                  defaultValue={editingHome.full_description || ""}
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="item_images">Images (one URL per line)</Label>
                <Textarea
                  id="item_images"
                  name="item_images"
                  defaultValue={editingHome.item_images?.join("\n") || ""}
                  rows={4}
                  placeholder="https://example.com/image1.jpg"
                />
              </div>
              <div>
                <Label htmlFor="directions_url">Directions URL</Label>
                <Input
                  id="directions_url"
                  name="directions_url"
                  defaultValue={editingHome.directions_url || ""}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
