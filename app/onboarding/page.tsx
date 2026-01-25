"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { useEvent } from "@/contexts/event-context"

export default function OnboardingPage() {
  const router = useRouter()
  const { event, isLoading: eventLoading } = useEvent()
  const [eventId, setEventId] = useState<string | null>(null)
  const [isLoadingEvent, setIsLoadingEvent] = useState(!event)

  useEffect(() => {
    if (event) {
      setEventId(event.id)
      setIsLoadingEvent(false)
      return
    }

    if (eventLoading) {
      return
    }

    if (!eventLoading && !event) {
      const cached = localStorage.getItem("current_event_id")
      if (cached) {
        setEventId(cached)
        setIsLoadingEvent(false)
      } else {
        const host = window.location.host.split(":")[0].toLowerCase()
        fetch(`/api/events/by-domain?host=${encodeURIComponent(host)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.event?.id) {
              setEventId(data.event.id)
              localStorage.setItem("current_event_id", data.event.id)
            }
          })
          .catch((err) => console.error("Failed to fetch event:", err))
          .finally(() => setIsLoadingEvent(false))
      }
    }
  }, [event, eventLoading])

  if (eventLoading || isLoadingEvent || !eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your onboarding experience...</p>
        </div>
      </div>
    )
  }

  return <OnboardingWizard eventId={eventId} />
}
