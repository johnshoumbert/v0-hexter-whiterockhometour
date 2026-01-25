"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlatformLanding } from "@/components/platform-landing"
import { Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { TestimonialCarousel } from "@/components/testimonial-carousel"
import { TicketStatusSection } from "@/components/ticket-status-section"
import { SponsorDisplaySection } from "@/components/sponsor-display-section"

export default function HomePage() {
  const { event, isLoading, isMainDomain } = useEvent()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [heroSettings, setHeroSettings] = useState({
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image.png-vaXEO4FNUmTmYX2mCqCr9KMzaBg5fz.jpeg",
    title: "THANK YOU DALLAS!",
    subtitle: "SAVE THE DATE",
    description: "Next year's White Rock Home Tour will be April 25 & 26, 2026",
  })
  const [editForm, setEditForm] = useState(heroSettings)
  const [countdown, setCountdown] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!event?.id || !user) return
      try {
        const res = await fetch(`/api/events/${event.id}/admins`)
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.admins?.some((admin: any) => admin.user_id === user.id))
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
      }
    }
    checkAdmin()
  }, [event?.id, user])

  // Load page settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!event?.id) return
      try {
        // Use hero image from event if available, otherwise fall back to page-settings
        if (event.hero_image_url) {
          const updatedSettings = {
            image: event.hero_image_url,
            title: heroSettings.title,
            subtitle: heroSettings.subtitle,
            description: heroSettings.description,
          }
          setHeroSettings(updatedSettings)
          setEditForm(updatedSettings)
        }
      } catch (error) {
        console.error("Error loading page settings:", error)
      }
    }
    loadSettings()
  }, [event?.id, event?.hero_image_url])

  // Countdown to April 25-26, 2026
  useEffect(() => {
    const targetDate = new Date("2026-04-25T00:00:00")

    const updateCountdown = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff > 0) {
        const seconds = Math.floor((diff / 1000) % 60)
        const minutes = Math.floor((diff / (1000 * 60)) % 60)
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const months = Math.floor(days / 30)
        const years = Math.floor(months / 12)

        setCountdown({
          years,
          months: months % 12,
          days: days % 30,
          hours,
          minutes,
          seconds,
        })
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleSaveSettings = async () => {
    if (!event?.id) return

    try {
      const res = await fetch(`/api/events/${event.id}/page-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "home",
          section: "mainHero",
          data: editForm,
        }),
      })

      if (res.ok) {
        setHeroSettings(editForm)
        setEditDialogOpen(false)
        toast({
          title: "Success",
          description: "Hero settings updated successfully",
        })
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update hero settings",
        variant: "destructive",
      })
    }
  }

  if (isMainDomain) {
    return <PlatformLanding />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <p className="text-muted-foreground">This event could not be found or is no longer active.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Countdown Banner */}
      <div className="bg-black text-white py-2 px-4 text-center text-sm tracking-wider">
        THANK YOU FOR A GREAT 17TH YEAR, DALLAS!
      </div>

      {/* Hero Section */}
      <div className="relative h-[calc(100vh-120px)] min-h-[500px] md:min-h-[700px]">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroSettings.image}')`,
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Admin Edit Button */}
        {isAdmin && (
          <button
            onClick={() => setEditDialogOpen(true)}
            className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
            aria-label="Edit hero section"
          >
            <Pencil className="w-5 h-5 text-gray-800" />
          </button>
        )}

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight mb-3 md:mb-4">
            {heroSettings.title}
          </h1>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
            {heroSettings.subtitle}
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 font-light italic max-w-3xl">
            {heroSettings.description}
          </p>
        </div>

        {/* Countdown Section */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm py-8">
          <div className="container mx-auto px-4">
            <h3 className="text-xl md:text-2xl font-bold text-center mb-6 tracking-wide">
              COUNTDOWN TO THE 2026 WRHT
            </h3>
            <div className="flex justify-center items-center gap-4 md:gap-8 flex-wrap">
              {[
                { value: countdown.months, label: "Months" },
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hrs" },
                { value: countdown.minutes, label: "Mins" },
                { value: countdown.seconds, label: "Secs" },
              ].map((item, index, arr) => (
                <div key={item.label} className="flex items-center">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-gray-900">
                      {String(item.value).padStart(2, "0")}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 mt-1 font-medium">{item.label}</div>
                  </div>
                  {index < arr.length - 1 && (
                    <div className="text-3xl md:text-4xl font-bold text-gray-400 mx-2">:</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Status Section */}
      <TicketStatusSection />

      {/* Testimonials Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-wide">
          WHAT PEOPLE ARE SAYING ABOUT THE WRHT
        </h2>
        {event?.id && <TestimonialCarousel eventId={event.id} autoAdvanceInterval={5 * 60 * 1000} />}
      </div>

      {/* Please Join Us Section */}
      <div className="grid md:grid-cols-2 gap-0 min-h-[600px]">
        {/* Left Content */}
        <div className="bg-gray-100 p-8 md:p-16 flex flex-col justify-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight uppercase leading-tight">
            Please join us for our 17th year
          </h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            of celebrating mid-century and modern residential architecture, interior design, and landscape design in
            East Dallas, all to benefit the students and teachers of DISD's Hexter Elementary.
          </p>
          <div>
            <Link href="/tickets">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 font-bold border-2 border-black bg-transparent hover:bg-black hover:text-white transition-colors"
              >
                BUY YOUR TICKETS
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Image */}
        <div
          className="bg-cover bg-center min-h-[400px] md:min-h-full"
          style={{
            backgroundImage: `url('https://ubsxwry7ayqkssqp.public.blob.vercel-storage.com/Hero-Join-1234-09XWkSY7OWOxq6M1CvOJALEnVHEfcH')`,
          }}
        />
      </div>

      {/* Sponsors Section */}
      <SponsorDisplaySection />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Hero Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image">Background Image URL</Label>
              <Input
                id="image"
                value={editForm.image}
                onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={editForm.subtitle}
                onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
