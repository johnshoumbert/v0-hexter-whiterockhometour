"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Loader2, Sparkles } from "lucide-react"
import { SponsorRegistrationForm } from "@/components/sponsor-registration-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Sponsor {
  id: string
  name: string
  logo_url: string | null
}

interface SponsorLevel {
  level: string
  amount: number
  benefits: string[]
  name?: string
  description?: string
  sponsor_limit?: number | null
  sponsor_count?: number
  sponsors?: Sponsor[]
}

export default function SponsorPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [sponsorLevels, setSponsorLevels] = useState<SponsorLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<SponsorLevel | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isCustomSponsor, setIsCustomSponsor] = useState(false)

  useEffect(() => {
    if (event?.id) {
      fetchSponsorLevels()
    }
  }, [event?.id])

  // Refresh sponsor levels when navigating back to the page (e.g., after payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && event?.id) {
        console.log("[v0] Page became visible, refreshing sponsor levels")
        fetchSponsorLevels()
      }
    }

    const handleFocus = () => {
      if (event?.id) {
        console.log("[v0] Window focused, refreshing sponsor levels")
        fetchSponsorLevels()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [event?.id])

  const fetchSponsorLevels = async () => {
    if (!event?.id) return

    setLoading(true)
    try {
      console.log("[v0] Fetching sponsor levels for event:", event.id)
      const response = await fetch(`/api/events/${event.id}/sponsor-levels`)
      const data = await response.json()

      const mappedLevels =
        data.levels?.map((level: any) => ({
          ...level,
          benefits: level.benefits?.map((b: any) => b.benefit_text || b) || [],
          sponsors: level.sponsors || [],
          sponsor_count: level.sponsor_count || 0,
        })) || []

      console.log("[v0] Sponsor levels loaded:", mappedLevels.map(l => ({ 
        level: l.level, 
        sponsor_count: l.sponsor_count,
        sponsor_limit: l.sponsor_limit 
      })))
      setSponsorLevels(mappedLevels)
    } catch (error) {
      console.error("[v0] Failed to load sponsorship levels:", error)
      toast({ title: "Failed to load sponsorship levels", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLevel = (level: SponsorLevel) => {
    if (isSoldOut(level)) {
      toast({ title: "This sponsorship level is sold out", variant: "destructive" })
      return
    }
    setSelectedLevel(level)
    setShowCustom(false)
    setIsCustomSponsor(false)
    setDialogOpen(true)
  }

  const handleCustomAmount = () => {
    if (!customAmount || Number.parseFloat(customAmount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" })
      return
    }

    setSelectedLevel({
      level: "custom",
      amount: Number.parseFloat(customAmount),
      benefits: ["Support our event", "Recognition as a sponsor"],
      name: "Custom Sponsorship",
    })
    setShowCustom(false)
    setIsCustomSponsor(true)
    setDialogOpen(true)
  }

  const isSoldOut = (level: SponsorLevel) => {
    if (!level.sponsor_limit) return false
    return (level.sponsor_count || 0) >= level.sponsor_limit
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getLevelColor = (level: string) => {
    return "from-primary/80 to-primary/60"
  }

  const getLevelBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      platinum: "bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground",
      gold: "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground",
      silver: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
      bronze: "bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground",
    }
    return colors[level.toLowerCase()] || "bg-primary/20 text-primary"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-muted/5 dark:bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-4 gap-1" variant="secondary">
            <Sparkles className="h-3 w-3" />
            Support {event?.name}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-balance text-foreground">Become a Sponsor</h1>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            Thank you to our generous sponsors who make this event possible. Join us in supporting our community and
            gain valuable exposure for your business.
          </p>
        </div>
      </section>

      {/* Sponsorship Levels */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Choose Your Sponsorship Level</h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {sponsorLevels.map((level) => {
            const soldOut = isSoldOut(level)
            return (
              <Card
                key={level.level}
                className={`relative overflow-hidden hover:shadow-lg transition-shadow border-border bg-card ${
                  soldOut ? "opacity-75" : ""
                }`}
              >
                <div className="h-2 bg-primary" />

                {soldOut && (
                  <div className="absolute top-8 left-0 right-0 bg-destructive text-destructive-foreground py-1 px-4 text-center font-semibold text-sm z-10">
                    SOLD OUT
                  </div>
                )}

                <CardHeader className={soldOut ? "mt-6" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getLevelBadgeColor(level.level)}>{level.name || level.level.toUpperCase()}</Badge>
                  </div>
                  <CardTitle className="text-2xl text-card-foreground">${level.amount.toLocaleString()}</CardTitle>
                  {level.description && <CardDescription className="text-sm">{level.description}</CardDescription>}
                </CardHeader>

                <CardContent className="space-y-4">
                  {level.sponsors && level.sponsors.length > 0 && (
                    <div className="space-y-3 pb-4 border-b">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Sponsored by:</p>
                      <div className="space-y-2">
                        {level.sponsors.map((sponsor) => (
                          <div key={sponsor.id} className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {sponsor.logo_url ? (
                                <AvatarImage src={sponsor.logo_url || "/placeholder.svg"} alt={sponsor.name} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(sponsor.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-card-foreground">{sponsor.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Benefits Include:</p>
                    <ul className="space-y-2">
                      {level.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-card-foreground">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button onClick={() => handleSelectLevel(level)} className="w-full" size="lg" disabled={soldOut}>
                    {soldOut ? "Sold Out" : `Select ${level.name || level.level}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Custom Amount Section */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle>Custom Sponsorship Amount</CardTitle>
              <CardDescription>Choose your own sponsorship amount that fits your budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCustom ? (
                <Button onClick={() => setShowCustom(true)} variant="outline" className="w-full" size="lg">
                  Enter Custom Amount
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customAmount">Sponsorship Amount ($)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="customAmount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="text-lg"
                      />
                      <Button onClick={handleCustomAmount} size="lg">
                        Continue
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => setShowCustom(false)} variant="ghost" className="w-full">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Registration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Sponsorship</DialogTitle>
            <DialogDescription>
              {selectedLevel && (
                <span>
                  {selectedLevel.name || selectedLevel.level} - ${selectedLevel.amount.toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedLevel && event?.id && (
            <SponsorRegistrationForm
              eventId={event.id}
              sponsorLevels={sponsorLevels}
              selectedLevel={selectedLevel}
              isCustomSponsor={isCustomSponsor}
              onSubmitSuccess={() => {
                setDialogOpen(false)
                toast({ title: "Sponsorship request submitted successfully!" })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
