"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Ticket, Info, Heart, Share2, QrCode } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import Link from "next/link"

interface TicketPurchase {
  id: string
  quantity: number
  status: string
}

export function TicketStatusSection() {
  const { user } = useAuth()
  const { event } = useEvent()
  const [tickets, setTickets] = useState<TicketPurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalTickets, setTotalTickets] = useState(0)

  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!user?.id || !event?.id) return
      
      try {
        const response = await fetch(`/api/events/${event.id}/ticket-purchases`, {
          credentials: "include",
        })
        
        if (response.ok) {
          const data = await response.json()
          const userTickets = data.purchases?.filter((p: TicketPurchase) => p.status === "completed") || []
          setTickets(userTickets)
          setTotalTickets(userTickets.reduce((sum: number, t: TicketPurchase) => sum + t.quantity, 0))
        }
      } catch (error) {
        console.error("Error fetching user tickets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserTickets()
  }, [user?.id, event?.id])

  if (isLoading || totalTickets === 0) {
    return null
  }

  // Apply event theme colors with fallbacks
  const themeVars = {
    "--event-bg-color": "var(--event-bg-color, #fef3c7)",
    "--event-button-dark-bg": "var(--event-button-dark-bg, #000)",
  } as React.CSSProperties

  return (
    <div className="py-8 md:py-12 px-4" style={themeVars}>
      <style>{`
        .ticket-section-bg {
          background-color: var(--event-bg-color, #fef3c7);
        }
      `}</style>
      
      <div className="ticket-section-bg rounded-lg py-8 md:py-12 px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Ticket Status Card */}
          <Card className="bg-white border-0 shadow-sm mb-6">
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Ticket className="h-6 w-6 md:h-7 md:w-7" />
                <h3 className="text-lg md:text-xl font-bold">
                  You have {totalTickets} ticket{totalTickets !== 1 ? "s" : ""} for this event
                </h3>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/user/purchases">
                  <Button
                    variant="default"
                    size="lg"
                    className="font-bold"
                    style={{ backgroundColor: "var(--event-button-dark-bg, #000)" }}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Show QR Code
                  </Button>
                </Link>

                <Link href="/help">
                  <Button variant="outline" size="lg" className="font-bold">
                    <Info className="mr-2 h-4 w-4" />
                    Instructions
                  </Button>
                </Link>

                <Link href="/user/purchases">
                  <Button variant="outline" size="lg" className="font-bold">
                    Edit Registration
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Secondary Actions */}
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            <Link href="/donate" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
              <Button variant="ghost" size="sm" className="font-bold">
                <Heart className="mr-2 h-4 w-4" />
                Make a Donation
              </Button>
            </Link>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: event?.name || "White Rock Home Tour",
                    text: "Join me at the White Rock Home Tour!",
                    url: window.location.href,
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                }
              }}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Button variant="ghost" size="sm" className="font-bold">
                <Share2 className="mr-2 h-4 w-4" />
                Share Event
              </Button>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
