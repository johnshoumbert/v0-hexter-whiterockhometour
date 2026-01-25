"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, DollarSign, Package, Calendar, CheckCircle2, Clock, ChevronDown } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useEvent } from "@/contexts/event-context"

interface MonetaryDonation {
  id: string
  amount: number
  donor_name: string | null
  donor_email: string | null
  message: string | null
  status: string
  created_at: string
  event_name?: string
  event_id?: string
}

interface ItemDonation {
  id: string
  title: string
  description: string
  image_url: string | null
  min_bid: number
  status: string
  donor_name: string | null
  donor_email: string | null
  donor_phone: string | null
  donor_organization: string | null
  delivery_method: string | null
  created_at: string
  event_name?: string
  event_id?: string
}

export default function DonationsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event } = useEvent()
  const router = useRouter()
  const [monetaryDonations, setMonetaryDonations] = useState<MonetaryDonation[]>([])
  const [itemDonations, setItemDonations] = useState<ItemDonation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/user/donations")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchDonations()
    }
  }, [user])

  const fetchDonations = async () => {
    try {
      // Fetch monetary donations
      const moneyResponse = await fetch("/api/user/donations/money")
      if (moneyResponse.ok) {
        const data = await moneyResponse.json()
        setMonetaryDonations(data.donations || [])
      }

      // Fetch item donations
      const itemResponse = await fetch("/api/user/donations/items")
      if (itemResponse.ok) {
        const data = await itemResponse.json()
        setItemDonations(data.donations || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch donations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentEventId = event?.id
  const currentEventMoneyDonations = monetaryDonations.filter((d) => d.event_id === currentEventId)
  const otherEventMoneyDonations = monetaryDonations.filter((d) => d.event_id !== currentEventId)
  const currentEventItemDonations = itemDonations.filter((d) => d.event_id === currentEventId)
  const otherEventItemDonations = itemDonations.filter((d) => d.event_id !== currentEventId)

  const totalMonetaryAmount = monetaryDonations.reduce((sum, donation) => sum + donation.amount, 0)
  const totalItemsValue = itemDonations.reduce((sum, item) => sum + item.min_bid, 0)

  const renderMoneyDonations = (donations: MonetaryDonation[]) => {
    if (donations.length === 0) {
      return <p className="py-4 text-center text-sm text-muted-foreground">No monetary donations</p>
    }

    return (
      <div className="space-y-4">
        {donations.map((donation) => (
          <Card key={donation.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">${donation.amount.toFixed(2)}</CardTitle>
                  {donation.event_name && (
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {donation.event_name}
                    </CardDescription>
                  )}
                </div>
                <Badge variant={donation.status === "completed" ? "default" : "secondary"}>
                  {donation.status === "completed" ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <Clock className="mr-1 h-3 w-3" />
                  )}
                  {donation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {donation.message && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">Message:</p>
                    <p className="text-sm text-muted-foreground italic">"{donation.message}"</p>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Donated on {new Date(donation.created_at).toLocaleDateString()}</span>
                {donation.donor_name && <span>By {donation.donor_name}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderItemDonations = (items: ItemDonation[]) => {
    if (items.length === 0) {
      return <p className="py-4 text-center text-sm text-muted-foreground">No item donations</p>
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="p-0">
              {item.image_url && (
                <img
                  src={item.image_url || "/placeholder.svg"}
                  alt={item.title}
                  className="h-48 w-full rounded-t-lg object-cover"
                />
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                  <Badge
                    variant={item.status === "active" ? "default" : item.status === "pending" ? "secondary" : "outline"}
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                {item.event_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event:</span>
                    <span className="font-medium text-xs">{item.event_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Value:</span>
                  <span className="font-semibold">${item.min_bid.toFixed(2)}</span>
                </div>
                {item.donor_organization && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organization:</span>
                    <span className="font-medium text-xs">{item.donor_organization}</span>
                  </div>
                )}
                {item.delivery_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="text-xs">{item.delivery_method.split(",")[0]}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground">
                Submitted on {new Date(item.created_at).toLocaleDateString()}
              </div>

              {item.status === "pending" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Your item is pending review. We'll contact you soon!
                </div>
              )}
              {item.status === "active" && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-800 dark:text-green-200">
                  <CheckCircle2 className="inline h-3 w-3 mr-1" />
                  Your item is now live in the auction!
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Donations</h1>
        <p className="text-muted-foreground">Track your monetary and item donations across all events</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Money Donated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">${totalMonetaryAmount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{monetaryDonations.length} donation(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Donated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{itemDonations.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Est. value: ${totalItemsValue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">${(totalMonetaryAmount + totalItemsValue).toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Combined contribution</p>
          </CardContent>
        </Card>
      </div>

      {currentEventMoneyDonations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Monetary Donations - This Event</CardTitle>
            </div>
            <CardDescription>Your monetary donations for this event</CardDescription>
          </CardHeader>
          <CardContent>{renderMoneyDonations(currentEventMoneyDonations)}</CardContent>
        </Card>
      )}

      {otherEventMoneyDonations.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <div>
                      <CardTitle>Monetary Donations - Other Events</CardTitle>
                      <CardDescription>
                        Your monetary donations from other events ({otherEventMoneyDonations.length})
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>{renderMoneyDonations(otherEventMoneyDonations)}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {currentEventMoneyDonations.length === 0 && otherEventMoneyDonations.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Monetary Donations</CardTitle>
            </div>
            <CardDescription>Your monetary donations will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">No monetary donations yet</p>
          </CardContent>
        </Card>
      )}

      {currentEventItemDonations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Item Donations - This Event</CardTitle>
            </div>
            <CardDescription>Your donated items for this event</CardDescription>
          </CardHeader>
          <CardContent>{renderItemDonations(currentEventItemDonations)}</CardContent>
        </Card>
      )}

      {otherEventItemDonations.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <div>
                      <CardTitle>Item Donations - Other Events</CardTitle>
                      <CardDescription>
                        Your donated items from other events ({otherEventItemDonations.length})
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>{renderItemDonations(otherEventItemDonations)}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {currentEventItemDonations.length === 0 && otherEventItemDonations.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Item Donations</CardTitle>
            </div>
            <CardDescription>Your donated items will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">No item donations yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
