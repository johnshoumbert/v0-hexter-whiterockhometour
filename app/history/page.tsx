'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ExternalLink, Home as HomeIcon } from 'lucide-react'

interface HomeCard {
  id: number
  year: number
  address: string
  sponsor: string
  sponsorLink?: string
  description: string
  image: string
  directions: string
}

interface Event {
  id: number
  event_name: string
  domain: string
  start_date: string
  end_date: string
}

interface Home {
  id: number
  event_id: number
  name: string
  address: string
  sponsor?: string
  short_description?: string
  full_description?: string
  item_images: string[]
  directions_url?: string
}

const homesData: HomeCard[] = [
  {
    id: 1,
    year: 2025,
    address: '720 PEAVY',
    sponsor: 'New Leaf Custom Homes',
    sponsorLink: '#',
    description: 'A stunning urban retreat designed for a vibrant, multi-generational family. This bold modern composition features a private courtyard with native plant garden, striking multi-level pool, and exquisite finishes throughout.',
    image: '/placeholder.svg?height=600&width=800',
    directions: '#'
  },
  {
    id: 2,
    year: 2025,
    address: '11737 ROGUE WAY',
    sponsor: 'Miranda Stauber Home – Real Estate and Design',
    sponsorLink: '#',
    description: 'An iconic 1961 Donald Speck design that seamlessly weaves around existing trees. With seven stepped levels connecting directly to the outdoors, fieldstone and concrete block create a highly textural backdrop.',
    image: '/placeholder.svg?height=600&width=800',
    directions: '#'
  },
  {
    id: 3,
    year: 2025,
    address: '935 BRIDGET DRIVE',
    sponsor: 'McBride Booth Real Estate',
    sponsorLink: '#',
    description: 'A remarkable renovation blending modern amenities with deep connection to nature. Contemporary towers engage the sloped site while custom white oak cabinetry adds warmth and character throughout.',
    image: '/placeholder.svg?height=600&width=800',
    directions: '#'
  },
  {
    id: 4,
    year: 2025,
    address: '8634 SANTA CLARA',
    sponsor: 'David Collier Realtor Group',
    sponsorLink: '#',
    description: 'Architect Lou Simmons honors the spirit of Little Forest Hills. Open-concept living meanders around a sculptural elm tree, creating a courtyard reveal that provides natural light and warmth.',
    image: '/placeholder.svg?height=600&width=800',
    directions: '#'
  },
  {
    id: 5,
    year: 2025,
    address: '6634 YOSEMITE',
    sponsor: 'Jennifer Rice, Realtor – Heather Guild Group / Compass',
    sponsorLink: '#',
    description: 'Architect Laura Juarez Baggett crafted this home as a dream fulfilled for a spirited couple. Daily living spaces on the main level open to a tranquil private lake with cherished mature tree views.',
    image: '/placeholder.svg?height=600&width=800',
    directions: '#'
  },
  {
    id: 6,
    year: 2006,
    address: '10226 VINEMONT ST',
    sponsor: 'Originally featured in 2006',
    description: 'A remarkable return to the tour from the inaugural White Rock Home Tour. Nestled under mature trees, this Ju-Nel home features a serene courtyard and signature Great Room with vaulted ceiling.',
    image: '/placeholder.svg?height=600&width=800',
    directions: '#'
  }
]

const historyTimeline = [
  {
    year: 2006,
    title: 'Inaugural Tour',
    description: 'The White Rock Home Tour was founded as a fundraiser for Hexter Elementary, showcasing magnificent mid-century and modern homes near White Rock Lake.'
  },
  {
    year: 2010,
    title: 'Preservation Recognition',
    description: '10226 Vinemont Street received the prestigious AIA 25-Year Award for thoughtful preservation and expansion of original design.'
  },
  {
    year: 2023,
    title: 'Continued Legacy',
    description: 'Featured the Van Dyke home, another exemplary Donald Speck design, reinforcing our commitment to architectural preservation.'
  },
  {
    year: 2025,
    title: '17th Annual Tour',
    description: 'Celebrating nearly two decades of showcasing exceptional architecture and supporting Hexter Elementary PTA.'
  }
]

export default function HistoryPage() {
  const [expandedHome, setExpandedHome] = useState<number | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [eventHomes, setEventHomes] = useState<{ [key: number]: Home[] }>({})
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingHomes, setLoadingHomes] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      
      // Filter events to only show previous years (not current year)
      const currentYear = new Date().getFullYear()
      const pastEvents = data.events.filter((event: Event) => {
        const eventYear = new Date(event.start_date).getFullYear()
        return eventYear < currentYear
      })
      
      setEvents(pastEvents)
    } catch (error) {
      console.error('[v0] Error fetching events:', error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const fetchEventHomes = async (eventId: number) => {
    if (eventHomes[eventId]) return // Already loaded

    setLoadingHomes((prev) => ({ ...prev, [eventId]: true }))
    try {
      const response = await fetch(`/api/events/${eventId}/homes`)
      const homes = await response.json()
      setEventHomes((prev) => ({ ...prev, [eventId]: homes }))
    } catch (error) {
      console.error('[v0] Error fetching homes for event:', eventId, error)
    } finally {
      setLoadingHomes((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  const getEventYear = (event: Event) => {
    return new Date(event.start_date).getFullYear()
  }

  const getEventDomain = (event: Event, homeId?: number) => {
    // Extract the base domain pattern (e.g., "whiterock" from "whiterock-2025")
    const baseDomain = event.domain.replace(/-\d{4}$/, '')
    const year = getEventYear(event)
    const domain = `${baseDomain}-${year}`
    
    if (homeId) {
      return `https://${domain}.ourneighborhoodtour.com/homes/${homeId}`
    }
    return `https://${domain}.ourneighborhoodtour.com`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-5xl md:text-6xl font-serif text-slate-900 mb-4 text-balance">
            Our History
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto text-balance">
            Since 2006, the White Rock Home Tour has celebrated exceptional architecture and supported Hexter Elementary through showcasing magnificent modern homes.
          </p>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif text-slate-900 mb-16 text-center">
            Key Milestones
          </h2>
          
          <div className="space-y-12">
            {historyTimeline.map((item, index) => (
              <div key={index} className="flex gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-amber-700 mt-2"></div>
                  {index < historyTimeline.length - 1 && (
                    <div className="w-1 h-24 bg-amber-200 my-2"></div>
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="text-2xl font-serif text-amber-900 mb-2">
                    {item.year}
                  </h3>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">
                    {item.title}
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the Tour Section */}
      <section className="py-20 px-4 md:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif text-slate-900 mb-8 text-center">
            About the Tour
          </h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-slate-700 leading-relaxed mb-6">
              The White Rock Home Tour was founded in 2006 as a fundraiser for Hexter Elementary (a public school in Dallas ISD) near White Rock Lake. Each year, the tour showcases magnificent mid-century and new modern homes, celebrating architectural excellence and the dedication of preservation-minded homeowners.
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              Our homes are thoughtfully curated to showcase diverse architectural styles, from iconic mid-century designs to contemporary modern creations. Each home tells a unique story of design excellence, craftsmanship, and the vision of talented architects and builders.
            </p>
            <p className="text-slate-700 leading-relaxed">
              By participating in the tour, you support vital initiatives at Hexter Elementary and celebrate the architectural heritage that makes our community special.
            </p>
          </div>
        </div>
      </section>

      {/* Previous Years' Events Section */}
      <section className="py-20 px-4 md:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-serif text-slate-900 mb-4 text-center">
            Previous Year Events
          </h2>
          <p className="text-center text-slate-600 mb-12 text-lg">
            Browse homes from previous White Rock Home Tours
          </p>

          {loadingEvents ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No previous events found.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {events.map((event) => {
                const year = getEventYear(event)
                const homes = eventHomes[event.id] || []
                
                return (
                  <AccordionItem
                    key={event.id}
                    value={`event-${event.id}`}
                    className="border rounded-lg bg-white shadow-sm"
                  >
                    <AccordionTrigger
                      className="px-6 py-4 hover:no-underline"
                      onClick={() => fetchEventHomes(event.id)}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="bg-amber-100 text-amber-900 font-bold text-lg px-4 py-2 rounded">
                          {year}
                        </div>
                        <div>
                          <h3 className="text-xl font-serif text-slate-900">
                            {event.event_name}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {new Date(event.start_date).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      {loadingHomes[event.id] ? (
                        <div className="text-center py-8">
                          <p className="text-slate-600">Loading homes...</p>
                        </div>
                      ) : homes.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-slate-600">No homes found for this event.</p>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {homes.map((home) => {
                            const mainImage = home.item_images?.[0] || '/placeholder.svg?height=300&width=400'
                            
                            return (
                              <Card key={home.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <div className="aspect-video bg-slate-200 relative">
                                  <Image
                                    src={mainImage}
                                    alt={home.name || home.address}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="p-4">
                                  <h4 className="font-serif text-lg text-slate-900 mb-1">
                                    {home.name || home.address}
                                  </h4>
                                  {home.address && home.name && (
                                    <p className="text-sm text-slate-600 mb-2">{home.address}</p>
                                  )}
                                  {home.sponsor && (
                                    <p className="text-xs text-slate-500 mb-3">
                                      Sponsored by {home.sponsor}
                                    </p>
                                  )}
                                  {home.short_description && (
                                    <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                                      {home.short_description}
                                    </p>
                                  )}
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-amber-700 text-amber-700 hover:bg-amber-50"
                                  >
                                    <a
                                      href={getEventDomain(event, home.id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2"
                                    >
                                      View Event
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      </section>

      {/* Featured Homes Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-serif text-slate-900 mb-4 text-center">
            Featured Homes (2025)
          </h2>
          <p className="text-center text-slate-600 mb-16 text-lg">
            Discover the magnificent homes featured in the current tour
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {homesData.map((home) => (
              <Card
                key={home.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setExpandedHome(expandedHome === home.id ? null : home.id)}
              >
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  <Image
                    src={home.image}
                    alt={home.address}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-2xl font-serif text-slate-900">
                      {home.address}
                    </h3>
                    <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded">
                      {home.year}
                    </span>
                  </div>
                  
                  {home.sponsor && (
                    <p className="text-sm text-slate-600 mb-4">
                      Sponsored by{' '}
                      {home.sponsorLink ? (
                        <a href={home.sponsorLink} className="text-amber-700 hover:underline font-medium">
                          {home.sponsor}
                        </a>
                      ) : (
                        <span className="font-medium">{home.sponsor}</span>
                      )}
                    </p>
                  )}

                  <p className={`text-slate-700 leading-relaxed ${expandedHome !== home.id ? 'line-clamp-2' : ''}`}>
                    {home.description}
                  </p>

                  <div className="mt-4 flex gap-3">
                    {home.directions && (
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 border-slate-300 hover:bg-slate-50"
                      >
                        <a href={home.directions}>Get Directions</a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedHome(expandedHome === home.id ? null : home.id)
                      }}
                      className="text-amber-700 hover:bg-amber-50"
                    >
                      {expandedHome === home.id ? 'Show Less' : 'Show More'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-amber-900 to-amber-800 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-serif mb-6">
            Experience It Yourself
          </h2>
          <p className="text-lg text-amber-50 mb-8 text-balance">
            Join us for the White Rock Home Tour and experience these architectural treasures firsthand while supporting Hexter Elementary.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-white text-amber-900 hover:bg-amber-50"
            >
              <Link href="/tickets">Get Your Tickets</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-amber-900"
            >
              <Link href="/contact">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
