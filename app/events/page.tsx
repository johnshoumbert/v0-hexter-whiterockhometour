import { Calendar, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { sql } from "@/lib/db"

async function getEvents() {
  try {
    const events = await sql`
      SELECT 
        es.*,
        t.primary_color,
        t.secondary_color,
        t.logo_url,
        COUNT(DISTINCT a.id) as auction_count
      FROM event_settings es
      LEFT JOIN themes t ON t.event_id = es.id
      LEFT JOIN auctions a ON a.event_id = es.id
      GROUP BY es.id, t.primary_color, t.secondary_color, t.logo_url
      ORDER BY es.start_date DESC
    `
    return events
  } catch (error) {
    console.error("[v0] Error fetching events:", error)
    return []
  }
}

export default async function EventsPage() {
  const events = await getEvents()

  // Separate events into upcoming and past
  const now = new Date()
  const upcomingEvents = events.filter((e) => new Date(e.end_date) >= now)
  const pastEvents = events.filter((e) => new Date(e.end_date) < now)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Charity Events</h1>
            <p className="text-lg md:text-xl opacity-90 text-pretty">
              Join us at our upcoming events and be part of something special. Together, we make a difference.
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
            <p className="text-muted-foreground">Mark your calendar and join us at these exciting events</p>
          </div>

          {upcomingEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No upcoming events at this time. Check back soon!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => {
                const startDate = new Date(event.start_date)
                const isLive = new Date(event.go_live_date) <= now

                return (
                  <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={event.hero_image_url || "/placeholder.svg?height=200&width=400"}
                        alt={event.event_name}
                        className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-4 right-4 bg-green-500">{isLive ? "Live Now" : "Upcoming"}</Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl">{event.event_name}</CardTitle>
                      <CardDescription>
                        {event.auction_count} auction {event.auction_count === 1 ? "item" : "items"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{startDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{event.domain}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href={`/events/${event.id}`}>View Event</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Past Events</h2>
              <p className="text-muted-foreground">See the impact we've made together</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {pastEvents.map((event) => {
                const startDate = new Date(event.start_date)

                return (
                  <Card key={event.id} className="overflow-hidden">
                    <div className="md:flex">
                      <div className="md:w-1/3 aspect-video md:aspect-square relative overflow-hidden">
                        <img
                          src={event.hero_image_url || "/placeholder.svg?height=200&width=400"}
                          alt={event.event_name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="md:w-2/3">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-xl">{event.event_name}</CardTitle>
                            <Badge variant="secondary">Past</Badge>
                          </div>
                          <CardDescription>
                            {event.auction_count} auction {event.auction_count === 1 ? "item" : "items"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{startDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{event.domain}</span>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button asChild variant="outline" className="w-full bg-transparent">
                            <Link href={`/events/${event.id}`}>View Details</Link>
                          </Button>
                        </CardFooter>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Want to Host an Event?</h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Partner with us to create meaningful fundraising events for your cause. We provide the platform, you
                bring the passion.
              </p>
              <Button size="lg" asChild>
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
