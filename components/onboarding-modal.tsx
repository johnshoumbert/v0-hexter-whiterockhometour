"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ArrowRight, Check, ShoppingCart, ImageIcon, Vote, Ticket } from "lucide-react"
import NextImage from "next/image"

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

interface EventFeatures {
  enable_registration: boolean
  enable_voting: boolean
  enable_gallery: boolean
  enable_shop: boolean
}

export function OnboardingModal({ open, onOpenChange, eventId }: OnboardingModalProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [features, setFeatures] = useState<EventFeatures | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [polls, setPolls] = useState<any[]>([])
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [shopItems, setShopItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (!open) return

    async function loadData() {
      try {
        // Fetch event features
        const eventRes = await fetch(`/api/events/${eventId}`)
        const eventData = await eventRes.json()
        setFeatures({
          enable_registration: eventData.enable_registration || false,
          enable_voting: eventData.enable_voting || false,
          enable_gallery: eventData.enable_gallery || false,
          enable_shop: eventData.enable_shop || false,
        })

        // Fetch tickets if enabled
        if (eventData.enable_registration) {
          const ticketsRes = await fetch(`/api/events/${eventId}/tickets`)
          const ticketsData = await ticketsRes.json()
          setTickets(ticketsData.filter((t: any) => t.is_active))
        }

        // Fetch voting polls if enabled
        if (eventData.enable_voting) {
          const pollsRes = await fetch(`/api/events/${eventId}/voting/polls`)
          const pollsData = await pollsRes.json()
          setPolls(pollsData.filter((p: any) => p.is_active))
        }

        // Fetch gallery images if enabled
        if (eventData.enable_gallery) {
          const galleryRes = await fetch(`/api/events/${eventId}/gallery`)
          const galleryData = await galleryRes.json()
          setGalleryImages(galleryData.slice(0, isMobile ? 2 : 3))
        }

        // Fetch shop items if enabled
        if (eventData.enable_shop) {
          const shopRes = await fetch(`/api/events/${eventId}/shop`)
          const shopData = await shopRes.json()
          setShopItems(shopData.filter((item: any) => item.is_active).slice(0, 3))
        }
      } catch (error) {
        console.error("Error loading onboarding data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open, eventId, isMobile])

  if (loading || !features) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const steps = []

  // Build steps array based on enabled features
  if (features.enable_registration && tickets.length > 0) {
    steps.push({
      title: "Get Your Tickets",
      description: "Secure your spot at our event",
      icon: Ticket,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Choose from our available ticket options:</p>
          <div className="grid gap-4 max-h-[300px] overflow-y-auto">
            {tickets.slice(0, 3).map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{ticket.name}</CardTitle>
                      <CardDescription>{ticket.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">${ticket.price}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              router.push("/tickets")
            }}
          >
            View All Tickets <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    })
  }

  if (features.enable_voting && polls.length > 0) {
    steps.push({
      title: "Cast Your Vote",
      description: "Have your say in our community polls",
      icon: Vote,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Participate in our active polls:</p>
          <div className="grid gap-4 max-h-[300px] overflow-y-auto">
            {polls.slice(0, 2).map((poll) => (
              <Card key={poll.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{poll.title}</CardTitle>
                  <CardDescription>{poll.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      router.push("/voting")
                    }}
                  >
                    Vote Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ),
    })
  }

  if (features.enable_gallery && galleryImages.length > 0) {
    steps.push({
      title: "Explore Our Gallery",
      description: "Check out photos from our community",
      icon: ImageIcon,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Recent highlights from our gallery:</p>
          <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-3"} gap-4`}>
            {galleryImages.map((image) => (
              <Card
                key={image.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  onOpenChange(false)
                  router.push("/gallery")
                }}
              >
                <div className="relative aspect-square">
                  <NextImage
                    src={image.image_url || "/placeholder.svg"}
                    alt={image.description || "Gallery image"}
                    fill
                    className="object-cover"
                  />
                </div>
              </Card>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              router.push("/gallery")
            }}
          >
            View Full Gallery <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    })
  }

  if (features.enable_shop && shopItems.length > 0) {
    steps.push({
      title: "Shop Our Items",
      description: "Browse exclusive merchandise and products",
      icon: ShoppingCart,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Featured items from our shop:</p>
          <div className="grid gap-4 max-h-[300px] overflow-y-auto">
            {shopItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <div className="flex gap-4 p-4">
                  {item.image_url && (
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <NextImage
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <Badge variant="secondary" className="mt-2">
                      ${item.price}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              router.push("/shop")
            }}
          >
            Shop Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    })
  }

  // If no features are enabled, don't show modal
  if (steps.length === 0) {
    return null
  }

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onOpenChange(false)
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {currentStepData.content}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleSkip} className="flex-1 bg-transparent">
              Skip Tour
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {currentStep < steps.length - 1 ? (
                <>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Done <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
