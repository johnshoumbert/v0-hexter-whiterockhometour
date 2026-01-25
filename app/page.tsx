"use client"

import type React from "react"

import { CardTitle } from "@/components/ui/card"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context" // Import auth context
import { useRouter, useSearchParams } from "next/navigation" // Import router for redirects
import { PlatformLanding } from "@/components/platform-landing"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { CountdownTimer } from "@/components/countdown-timer"
import { GoalMeter } from "@/components/goal-meter"
import {
  ArrowRight,
  Heart,
  Users,
  Trophy,
  Vote,
  Ticket,
  Share2,
  ShoppingBag,
  Calendar,
  Clock,
  Check,
  HelpCircle,
} from "lucide-react" // Import icons, Added ShoppingBag icon, Added Check icon
import { AuctionCard } from "@/components/auction-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog" // Import dialog components
import { useToast } from "@/hooks/use-toast" // Import toast
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card" // Import card components
import { Loader2 } from "lucide-react" // Import loader icon
import { Badge } from "@/components/ui/badge" // Import badge component
import { ShareModal } from "@/components/share-modal" // Import ShareModal component
import { TicketRegistrationWizard } from "@/components/ticket-registration-wizard" // Added TicketRegistrationWizard import
import { OnboardingModal } from "@/components/onboarding-modal"

import { requestCache } from "@/lib/request-cache" // Import requestCache

export default function HomePage() {
  const { event, isLoading, isMainDomain, isError } = useEvent()
  const [showShareModal, setShowShareModal] = useState(false)

  // REMOVED: theme application useEffect - now handled globally by EventThemeProvider in layout
  // useEffect(() => {
  //   if (event) {
  //     const root = document.documentElement

  //     // Apply CSS variables for site-wide theming
  //     if (event.theme_bg_color) {
  //       root.style.setProperty("--event-bg-color", event.theme_bg_color)
  //     }
  //     if (event.theme_bg_image) {
  //       root.style.setProperty("--event-bg-image", `url(${event.theme_bg_image})`)
  //     } else {
  //       root.style.setProperty("--event-bg-image", "none")
  //     }
  //     if (event.theme_font_family) {
  //       root.style.setProperty("--event-font-family", `"${event.theme_font_family}", sans-serif`)
  //     }
  //     if (event.theme_text_color) {
  //       root.style.setProperty("--event-text-color", event.theme_text_color)
  //     }
  //     if (event.theme_bold_text_color) {
  //       root.style.setProperty("--event-bold-text-color", event.theme_bold_text_color)
  //     }
  //     if (event.theme_mode) {
  //       root.style.setProperty("--event-theme-mode", event.theme_mode)
  //     }

  //     // Add class to body for global theming
  //     document.body.classList.add("event-themed")
  //   }

  //   // Cleanup
  //   return () => {
  //     const root = document.documentElement
  //     root.style.removeProperty("--event-bg-color")
  //     root.style.removeProperty("--event-bg-image")
  //     root.style.removeProperty("--event-font-family")
  //     root.style.removeProperty("--event-text-color")
  //     root.style.removeProperty("--event-bold-text-color")
  //     root.style.removeProperty("--event-theme-mode")
  //     document.body.classList.remove("event-themed")
  //   }
  // }, [event])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isMainDomain) {
    return (
      <>
        <PlatformLanding />
        <Footer />
      </>
    )
  }

  if (isError || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">Event Not Found</h1>
          <p className="mb-8 text-lg text-muted-foreground">
            We couldn't find an event for this domain. Please check the URL and try again.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/events">Browse All Events</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://myschoolauction.com">Go to Main Site</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show event-specific page for subdomains
  return <EventLandingPage event={event} showShareModal={showShareModal} setShowShareModal={setShowShareModal} />
}

function EventLandingPage({
  event,
  showShareModal,
  setShowShareModal,
}: { event: any; showShareModal: boolean; setShowShareModal: any }) {
  const router = useRouter() // Get router for redirects
  const searchParams = useSearchParams()
  const { toast } = useToast() // Get toast for feedback
  const { user } = useAuth() // Get user from auth context
  const [featuredAuctions, setFeaturedAuctions] = useState<any[]>([])
  const [sponsors, setSponsors] = useState<any[]>([])
  const [sponsorLevels, setSponsorLevels] = useState<any[]>([])
  const [showSponsorDialog, setShowSponsorDialog] = useState(false)
  const [currentRaised, setCurrentRaised] = useState(0)
  const [fundingHeroData, setFundingHeroData] = useState({
    students: 500,
    donors: 250,
    programs: { show: true, value: 15 },
  })
  const [showTicketDialog, setShowTicketDialog] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({})
  const [isSubmittingTickets, setIsSubmittingTickets] = useState(false)
  const [polls, setPolls] = useState<any[]>([])
  const [userHasVoted, setUserHasVoted] = useState(false)
  const [userVotes, setUserVotes] = useState<any[]>([])
  const [raffles, setRaffles] = useState<any[]>([])
  const [userTicketPurchases, setUserTicketPurchases] = useState<any[]>([])
  const [showTicketQRDialog, setShowTicketQRDialog] = useState(false)
  const [showTicketInstructionsDialog, setShowTicketInstructionsDialog] = useState(false)
  const [selectedTicketPurchase, setSelectedTicketPurchase] = useState<any>(null)

  const [showWizard, setShowWizard] = useState(false)
  const [ticketsWithQuestions, setTicketsWithQuestions] = useState<any[]>([])

  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [gallerySettings, setGallerySettings] = useState<any>(null)

  const [shopItems, setShopItems] = useState<any[]>([])

  const [showEditRegistrationDialog, setShowEditRegistrationDialog] = useState(false)
  const [isUpdatingRegistration, setIsUpdatingRegistration] = useState(false)
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [isFetching, setIsFetching] = useState(false)

  const [auctionStatus, setAuctionStatus] = useState<"not-started" | "live" | "ended">("live")

  const [showClaimConfirmation, setShowClaimConfirmation] = useState(false)
  const [ticketToClaim, setTicketToClaim] = useState<string | null>(null)

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (searchParams.get("showOnboarding") === "true" && user && event?.id) {
      setShowOnboarding(true)
    }
  }, [searchParams, user, event?.id])

  useEffect(() => {
    if (showOnboarding && searchParams.get("showOnboarding") === "true") {
      router.replace("/", { scroll: false })
    }
  }, [showOnboarding, searchParams, router])

  const heroDescription = event?.hero_description
  const impactImageUrl = event?.impact_image_url
  const additionalSections = event?.additional_sections || []
  const pickupInstructions = event?.pickup_instructions

  const themeBgColor = event?.theme_bg_color
  const themeBgImage = event?.theme_bg_image
  const themeFontFamily = event?.theme_font_family
  const themeTextColor = event?.theme_text_color
  const themeBoldTextColor = event?.theme_bold_text_color
  const themeMode = event?.theme_mode || "light"

  const heroSectionStyle: React.CSSProperties = {}
  if (themeBgImage) {
    heroSectionStyle.backgroundImage = `url(${themeBgImage})`
    heroSectionStyle.backgroundSize = "cover"
    heroSectionStyle.backgroundPosition = "center"
  } else if (themeBgColor) {
    heroSectionStyle.backgroundColor = themeBgColor
  }

  const heroTextStyle: React.CSSProperties = {}
  if (themeTextColor) {
    heroTextStyle.color = themeTextColor
  }

  const heroBoldTextStyle: React.CSSProperties = {}
  if (themeBoldTextColor) {
    heroBoldTextStyle.color = themeBoldTextColor
  }

  const fontFamilyStyle: React.CSSProperties = {}
  if (themeFontFamily) {
    fontFamilyStyle.fontFamily = `"${themeFontFamily}", sans-serif`
  }

  useEffect(() => {
    if (!event?.start_date || !event?.end_date) return

    const checkStatus = () => {
      const now = new Date()
      const start = new Date(event.start_date)
      const end = new Date(event.end_date)

      if (now < start) {
        setAuctionStatus("not-started")
      } else if (now > end) {
        setAuctionStatus("ended")
      } else {
        setAuctionStatus("live")
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 1000)
    return () => clearInterval(interval)
  }, [event?.start_date, event?.end_date])

  useEffect(() => {
    setIsFetching(false)
  }, [event?.id])

  // Function to refetch user ticket purchases
  const fetchUserTicketPurchases = async () => {
    if (user && event.request_attendance) {
      try {
        const response = await fetch(`/api/events/${event.id}/ticket-purchases`)
        if (response.ok) {
          const data = await response.json()
          setUserTicketPurchases(Array.isArray(data) ? data : data.purchases || [])
        }
      } catch (error) {
        // Silently handle error
      }
    }
  }

  // Function to set ticket as claimed
  const handleSetClaimed = async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/events/${event.id}/ticket-purchases/${purchaseId}/claim`, {
        method: "PATCH",
      })

      let responseData: any = null
      try {
        responseData = await response.json()
      } catch (parseError) {
        // console.error("[v0] Failed to parse response as JSON:", parseError) // removed debug logging
        throw new Error(`Server returned status ${response.status}`)
      }

      if (response.ok) {
        // console.log("[v0] Updated purchase:", responseData) // removed debug logging
        setUserTicketPurchases((prevPurchases) =>
          prevPurchases.map((purchase) => (purchase.id === purchaseId ? responseData : purchase)),
        )
        setSelectedTicketPurchase((prev) => {
          if (prev?.id === purchaseId) {
            // console.log("[v0] Updated selected purchase:", responseData) // removed debug logging
            return responseData
          }
          return prev
        })
        setShowClaimConfirmation(false)
        setTicketToClaim(null)
        toast({
          title: "Ticket Claimed",
          description: "This ticket has been marked as claimed.",
        })
      } else {
        // console.error("[v0] Claim failed with status:", response.status) // removed debug logging
        // console.error("[v0] Error details:", responseData) // removed debug logging
        toast({
          title: "Error",
          description: responseData?.error || "Failed to mark ticket as claimed. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      // console.error("[v0] Error claiming ticket:", error) // removed debug logging
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark ticket as claimed. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    // Prevent duplicate fetches
    if (isFetching || !event?.id) return

    let mounted = true

    async function fetchData() {
      // Check if we're already fetching
      if (!mounted) return

      setIsFetching(true)

      try {
        // Fetch featured auctions
        const auctionsData = await requestCache.fetch(
          `auctions-featured-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/auctions?status=active&featured=true`)
            if (!response.ok) throw new Error("Failed to fetch auctions")
            return response.json()
          },
          10000, // Cache for 10 seconds
        )

        if (mounted) {
          const transformedAuctions = (auctionsData.auctions || []).map((auction: any) => {
            let imageUrl = "/placeholder.svg?height=400&width=600"
            try {
              const parsed = JSON.parse(auction.image_url)
              imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : auction.image_url || imageUrl
            } catch {
              imageUrl = auction.image_url || imageUrl
            }

            return {
              id: auction.id,
              slug: auction.slug || auction.id,
              title: auction.title,
              description: auction.description,
              image: imageUrl,
              currentBid: auction.current_bid || auction.min_bid,
              bidderInitials: auction.top_bidder_name?.substring(0, 2).toUpperCase() || "--",
              endTime: new Date(auction.end_time),
              category: auction.category,
            }
          })
          setFeaturedAuctions(transformedAuctions)
        }

        // Fetch sponsors (only show on home page)
        const sponsorsData = await requestCache.fetch(
          `sponsors-home-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/sponsors?showOnHome=true`)
            if (!response.ok) throw new Error("Failed to fetch sponsors")
            return response.json()
          },
          30000, // Cache for 30 seconds
        )
        if (mounted) {
          setSponsors(sponsorsData.sponsors || [])
        }

        if (event.enable_sponsor && mounted) {
          const levelsData = await requestCache.fetch(
            `sponsor-levels-${event.id}`,
            async () => {
              const response = await fetch(`/api/events/${event.id}/sponsor-levels`)
              if (!response.ok) throw new Error("Failed to fetch sponsor levels")
              return response.json()
            },
            30000,
          )
          if (mounted) {
            const mappedLevels =
              levelsData.levels?.map((level: any) => ({
                ...level,
                benefits: level.benefits?.map((b: any) => (typeof b === "string" ? b : b.benefit_text)) || [],
              })) || []
            setSponsorLevels(mappedLevels)
          }
        }

        // Fetch total raised
        const raisedData = await requestCache.fetch(
          `total-raised-${event.id}`,
          async () => {
            const response = await fetch(`/api/stats/total-raised?eventId=${event.id}`)
            if (!response.ok) throw new Error("Failed to fetch total raised")
            return response.json()
          },
          15000, // Cache for 15 seconds
        )
        if (mounted) {
          setCurrentRaised(raisedData.total || 0)
        }

        const settingsData = await requestCache.fetch(
          `settings-funding-hero-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/settings?page=home&object=Funding Hero`)
            if (!response.ok) throw new Error("Failed to fetch settings")
            return response.json()
          },
          60000, // Cache for 1 minute
        )
        if (mounted && settingsData.settings && settingsData.settings.value) {
          setFundingHeroData(settingsData.settings.value)
        }

        if (event.request_attendance && mounted) {
          const ticketsData = await requestCache.fetch(
            `tickets-${event.id}`,
            async () => {
              const response = await fetch(`/api/events/${event.id}/tickets`)
              if (!response.ok) throw new Error("Failed to fetch tickets")
              return response.json()
            },
            30000, // Cache for 30 seconds
          )
          if (mounted) {
            const activeTickets = (ticketsData.tickets || []).map((t: any) => ({
              ...t,
              activeTierName: t.ticket_tier?.name || "", // Map active tier name
              pricingTiers: t.pricing_tiers || [], // Map pricing tiers
            }))
            setTickets(activeTickets)
          }
        }

        // Fetch polls
        const pollsData = await requestCache.fetch(
          `polls-${event.id}`,
          async () => {
            const response = await fetch(`/api/events/${event.id}/voting/polls`)
            if (!response.ok) throw new Error("Failed to fetch polls")
            return response.json()
          },
          30000, // Cache for 30 seconds
        )
        if (mounted) {
          setPolls(pollsData.polls || [])

          if (user) {
            const votesData = await requestCache.fetch(
              `user-votes-${event.id}-${user.id}`,
              async () => {
                const response = await fetch(`/api/events/${event.id}/voting/vote`)
                if (!response.ok) throw new Error("Failed to fetch votes")
                return response.json()
              },
              30000, // Cache for 30 seconds
            )
            setUserVotes(votesData.votes || [])

            const activePollIds = (pollsData.polls || [])
              .filter((poll: any) => poll.is_active)
              .map((poll: any) => poll.id)

            const hasVoted = (votesData.votes || []).some((vote: any) => activePollIds.includes(vote.poll_id))
            setUserHasVoted(hasVoted)
          }
        }

        if (event.enable_raffles && mounted) {
          const rafflesData = await requestCache.fetch(
            `raffles-${event.id}`,
            async () => {
              const response = await fetch(`/api/events/${event.id}/raffles`)
              if (!response.ok) throw new Error("Failed to fetch raffles")
              return response.json()
            },
            30000, // Cache for 30 seconds
          )
          if (mounted) {
            const activeRaffles = (rafflesData.raffles || []).filter((r: any) => r.is_active)
            setRaffles(activeRaffles)
          }
        }

        // Fetch user ticket purchases
        if (mounted) {
          await fetchUserTicketPurchases()
        }

        if (event.enable_gallery && mounted) {
          const galleryData = await requestCache.fetch(
            `gallery-preview-${event.id}`,
            async () => {
              const response = await fetch(`/api/events/${event.id}/gallery?limit=3`)
              if (!response.ok) throw new Error("Failed to fetch gallery")
              return response.json()
            },
            30000, // Cache for 30 seconds
          )
          if (mounted) {
            setGalleryImages(galleryData.images || [])
          }

          // Fetch gallery settings
          const eventData = await requestCache.fetch(
            `event-${event.id}`,
            async () => {
              const response = await fetch(`/api/events/${event.id}`)
              if (!response.ok) throw new Error("Failed to fetch event")
              return response.json()
            },
            60000, // Cache for 1 minute
          )
          if (mounted) {
            setGallerySettings({
              title: eventData.event.gallery_title || "Photo Gallery",
              description: eventData.event.gallery_description || "Browse our photo gallery",
            })
          }
        }

        if (event.enable_shop && mounted) {
          const shopData = await requestCache.fetch(
            `shop-items-featured-${event.id}`,
            async () => {
              const response = await fetch(`/api/events/${event.id}/shop/items?active=true`)
              if (!response.ok) throw new Error("Failed to fetch shop items")
              return response.json()
            },
            30000, // Cache for 30 seconds
          )
          if (mounted) {
            const featuredShopItems = (shopData.items || []).filter((item: any) => item.featured).slice(0, 3)
            const regularItems = (shopData.items || []).slice(0, 3)
            setShopItems(featuredShopItems.length > 0 ? featuredShopItems : regularItems)
          }
        }
      } catch (error: any) {
        // console.error("[v0] Error fetching data:", error) // removed debug logging
      } finally {
        if (mounted) {
          setIsFetching(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [event?.id]) // Removed user?.id from dependencies as it was too specific

  const handleTicketClick = () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setShowTicketDialog(true)
  }

  const handleTicketCheckout = async () => {
    if (!user) return

    const selectedTickets = Object.entries(ticketQuantities).filter(([_, qty]) => qty > 0)
    if (selectedTickets.length === 0) {
      toast({
        title: "No Tickets Selected",
        description: "Please select at least one ticket",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingTickets(true)
    try {
      const ticketOrders = selectedTickets.map(([ticketId, quantity]) => {
        const ticket = tickets.find((t) => t.id === ticketId)
        return {
          ticket_id: ticketId,
          ticket_name: ticket?.name || "",
          quantity,
          price: ticket?.price || 0,
        }
      })

      // Fetch questions for selected tickets
      const ticketsWithQuestionsData = await Promise.all(
        ticketOrders.map(async (ticket) => {
          const res = await fetch(`/api/events/${event.id}/tickets/${ticket.ticket_id}/questions`)
          const questions = res.ok ? await res.json() : []
          return {
            ...ticket,
            questions: questions.setupRequired ? [] : questions,
          }
        }),
      )

      const hasQuestions = ticketsWithQuestionsData.some((t) => t.questions.length > 0)

      if (hasQuestions) {
        setTicketsWithQuestions(ticketsWithQuestionsData)
        setShowTicketDialog(false)
        setShowWizard(true)
      } else {
        // No questions, proceed directly
        await submitTicketPurchase({})
      }
    } catch (error) {
      // console.error("[v0] Error fetching questions:", error) // removed debug logging
      await submitTicketPurchase({})
    } finally {
      setIsSubmittingTickets(false)
    }
  }

  const submitTicketPurchase = async (questionResponses: Record<string, Record<string, string | string[]>>) => {
    const selectedTickets = Object.entries(ticketQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketId, quantity]) => {
        const ticket = tickets.find((t) => t.id === ticketId)
        return {
          ticket_id: ticketId,
          quantity,
          price: ticket?.price || 0,
        }
      })

    const totalAmount = selectedTickets.reduce((sum, ticket) => sum + ticket.price * ticket.quantity, 0)

    setIsSubmittingTickets(true)
    try {
      if (totalAmount === 0) {
        // Free tickets
        const response = await fetch(`/api/events/${event.id}/tickets/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tickets: selectedTickets,
            responses: questionResponses,
          }),
        })

        if (!response.ok) throw new Error("Failed to register tickets")

        const purchasesRes = await fetch(`/api/events/${event.id}/ticket-purchases`)
        if (purchasesRes.ok) {
          const data = await purchasesRes.json()
          setUserTicketPurchases(data.purchases || [])
        }

        toast({
          title: "Registration Complete",
          description: "Your free tickets have been registered!",
        })
        setShowWizard(false)
        setShowTicketDialog(false)
        setTicketQuantities({})
      } else {
        // Paid tickets - TODO: integrate with Stripe checkout
        const response = await fetch(`/api/events/${event.id}/tickets/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tickets: selectedTickets,
            responses: questionResponses,
          }),
        })

        if (!response.ok) throw new Error("Failed to create checkout session")

        const { url } = await response.json()
        window.location.href = url
      }
    } catch (error) {
      // console.error("[v0] Error processing tickets:", error) // removed debug logging
      toast({
        title: "Error",
        description: "Failed to process ticket purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingTickets(false)
    }
  }

  const totalTicketCost = Object.entries(ticketQuantities).reduce((sum, [ticketId, quantity]) => {
    const ticket = tickets.find((t) => t.id === ticketId)
    // Find the active tier's price
    const activeTier = ticket?.pricingTiers?.find((tier: any) => tier.isActive)
    return sum + (activeTier?.price || ticket?.price || 0) * quantity
  }, 0)

  const totalUserTickets = Array.isArray(userTicketPurchases)
    ? userTicketPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0)
    : 0

  const eventEndTime = event?.end_date ? new Date(event.end_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const goalAmount = event?.goal || 75000
  const eventName = event?.event_name || "My School Auction"
  const heroImageUrl = event?.hero_image_url
  // const heroDescription = event?.hero_description // moved up
  const requestAttendance = event?.request_attendance || false
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

  // Event data is now properly cached and only fetched when necessary

  return (
    <div className="min-h-screen ">
      <main className="flex-1">
        <section className="relative overflow-hidden hero-section bg-background">
          {heroImageUrl && (
            <div className="relative h-[300px] md:h-[400px] w-full pt-0 md:pt-24">
              <img
                src={heroImageUrl || "/placeholder.svg"}
                alt={eventName}
                className="h-full w-full object-contain object-center"
              />
            </div>
          )}

          <div className="container mx-auto px-4 py-8 md:py-12 ">
            <div className="mx-auto max-w-4xl space-y-6 text-center">
              <h1 className="text-balance text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl">{eventName}</h1>
              <div className="text-foreground">
                <p className="text-pretty text-base md:text-xl mx-auto max-w-2xl">
                  {heroDescription ? (
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: heroDescription.replace(/\n/g, "<br />") }}
                    />
                  ) : (
                    "TBD"
                  )}
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 pt-4">
                {event?.start_date && event?.end_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" - "}
                      {new Date(event.end_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {auctionStatus === "not-started" && event?.start_date && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Clock className="h-5 w-5" />
                      <span>Auction starts in</span>
                    </div>
                    <CountdownTimer endTime={new Date(event.start_date)} />
                  </div>
                )}

                {auctionStatus === "live" && event?.end_date && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Trophy className="h-4 w-4" />
                      <span>Auction is Live</span>
                    </div>
                    <CountdownTimer endTime={new Date(event.end_date)} />
                  </div>
                )}

                {auctionStatus === "ended" && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10">
                    <div className="flex items-center gap-2 text-destructive font-medium">
                      <Trophy className="h-5 w-5" />
                      <span>Auction is closed</span>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/user/wins">See My Winnings</Link>
                    </Button>
                  </div>
                )}
              </div>

              {user && requestAttendance && userTicketPurchases.length > 0 && (
                <Card className="mx-auto max-w-md">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2">
                        <Ticket className="h-5 w-5 text-primary" />
                        <p className="text-lg font-semibold">
                          You have {totalUserTickets} ticket{totalUserTickets > 1 ? "s" : ""} for this event
                        </p>
                      </div>
                      {/* CHANGE: Made button layout responsive: stack vertically on mobile, horizontally on medium+ screens */}
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Button
                          onClick={() => {
                            setSelectedTicketPurchase(userTicketPurchases[0])
                            setShowTicketQRDialog(true)
                          }}
                          className="flex-1"
                        >
                          Show QR Code
                        </Button>
                        {tickets.find((t) => t.id === userTicketPurchases[0]?.ticket_id)?.instructions && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowTicketInstructionsDialog(true)
                            }}
                            className="flex-1"
                          >
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Instructions
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTicketPurchase(userTicketPurchases[0])
                            // Pre-fill quantities based on current purchase
                            const currentQuantities = {} as Record<string, number>
                            userTicketPurchases.forEach((purchase) => {
                              if (purchase.ticket_id) {
                                currentQuantities[purchase.ticket_id] = purchase.quantity || 1
                              }
                            })
                            // console.log("[v0] Pre-filling ticket quantities:", currentQuantities) // removed debug logging
                            setTicketQuantities(currentQuantities)
                            setShowEditRegistrationDialog(true)
                          }}
                          className="flex-1"
                        >
                          Edit Registration
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
                {requestAttendance && tickets.length > 0 && userTicketPurchases.length === 0 ? (
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link href="/tickets">
                      Register for Event <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : !requestAttendance ? (
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link href="/auctions">
                      Start Bidding <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  // If user is registered, and attendance is requested, do nothing here.
                  // The "Show QR Code" and "Edit Registration" buttons are shown above.
                  <></>
                )}

                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent">
                  <Link href="/donate">
                    Make a Donation <Heart className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowShareModal(true)}
                  className="w-full sm:w-auto bg-transparent"
                >
                  <Share2 className="mr-2 h-5 w-5" />
                  Share Event
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/50 py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <GoalMeter current={currentRaised} goal={goalAmount} label="Help us reach our goal!" />
          </div>
        </section>

        {/* Voting Section */}
        {event.enable_voting && polls.length > 0 && (
          <section className="py-16 md:py-24 border-t">
            <div className="container mx-auto px-4">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Don't Forget to Vote!</h2>
                {user && userHasVoted ? (
                  <div className="mt-6 space-y-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-lg">
                      <Check className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold text-primary">Thank you for your vote!</p>
                    </div>
                    <p className="text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                      Come back for the reveal of the results!
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                      Your voice matters! Cast your vote on important decisions for our community.
                    </p>
                    <div className="mt-8">
                      <Button size="lg" asChild>
                        <Link href="/voting">
                          <Vote className="mr-2 h-5 w-5" />
                          Go to Voting
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Raffle Section */}
        {raffles.length > 0 && (
          <section className="py-16 md:py-24 border-t">
            <div className="container mx-auto px-4">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Enter Our Raffle!</h2>
                <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                  Purchase raffle tickets for a chance to win amazing prizes while supporting our cause.
                </p>
              </div>
              <div className="mx-auto max-w-6xl">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {raffles.map((raffle: any) => (
                    <Card key={raffle.id} className="overflow-hidden">
                      {raffle.image_url && (
                        <div className="relative w-full h-48">
                          <img
                            src={raffle.image_url || "/placeholder.svg"}
                            alt={raffle.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle>{raffle.title}</CardTitle>
                        <CardDescription>{raffle.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Ticket Price</span>
                          <span className="text-lg font-bold">
                            {Number.parseFloat(raffle.ticket_price) === 0
                              ? "Free"
                              : `$${Number.parseFloat(raffle.ticket_price).toFixed(2)}`}
                          </span>
                        </div>
                        {raffle.total_tickets_available && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Available</span>
                            <span>
                              {raffle.total_tickets_available - (raffle.tickets_sold || 0)} /{" "}
                              {raffle.total_tickets_available}
                            </span>
                          </div>
                        )}
                        <Button className="w-full" asChild>
                          <Link href={`/raffles/${raffle.id}`}>
                            <Trophy className="mr-2 h-4 w-4" />
                            Buy Tickets
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {event.enable_shop && shopItems.length > 0 && (
          <section className="py-16 md:py-24 border-t">
            <div className="container mx-auto px-4">
              {/* CHANGE: Use shop_title and shop_description from event settings */}
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                  {event.shop_title || "Shop Our Items"}
                </h2>
                <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                  {event.shop_description || "Purchase items directly and support our cause"}
                </p>
              </div>
              <div className="mx-auto max-w-6xl">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {shopItems.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden">
                      {item.image_url && (
                        <div className="relative w-full h-48">
                          <img
                            src={item.image_url || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle>{item.title}</CardTitle>
                        {item.description && (
                          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">${Number.parseFloat(item.price).toFixed(2)}</span>
                          {item.quantity_type === "limited" && (
                            <span className="text-sm text-muted-foreground">
                              {(item.quantity_available || 0) - (item.quantity_sold || 0)} left
                            </span>
                          )}
                          {item.quantity_type === "preorder" && <Badge variant="secondary">Pre-order</Badge>}
                        </div>
                        <Button className="w-full" asChild>
                          <Link href="/shop">
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Shop Now
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="mt-12 text-center">
                <Button size="lg" variant="outline" asChild>
                  <Link href="/shop">
                    View All Items <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Featured Auctions Section */}
        {event.enable_auction && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Featured Auctions</h2>
                <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                  Bid on amazing items and experiences while supporting a great cause
                </p>
              </div>

              {featuredAuctions.length > 0 ? (
                <>
                  <div className="mx-auto max-w-6xl">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
                      {featuredAuctions.map((auction: any) => (
                        <AuctionCard key={auction.id} auction={auction} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 text-center">
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/auctions">
                        View All Auctions <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mx-auto max-w-2xl rounded-lg border bg-muted/50 p-12 text-center">
                  <p className="text-lg text-muted-foreground">No auctions available at the moment. Check back soon!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {event.enable_gallery && galleryImages.length > 0 && gallerySettings && (
          <section className="py-16 md:py-24 border-t">
            <div className="container mx-auto px-4">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">{gallerySettings.title}</h2>
                <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                  {gallerySettings.description}
                </p>
              </div>
              <div className="mx-auto max-w-6xl">
                <div className="grid gap-6 md:grid-cols-3">
                  {galleryImages.map((image: any) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer hover:shadow-xl transition-shadow"
                    >
                      <img
                        src={image.image_url || "/placeholder.svg"}
                        alt={image.description || "Gallery image"}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-sm font-medium">{image.uploader_name}</p>
                        {image.description && <p className="text-xs opacity-90 line-clamp-2">{image.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 text-center">
                  <Button size="lg" asChild>
                    <Link href="/gallery">
                      View All Photos <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Impact Story Section */}
        <section className="bg-muted/50 py-12 md:py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-8 md:gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                {/* Image Column - hidden on mobile if no image */}
                {impactImageUrl && (
                  <div className="order-2 lg:order-1">
                    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                      <img
                        src={impactImageUrl || "/placeholder.svg"}
                        alt="Students benefiting from programs"
                        className="rounded-2xl shadow-xl w-full h-auto object-cover aspect-[4/3]"
                      />
                    </div>
                  </div>
                )}

                {/* Content Column */}
                <div
                  className={`order-1 lg:order-2 flex flex-col justify-center space-y-6 ${!impactImageUrl ? "lg:col-span-2 text-center" : ""}`}
                >
                  <h2 className="text-balance text-2xl md:text-3xl font-bold tracking-tight lg:text-4xl text-center">
                    Your Bids Help Fund Our Programs
                  </h2>
                  <p className="text-pretty text-base md:text-lg leading-relaxed text-muted-foreground">
                    Every dollar raised through our auctions goes directly to supporting educational programs,
                    extracurricular activities, and resources that enrich our students' learning experiences.
                  </p>

                  {/* Stats Grid - improved mobile layout */}
                  <div
                    className={`grid gap-6 grid-cols-2 ${fundingHeroData.programs.show ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${!impactImageUrl ? "justify-center max-w-3xl mx-auto" : ""}`}
                  >
                    <div className="space-y-2 text-center sm:text-left">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ${!impactImageUrl ? "mx-auto" : ""}`}
                      >
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">{fundingHeroData.students}+</p>
                      <p className="text-sm text-muted-foreground">Students Supported</p>
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ${!impactImageUrl ? "mx-auto" : ""}`}
                      >
                        <Heart className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">{fundingHeroData.donors}+</p>
                      <p className="text-sm text-muted-foreground">Generous Donors</p>
                    </div>
                    {fundingHeroData.programs.show && (
                      <div className="space-y-2 text-center sm:text-left col-span-2 sm:col-span-1">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ${!impactImageUrl ? "mx-auto" : ""}`}
                        >
                          <Trophy className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-2xl font-bold">{fundingHeroData.programs.value}+</p>
                        <p className="text-sm text-muted-foreground">Programs Funded</p>
                      </div>
                    )}
                  </div>

                  <div className={!impactImageUrl ? "flex justify-center" : ""}>
                    <Button size="lg" asChild className="w-full sm:w-fit">
                      <Link href="/donate">
                        Make a Donation <Heart className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {additionalSections.length > 0 && (
          <section className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-4xl space-y-8">
              {additionalSections.map((section, index) => (
                <div key={section.id || index} className="space-y-3">
                  <h2 className="text-3xl font-bold tracking-tight">{section.header}</h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                    <div dangerouslySetInnerHTML={{ __html: section.body }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sponsors Section */}
        {(event.enable_sponsor || sponsors.length > 0) && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Our Sponsors</h2>
                <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                  Thank you to our generous sponsors who make this event possible
                </p>
                {event.enable_sponsor && (
                  <div className="mt-6">
                    <Button size="lg" asChild>
                      <Link href="/sponsor">Become a Sponsor</Link>
                    </Button>
                  </div>
                )}
                {/* </CHANGE> */}
              </div>
              {sponsors.length > 0 && (
                <div className="mx-auto max-w-5xl">
                  <div className="grid grid-cols-2 gap-8 md:grid-cols-4 justify-items-center">
                    {sponsors.map((sponsor: any) => (
                      <Link
                        key={sponsor.id}
                        href={`/sponsors/${sponsor.id}`}
                        className="flex items-center justify-center hover:scale-105 transition-all cursor-pointer w-full h-32 md:h-40"
                      >
                        <img
                          src={sponsor.logo_url || "/placeholder.svg?height=80&width=120"}
                          alt={sponsor.name}
                          className="object-contain w-full h-full opacity-85 hover:opacity-100 transition-opacity"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Contact Us Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl mb-4">Get in Touch</h2>
              <p className="text-pretty text-lg text-muted-foreground mb-8">
                Have questions or need assistance? Our support team is here to help.
              </p>
              <Button size="lg" asChild>
                <Link href="/support">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Ticket Selection Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Tickets</DialogTitle>
            <DialogDescription>Choose your tickets for {event.event_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{ticket.name}</h4>
                      {ticket.description && <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>}
                      {ticket.pricingTiers && ticket.pricingTiers.length > 0 ? (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          {ticket.pricingTiers.map((tier: any) => {
                            const startDate = tier.startDate ? new Date(tier.startDate) : null
                            const endDate = tier.endDate ? new Date(tier.endDate) : null
                            const now = new Date()

                            const formattedStart = startDate
                              ? startDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : ""
                            const formattedEnd = endDate
                              ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : ""

                            return (
                              <div
                                key={tier.id}
                                className={`text-sm p-2 rounded border ${
                                  tier.isActive ? "border-primary/50 bg-primary/5" : "border-muted bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{tier.name}</span>
                                  <span className="font-semibold">${Number.parseFloat(tier.price).toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formattedStart && formattedEnd
                                    ? `${formattedStart} - ${formattedEnd}`
                                    : "No date range"}
                                </div>
                                {tier.isActive && (
                                  <Badge variant="default" className="text-xs mt-1">
                                    Available Now
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-lg font-bold">
                            {ticket.price === 0 ? "Free" : `$${Number.parseFloat(ticket.price).toFixed(2)}`}
                          </p>
                        </div>
                      )}
                      {ticket.quantity_available && (
                        <p className="text-xs text-muted-foreground">
                          {ticket.quantity_available - ticket.quantity_sold} remaining
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!ticket.pricingTiers ||
                      ticket.pricingTiers.length === 0 ||
                      ticket.pricingTiers.some((t: any) => t.isActive) ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setTicketQuantities({
                                ...ticketQuantities,
                                [ticket.id]: Math.max(0, (ticketQuantities[ticket.id] || 0) - 1),
                              })
                            }
                            disabled={!ticketQuantities[ticket.id] || ticketQuantities[ticket.id] === 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-semibold">{ticketQuantities[ticket.id] || 0}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setTicketQuantities({
                                ...ticketQuantities,
                                [ticket.id]: (ticketQuantities[ticket.id] || 0) + 1,
                              })
                            }
                            disabled={
                              ticket.quantity_available &&
                              (ticketQuantities[ticket.id] || 0) >= ticket.quantity_available - ticket.quantity_sold
                            }
                          >
                            +
                          </Button>
                        </>
                      ) : (
                        <div className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            Not Available
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTicketCheckout} disabled={isSubmittingTickets}>
              {isSubmittingTickets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {totalTicketCost === 0 ? "Register Free" : "Proceed to Checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket QR Code Dialog */}
      <Dialog open={showTicketQRDialog} onOpenChange={setShowTicketQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Ticket</DialogTitle>
            <DialogDescription>Show this QR code to the admin at the event entrance</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${appUrl}/admin/redeem/ticket/${selectedTicketPurchase?.id}`}
                alt="Ticket QR Code"
                className="w-64 h-64"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold">{selectedTicketPurchase?.ticket_name}</p>
              <p className="text-sm text-muted-foreground">Quantity: {selectedTicketPurchase?.quantity || 1}</p>
              <p className="text-xs text-muted-foreground">
                Purchased:{" "}
                {selectedTicketPurchase?.created_at
                  ? new Date(selectedTicketPurchase.created_at).toLocaleDateString()
                  : ""}
              </p>
              {selectedTicketPurchase?.is_claimed ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                  <p className="text-sm font-medium text-green-700">✓ Claimed</p>
                  <p className="text-xs text-green-600">
                    {new Date(selectedTicketPurchase.claimed_at).toLocaleDateString()}
                  </p>
                </div>
              ) : new Date() >= new Date(event.start_date) ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 w-full">
                  <Button
                    onClick={() => {
                      setTicketToClaim(selectedTicketPurchase.id)
                      setShowClaimConfirmation(true)
                    }}
                    className="w-full"
                    size="sm"
                  >
                    Set Claimed
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTicketInstructionsDialog} onOpenChange={setShowTicketInstructionsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket Instructions</DialogTitle>
            <DialogDescription>Important information and agenda for your registered tickets</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6 max-h-96 overflow-y-auto">
            {Array.from(
              new Map(
                userTicketPurchases
                  .map((purchase) => {
                    const ticket = tickets.find((t) => t.id === purchase.ticket_id)
                    return [purchase.ticket_id, { ticket, purchase }]
                  })
                  .filter(([_, data]) => data.ticket?.instructions),
              ).values(),
            ).map(({ ticket, purchase }, index) => (
              <div key={ticket.id} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-lg">{ticket.name}</h3>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: ticket.instructions }}
                />
              </div>
            ))}
            {userTicketPurchases.filter((p) => tickets.find((t) => t.id === p.ticket_id)?.instructions).length ===
              0 && <p className="text-muted-foreground">No instructions available for your registered tickets</p>}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowTicketInstructionsDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClaimConfirmation} onOpenChange={setShowClaimConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Ticket Claim</DialogTitle>
            <DialogDescription>Are you sure you want to mark this ticket as claimed?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowClaimConfirmation(false)
                setTicketToClaim(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (ticketToClaim) {
                  handleSetClaimed(ticketToClaim)
                }
              }}
            >
              Confirm Claim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        url={typeof window !== "undefined" ? window.location.origin : ""}
        title={event.event_name}
        description={event.hero_description || "Join us for this exciting event!"}
      />

      {event?.id && <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} eventId={event.id} />}

      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <TicketRegistrationWizard
            tickets={ticketsWithQuestions}
            onComplete={(responses) => submitTicketPurchase(responses)}
            onCancel={() => {
              setShowWizard(false)
              setShowTicketDialog(true)
            }}
          />
        </div>
      )}

      <Dialog open={showEditRegistrationDialog} onOpenChange={setShowEditRegistrationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Registration</DialogTitle>
            <DialogDescription>Update your ticket selection for this event</DialogDescription>
          </DialogHeader>
          {editMessage && (
            <div
              className={`rounded-lg p-3 text-sm ${
                editMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {editMessage.text}
            </div>
          )}
          <div className="space-y-4 py-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{ticket.name}</h3>
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    ${Number.parseFloat(ticket.price).toFixed(2)}
                    {Number.parseFloat(ticket.price) === 0 && " (Free)"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentQty = ticketQuantities[ticket.id] || 0
                      if (currentQty > 0) {
                        setTicketQuantities({
                          ...ticketQuantities,
                          [ticket.id]: currentQty - 1,
                        })
                      }
                    }}
                    disabled={!ticketQuantities[ticket.id] || ticketQuantities[ticket.id] === 0}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-semibold">{ticketQuantities[ticket.id] || 0}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTicketQuantities({
                        ...ticketQuantities,
                        [ticket.id]: (ticketQuantities[ticket.id] || 0) + 1,
                      })
                    }}
                    // Disable if ticket has limited quantity and max is reached
                    disabled={
                      ticket.quantity_available !== null &&
                      ticket.quantity_sold !== null &&
                      (ticketQuantities[ticket.id] || 0) >= ticket.quantity_available - ticket.quantity_sold
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditRegistrationDialog(false)
                setEditMessage(null)
                // Reset quantities to original purchase values when cancelling
                if (selectedTicketPurchase) {
                  setTicketQuantities({ [selectedTicketPurchase.ticket_id]: selectedTicketPurchase.quantity })
                }
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsUpdatingRegistration(true)
                setEditMessage(null)

                try {
                  // Find the selected ticket ID and quantity from the updated quantities
                  const updatedSelectedTicketId = Object.keys(ticketQuantities).find((id) => ticketQuantities[id] > 0)

                  if (!updatedSelectedTicketId) {
                    // If no tickets are selected after editing, this might be an error state or imply cancellation
                    // For now, let's assume at least one ticket must be selected if editing.
                    setEditMessage({ type: "error", text: "Please select at least one ticket" })
                    setIsUpdatingRegistration(false)
                    return
                  }

                  const updatedQuantity = ticketQuantities[updatedSelectedTicketId]

                  // Check if the selection has actually changed from the original purchase
                  if (
                    selectedTicketPurchase &&
                    selectedTicketPurchase.ticket_id === updatedSelectedTicketId &&
                    selectedTicketPurchase.quantity === updatedQuantity
                  ) {
                    setEditMessage({ type: "success", text: "No changes detected." })
                    setTimeout(() => {
                      setShowEditRegistrationDialog(false)
                      setEditMessage(null)
                    }, 1500)
                    setIsUpdatingRegistration(false)
                    return
                  }

                  const res = await fetch(`/api/events/${event.id}/ticket-purchases/${selectedTicketPurchase.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ticket_id: updatedSelectedTicketId,
                      quantity: updatedQuantity,
                    }),
                  })

                  const data = await res.json()

                  if (!res.ok) {
                    setEditMessage({ type: "error", text: data.error || "Failed to update registration" })
                    setIsUpdatingRegistration(false)
                    return
                  }

                  // Handle refund case
                  if (data.requiresRefund) {
                    setEditMessage({
                      type: "success",
                      text: data.message,
                    })
                    setTimeout(() => {
                      setShowEditRegistrationDialog(false)
                      setEditMessage(null)
                      fetchUserTicketPurchases() // Refresh user purchases
                    }, 3000)
                    setIsUpdatingRegistration(false)
                    return
                  }

                  // Handle additional payment case
                  if (data.requiresPayment) {
                    const balanceRes = await fetch(
                      `/api/events/${event.id}/ticket-purchases/${selectedTicketPurchase.id}/pay-balance`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ticket_id: updatedSelectedTicketId,
                          quantity: updatedQuantity,
                          balanceAmount: data.paymentAmount,
                        }),
                      },
                    )

                    const balanceData = await balanceRes.json()

                    if (!balanceRes.ok) {
                      setEditMessage({ type: "error", text: "Failed to create payment session" })
                      setIsUpdatingRegistration(false)
                      return
                    }

                    // Redirect to Stripe checkout
                    window.location.href = balanceData.url
                    return
                  }

                  // Same price update
                  setEditMessage({ type: "success", text: data.message })
                  setTimeout(() => {
                    setShowEditRegistrationDialog(false)
                    setEditMessage(null)
                    fetchUserTicketPurchases() // Refresh user purchases
                  }, 2000)
                } catch (error) {
                  // console.error("[v0] Error updating registration:", error) // removed debug logging
                  setEditMessage({ type: "error", text: "An error occurred. Please try again." })
                } finally {
                  setIsUpdatingRegistration(false)
                }
              }}
              disabled={isUpdatingRegistration}
              className="flex-1"
            >
              {isUpdatingRegistration ? "Updating..." : "Update Registration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
