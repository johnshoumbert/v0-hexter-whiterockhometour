"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { ProductOptionsModal } from "@/components/product-options-modal"
import { ShopOrderFormModal } from "@/components/shop-order-form-modal"
import { useCartStore } from "@/stores/cart-store"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

interface OnboardingWizardProps {
  eventId: string
}

const STEPS = ["tickets", "voting", "shop", "gallery"] as const
type StepType = (typeof STEPS)[number]

export function OnboardingWizard({ eventId }: OnboardingWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<StepType>("tickets")
  const [event, setEvent] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [polls, setPolls] = useState<any[]>([])
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [shopItems, setShopItems] = useState<any[]>([])
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({})
  const [ticketQuestions, setTicketQuestions] = useState<Record<string, any[]>>({})
  const [ticketResponses, setTicketResponses] = useState<Record<string, Record<string, string | string[]>>>({})
  const [userVotes, setUserVotes] = useState<Record<string, string>>({})
  const [selectedShopItem, setSelectedShopItem] = useState<any>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const { addItem } = useCartStore()
  const [isVoting, setIsVoting] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const eventRes = await fetch(`/api/events/${eventId}`)
        const eventData = await eventRes.json()
        const eventObj = eventData.event || eventData
        setEvent(eventObj)

        const ticketsRes = await fetch(`/api/events/${eventId}/tickets`)
        const ticketsData = await ticketsRes.json()
        const ticketArray = Array.isArray(ticketsData) ? ticketsData : ticketsData?.tickets || []
        const activeTickets = ticketArray.filter((t: any) => t.is_active)
        setTickets(activeTickets)
        const quantities: Record<string, number> = {}
        activeTickets.forEach((t: any) => {
          quantities[t.id] = 0
        })
        setTicketQuantities(quantities)

        const ticketQuestionsData: Record<string, any[]> = {}
        await Promise.all(
          activeTickets.map(async (ticket: any) => {
            try {
              const res = await fetch(`/api/events/${eventId}/tickets/${ticket.id}/questions`)
              if (res.ok) {
                const questions = await res.json()
                ticketQuestionsData[ticket.id] = Array.isArray(questions) ? questions : []
              } else {
                ticketQuestionsData[ticket.id] = []
              }
            } catch (error) {
              ticketQuestionsData[ticket.id] = []
            }
          }),
        )
        setTicketQuestions(ticketQuestionsData)

        if (eventObj.enable_voting) {
          const pollsRes = await fetch(`/api/events/${eventId}/voting/polls`)
          const pollsData = await pollsRes.json()
          const pollArray = Array.isArray(pollsData) ? pollsData : pollsData?.polls || []
          const activePollsWithItems = await Promise.all(
            pollArray
              .filter((p: any) => p.is_active)
              .map(async (poll: any) => {
                const detailsRes = await fetch(`/api/events/${eventId}/voting/polls/${poll.id}`)
                const details = await detailsRes.json()
                return { ...poll, items: details.items || [] }
              }),
          )
          setPolls(activePollsWithItems)

          try {
            const votesRes = await fetch(`/api/events/${eventId}/voting/vote`)
            const votesData = await votesRes.json()
            const votesMap: Record<string, string> = {}
            votesData.votes.forEach((vote: any) => {
              votesMap[vote.poll_id] = vote.item_id
            })
            setUserVotes(votesMap)
          } catch (error) {
            console.error("Error fetching user votes:", error)
          }
        }

        if (eventObj.enable_gallery) {
          const galleryRes = await fetch(`/api/events/${eventId}/gallery`)
          const galleryData = await galleryRes.json()
          const galleryArray = Array.isArray(galleryData) ? galleryData : galleryData?.images || []
          setGalleryImages(galleryArray)
        }

        if (eventObj.enable_shop) {
          const shopRes = await fetch(`/api/events/${eventId}/shop/items`)
          const shopData = await shopRes.json()
          const shopArray = Array.isArray(shopData) ? shopData : shopData?.items || []
          setShopItems(shopArray.filter((item: any) => item.is_active))
        }
      } catch (error) {
        console.error("Error loading onboarding data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [eventId])

  const getAvailableSteps = (): StepType[] => {
    const available: StepType[] = []
    if (tickets.length > 0) available.push("tickets")
    if (event?.enable_voting && polls.length > 0) available.push("voting")
    if (event?.enable_shop && shopItems.length > 0) available.push("shop")
    if (event?.enable_gallery && galleryImages.length > 0) available.push("gallery")
    return available
  }

  const canProceedFromTickets = () => {
    // Check if any tickets are selected
    const selectedTickets = Object.entries(ticketQuantities).filter(([_, qty]) => qty > 0)
    if (selectedTickets.length === 0) return true // Can skip if no tickets selected

    // Check if all required questions are answered for selected tickets
    for (const [ticketId, qty] of selectedTickets) {
      const questions = ticketQuestions[ticketId] || []
      const requiredQuestions = questions.filter((q) => q.is_required)

      for (const question of requiredQuestions) {
        const response = ticketResponses[ticketId]?.[question.id]
        if (!response || (Array.isArray(response) && response.length === 0)) {
          return false
        }
      }
    }
    return true
  }

  const handleNext = () => {
    if (currentStep === "tickets" && !canProceedFromTickets()) {
      alert("Please answer all required questions for selected tickets")
      return
    }

    const steps = getAvailableSteps()
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    } else {
      handleFinish()
    }
  }

  const handleBack = () => {
    const steps = getAvailableSteps()
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleSkip = () => {
    router.push("/")
  }

  const castVote = async (pollId: string, itemId: string) => {
    setIsVoting(pollId)
    try {
      await fetch(`/api/events/${eventId}/voting/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll_id: pollId, item_id: itemId }),
      })
      setUserVotes({ ...userVotes, [pollId]: itemId })
    } catch (error) {
      console.error("Error casting vote:", error)
    } finally {
      setIsVoting(null)
    }
  }

  const handleAddToCart = (item: any) => {
    // Check if item is an order form type
    if (item.category === "order_form") {
      setSelectedShopItem(item)
      setShowOrderModal(true)
      return
    }

    // Check if item has options
    if (item.options && item.options.length > 0) {
      setSelectedShopItem(item)
      setShowOptionsModal(true)
    } else {
      // No options, add directly to cart
      addItem(item, 1)
    }
  }

  const handleAddToCartWithOptions = (selectedOptions: Record<string, string | string[]>, quantity: number) => {
    if (!selectedShopItem) return
    addItem(selectedShopItem, quantity, selectedOptions)
    setShowOptionsModal(false)
    setSelectedShopItem(null)
  }

  const handleOrderFormSubmit = (formData: Record<string, string>, quantity: number) => {
    if (!selectedShopItem) return
    addItem(selectedShopItem, quantity, formData)
    setShowOrderModal(false)
    setSelectedShopItem(null)
  }

  const renderStep = () => {
    switch (currentStep) {
      case "tickets":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Get Your Tickets</h2>
              <p className="text-muted-foreground">Choose your ticket type and quantity</p>
            </div>
            {loading ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No tickets available at this time.</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {tickets.map((ticket) => {
                  const questions = ticketQuestions[ticket.id] || []
                  const hasQuantity = (ticketQuantities[ticket.id] || 0) > 0

                  return (
                    <div key={ticket.id} className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
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

                      {hasQuantity && questions.length > 0 && (
                        <div className="ml-4 space-y-4 rounded-lg border border-muted p-4 bg-muted/30">
                          <h4 className="font-semibold text-sm">Registration Questions</h4>
                          {questions.map((question, index) => (
                            <div key={question.id} className="space-y-2">
                              <Label className="text-sm">
                                {index + 1}. {question.question_text}
                                {question.is_required && <span className="text-destructive ml-1">*</span>}
                              </Label>

                              {question.question_type === "text" && (
                                <Textarea
                                  placeholder="Your answer"
                                  value={(ticketResponses[ticket.id]?.[question.id] as string) || ""}
                                  onChange={(e) => updateTicketResponse(ticket.id, question.id, e.target.value)}
                                  className="min-h-[80px]"
                                />
                              )}

                              {question.question_type === "select" && question.options && (
                                <RadioGroup
                                  value={(ticketResponses[ticket.id]?.[question.id] as string) || ""}
                                  onValueChange={(value) => updateTicketResponse(ticket.id, question.id, value)}
                                >
                                  {question.options.map((option: string) => (
                                    <div key={option} className="flex items-center space-x-2">
                                      <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                      <Label
                                        htmlFor={`${question.id}-${option}`}
                                        className="font-normal cursor-pointer text-sm"
                                      >
                                        {option}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              )}

                              {question.question_type === "multiselect" && question.options && (
                                <div className="space-y-2">
                                  {question.options.map((option: string) => {
                                    const checked = (
                                      (ticketResponses[ticket.id]?.[question.id] as string[]) || []
                                    ).includes(option)
                                    return (
                                      <div key={option} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${ticket.id}-${question.id}-${option}`}
                                          checked={checked}
                                          onCheckedChange={() =>
                                            toggleMultiselectOption(ticket.id, question.id, option)
                                          }
                                        />
                                        <Label
                                          htmlFor={`${ticket.id}-${question.id}-${option}`}
                                          className="font-normal cursor-pointer text-sm"
                                        >
                                          {option}
                                        </Label>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      case "voting":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Cast Your Vote</h2>
              <p className="text-muted-foreground">Help us make decisions for our community</p>
            </div>
            <div className="space-y-6">
              {polls.map((poll) => (
                <Card key={poll.id}>
                  <CardHeader>
                    <CardTitle className="text-xl">{poll.title}</CardTitle>
                    {poll.description && <CardDescription>{poll.description}</CardDescription>}
                    {userVotes[poll.id] && (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium mt-2">
                        <CheckCircle2 className="h-4 w-4" />
                        You've voted! You can change your vote anytime.
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {poll.items?.map((item: any) => {
                        const isSelected = userVotes[poll.id] === item.id
                        const isVotingThis = isVoting === poll.id

                        return (
                          <button
                            key={item.id}
                            onClick={() => castVote(poll.id, item.id)}
                            disabled={isVotingThis}
                            className={cn(
                              "relative group rounded-lg border-2 transition-all text-left overflow-hidden",
                              "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-muted hover:border-primary/50",
                            )}
                          >
                            {item.image_url && (
                              <div className="relative w-full aspect-video bg-muted/20 overflow-hidden">
                                <img
                                  src={item.image_url || "/placeholder.svg"}
                                  alt={item.title}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-primary" />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="p-4 space-y-2">
                              <h3 className="font-semibold">{item.title}</h3>
                              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                              {isSelected && (
                                <div className="flex items-center gap-1 text-sm font-medium text-primary pt-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Your Vote
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case "shop":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Shop Our Items</h2>
              <p className="text-muted-foreground">Browse exclusive merchandise</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shopItems.map((item) => (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                  onClick={() => handleAddToCart(item)}
                >
                  {item.image_url && (
                    <div className="relative w-full h-40">
                      <Image
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">${item.price}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Button className="w-full" onClick={() => router.push("/shop")}>
              Shop Now
            </Button>
            <ProductOptionsModal
              item={selectedShopItem}
              open={showOptionsModal}
              onClose={() => {
                setShowOptionsModal(false)
                setSelectedShopItem(null)
              }}
              onAddToCart={handleAddToCartWithOptions}
            />
            <ShopOrderFormModal
              item={selectedShopItem}
              open={showOrderModal}
              onClose={() => {
                setShowOrderModal(false)
                setSelectedShopItem(null)
              }}
              onSubmit={handleOrderFormSubmit}
            />
          </div>
        )

      case "gallery":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Explore Our Gallery</h2>
              <p className="text-muted-foreground">Photos from our community</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryImages.map((image) => (
                <Card
                  key={image.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push("/gallery")}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={image.image_url || "/placeholder.svg"}
                      alt={image.description || "Gallery image"}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Card>
              ))}
            </div>
            <Button className="w-full" onClick={() => router.push("/gallery")}>
              View Full Gallery
            </Button>
          </div>
        )
    }
  }

  const handleFinish = () => {
    // Logic to handle finishing the onboarding process
    router.push("/")
  }

  const updateTicketResponse = (ticketId: string, questionId: string, value: string | string[]) => {
    setTicketResponses({
      ...ticketResponses,
      [ticketId]: {
        ...(ticketResponses[ticketId] || {}),
        [questionId]: value,
      },
    })
  }

  const toggleMultiselectOption = (ticketId: string, questionId: string, option: string) => {
    const currentResponses = (ticketResponses[ticketId]?.[questionId] as string[]) || []
    const newResponses = currentResponses.includes(option)
      ? currentResponses.filter((o) => o !== option)
      : [...currentResponses, option]
    updateTicketResponse(ticketId, questionId, newResponses)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 border-b-2 border-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const steps = getAvailableSteps()
  if (steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>No onboarding steps available at this time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Welcome to {event?.name}</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentIndex + 1} of {steps.length}
            </span>
          </div>
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-all ${
                  index < currentIndex ? "bg-primary" : index === currentIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-4">{renderStep()}</CardHeader>
        </Card>

        <div className="flex gap-3 justify-between">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentIndex === 0}
              className="gap-2 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <Button onClick={handleNext} className="gap-2">
            {currentIndex === steps.length - 1 ? (
              <>
                Finish <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Next <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
