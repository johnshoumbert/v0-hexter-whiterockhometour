"use client"

import { Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useEvent } from "@/contexts/event-context"
import { useEffect, useState } from "react"

export default function ComingSoonPage() {
  const { event } = useEvent()
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  useEffect(() => {
    if (!event?.go_live_date) return

    const calculateTimeRemaining = () => {
      const now = new Date()
      const goLiveDate = new Date(event.go_live_date!)
      const diff = goLiveDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining("Event is live!")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [event?.go_live_date])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {event?.coming_soon_banner_url && (
        <div className="absolute inset-0 z-0">
          <img
            src={event.coming_soon_banner_url || "/placeholder.svg"}
            alt="Coming Soon"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
      )}

      <Card className="max-w-3xl w-full z-10 relative">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="mb-8">
            {event?.logo_image_url && (
              <div className="mb-6">
                <img
                  src={event.logo_image_url || "/placeholder.svg"}
                  alt={event.event_name || "Event Logo"}
                  className="h-24 mx-auto object-contain"
                />
              </div>
            )}
            <Clock className="h-20 w-20 mx-auto text-primary mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              {event?.event_name || "Event"} Coming Soon
            </h1>

            {event?.coming_soon_description ? (
              <div
                className="text-lg text-muted-foreground mb-6 prose prose-sm dark:prose-invert max-w-none mx-auto"
                dangerouslySetInnerHTML={{ __html: event.coming_soon_description }}
              />
            ) : (
              <p className="text-lg text-muted-foreground mb-6 text-pretty">
                This event hasn't gone live yet. Please check back soon!
              </p>
            )}

            {event?.go_live_date && (
              <div className="bg-muted p-6 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground mb-2">Event goes live in</p>
                <p className="text-3xl font-bold">{timeRemaining}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(event.go_live_date).toLocaleString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>

          {event?.support_email && (
            <div className="text-sm text-muted-foreground">
              <p>
                Questions? Contact us at{" "}
                <a href={`mailto:${event.support_email}`} className="text-primary hover:underline">
                  {event.support_email}
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
