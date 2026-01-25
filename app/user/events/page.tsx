"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, ExternalLink } from "lucide-react"

interface Event {
  id: string
  event_name: string
  domain: string
  start_date: string | null
  end_date: string | null
  go_live_date: string | null
  goal: string | null
  logo_image_url: string | null
  hero_image_url: string | null
  created_at: string
  organization_name: string | null
  user_role: string
}

export default function EventsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user])

  const fetchEvents = async () => {
    try {
      console.log("[v0] Fetching events...")
      const response = await fetch("/api/users/me/events")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Events fetched:", data.events)
        setEvents(data.events)
      } else {
        console.error("[v0] Failed to fetch events, status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500">Admin</Badge>
      case "member":
        return <Badge className="bg-blue-500">Member</Badge>
      case "participant":
        return <Badge variant="secondary">Participant</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getEventStatus = (event: Event) => {
    const now = new Date()
    const startDate = event.start_date ? new Date(event.start_date) : null
    const endDate = event.end_date ? new Date(event.end_date) : null

    if (endDate && endDate < now) {
      return <Badge variant="secondary">Ended</Badge>
    }
    if (startDate && startDate > now) {
      return <Badge variant="outline">Upcoming</Badge>
    }
    return <Badge className="bg-green-500">Active</Badge>
  }

  const getEventUrl = (event: Event) => {
    // If domain is localhost, use the current hostname structure
    if (event.domain === "localhost") {
      // Use the current window.location.hostname structure
      // Replace the project subdomain with the event subdomain if needed
      const currentHost = typeof window !== "undefined" ? window.location.hostname : ""

      // If we're on a vusercontent.net preview domain, use that
      if (currentHost.includes("vusercontent.net")) {
        return `https://${currentHost}`
      }

      // Otherwise use NEXT_PUBLIC_APP_URL or fallback to relative URL
      return process.env.NEXT_PUBLIC_APP_URL || ""
    }

    // Use the event's domain directly
    return `https://${event.domain}`
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="text-muted-foreground">Events you're a member of, admin for, or have participated in</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No events yet</p>
            <p className="text-sm text-muted-foreground">Join or create an event to get started</p>
            <Button className="mt-4" asChild>
              <Link href="/create-auction">Create Event</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              {event.hero_image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={event.hero_image_url || "/placeholder.svg"}
                    alt={event.event_name}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{event.event_name}</CardTitle>
                    {event.organization_name && (
                      <CardDescription className="truncate">{event.organization_name}</CardDescription>
                    )}
                  </div>
                  {event.logo_image_url && (
                    <img
                      src={event.logo_image_url || "/placeholder.svg"}
                      alt="Logo"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  )}
                </div>
                <div className="flex gap-2 flex-wrap pt-2">
                  {getEventStatus(event)}
                  {getRoleBadge(event.user_role)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.start_date && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Start: </span>
                    <span>{new Date(event.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {event.end_date && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">End: </span>
                    <span>{new Date(event.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                {event.goal && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Goal: </span>
                    <span className="font-semibold">${Number(event.goal).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {event.user_role === "admin" && (
                    <Button size="sm" asChild className="flex-1">
                      <Link href={`${getEventUrl(event)}/admin`} target="_blank">
                        Admin Panel
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild className="flex-1 bg-transparent">
                    <Link href={getEventUrl(event)} target="_blank">
                      View Event
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
