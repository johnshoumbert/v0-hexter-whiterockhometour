import { notFound } from "next/navigation"
import { Calendar, MapPin, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { sql } from "@/lib/db"

async function getEvent(id: string) {
  try {
    const eventResult = await sql`
      SELECT 
        es.*,
        t.primary_color,
        t.secondary_color,
        t.logo_url
      FROM event_settings es
      LEFT JOIN themes t ON t.event_id = es.id
      WHERE es.id = ${id}
      LIMIT 1
    `

    if (eventResult.length === 0) {
      return null
    }

    return eventResult[0]
  } catch (error) {
    console.error("[v0] Error fetching event:", error)
    return null
  }
}

async function getEventAuctions(eventId: string) {
  try {
    const auctions = await sql`
      SELECT *
      FROM auctions
      WHERE event_id = ${eventId}
      AND status = 'active'
      ORDER BY end_time ASC
      LIMIT 12
    `
    return auctions
  } catch (error) {
    console.error("[v0] Error fetching event auctions:", error)
    return []
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) {
    notFound()
  }

  const auctions = await getEventAuctions(id)
  const startDate = new Date(event.start_date)
  const endDate = new Date(event.end_date)
  const goLiveDate = new Date(event.go_live_date)
  const now = new Date()
  const isLive = goLiveDate <= now
  const hasEnded = endDate < now

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Hero Section */}
      <section className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={event.hero_image_url || "/placeholder.svg?height=400&width=1200"}
            alt={event.event_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-end pb-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={isLive ? "default" : hasEnded ? "secondary" : "outline"} className="text-sm">
                {hasEnded ? "Ended" : isLive ? "Live Now" : "Coming Soon"}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{event.event_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.domain}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Info */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Start Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{startDate.toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">{startDate.toLocaleTimeString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">End Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{endDate.toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">{endDate.toLocaleTimeString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auction Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{auctions.length}</p>
                <p className="text-sm text-muted-foreground">Available to bid</p>
              </CardContent>
            </Card>
          </div>

          {/* Auction Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Auction Items</h2>
                <p className="text-muted-foreground">Browse and bid on available items</p>
              </div>
              {auctions.length > 0 && (
                <Button asChild variant="outline">
                  <Link href="/auctions">
                    View All <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>

            {auctions.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No auction items available yet. Check back soon!</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {auctions.map((auction) => (
                  <Card key={auction.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={auction.image_url || "/placeholder.svg?height=300&width=300"}
                        alt={auction.title}
                        className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-1">{auction.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{auction.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Bid</p>
                          <p className="text-xl font-bold">${Number(auction.min_bid).toFixed(2)}</p>
                        </div>
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/auctions/${auction.slug || auction.id}`}>View Item</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
