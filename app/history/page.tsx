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
  application?: string
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
      
      // Filter events to only show previous years (not current year) and where application = 'hometour'
      const currentYear = new Date().getFullYear()
      const pastEvents = data.events.filter((event: Event) => {
        const eventYear = new Date(event.start_date).getFullYear()
        return eventYear < currentYear && event.application === 'hometour'
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
      {/* OUR STORY Hero Section */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-black">
        {/* Background Image */}
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-297OS6BaYG02CZGnaMs7ie5Jp7RcTj.png"
          alt="White Rock Home Tour Story"
          fill
          className="object-cover opacity-40"
          priority
        />
        
        {/* Overlay Content */}
        <div className="relative z-10 text-center px-4 text-white">
          <h1 className="text-6xl md:text-7xl font-serif mb-4 text-balance">
            OUR STORY
          </h1>
          <p className="text-2xl md:text-3xl font-serif italic text-amber-100">
            Origins of the White Rock Home Tour
          </p>
        </div>
      </section>

      {/* About the Tour Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif text-slate-900 mb-8 text-center">
            About the Tour
          </h2>
          <div className="space-y-6">
            <p className="text-lg text-slate-700 leading-relaxed">
              The White Rock Home Tour was founded in 2006 as a fundraiser for Hexter Elementary (a public school in Dallas ISD) near White Rock Lake. Each year, the tour showcases magnificent mid-century and new modern homes, celebrating architectural excellence and the dedication of preservation-minded homeowners.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              Our homes are thoughtfully curated to showcase diverse architectural styles, from iconic mid-century designs to contemporary modern creations. Each home tells a unique story of design excellence, craftsmanship, and the vision of talented architects and builders.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              By participating in the tour, you support vital initiatives at Hexter Elementary and celebrate the architectural heritage that makes our community special.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Quote Section */}
      <section className="py-20 px-4 md:px-8 bg-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 items-center">
            {/* Image */}
            <div className="relative h-96 md:h-full min-h-[400px]">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-uuDKgUrMa7pGxmliJ1yzVZ9fhHmotv.png"
                alt="Christine Rogers Founder"
                fill
                className="object-cover rounded-lg"
              />
            </div>
            
            {/* Quote */}
            <div className="flex flex-col justify-center">
              <blockquote className="space-y-6">
                <p className="text-xl italic text-slate-800 leading-relaxed">
                  "White Rock Home Tour was conceived in 2006 to celebrate the untold story of two up and coming Dallas architects from the 1950's whose mid-century modern home designs shaped the northeast side of White Rock Lake. The tour draws together a group of people who appreciate good design, who are drawn to White Rock Lake, and who support strong neighborhoods and the schools that serve them."
                </p>
                <div>
                  <p className="text-lg font-serif font-bold text-slate-900">
                    CHRISTINE ROGERS
                  </p>
                  <p className="text-slate-600">
                    Founder, White Rock Home Tour
                  </p>
                </div>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Our History - Detailed Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-serif text-slate-900 text-center mb-16 text-balance">
            THE WHITE ROCK HOME TOUR WAS CONCEIVED BY A SMALL GROUP OF HEXTER ELEMENTARY PARENTS WHO WERE INTERESTED IN MID-CENTURY ARCHITECTURE.
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="space-y-6">
              <p className="text-slate-700 leading-relaxed">
                These industrious parents found a way to combine their love of modern design and passion for supporting their neighborhood school in Old Lake Highlands.
              </p>
              <p className="text-slate-700 leading-relaxed">
                It was a fortunate coincidence that the Tour's founding parents were neighbors and lived on a lovely street graced with Ju-Nel homes. Designed by Lyle Rowley and Jack Wilson, the mid-century modern homes feature low horizontal flat roofs, open space, rather than traditional rooms, an appreciation of nature and a prominent use of glass, which leads to an abundance of natural light. The tour began as a showcase for the area's treasure trove of Ju-Nel Mid-Century Moderns (MCMs) and remains committed to providing tour-goers with access to some of the most interesting (and sometimes hidden) MCMs and new modern homes in the area.
              </p>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              <p className="text-slate-700 leading-relaxed">
                As an added bonus to enjoying the area's most beautiful modern home design, tour-goers have the satisfaction of knowing that every dollar spent on the tour goes to the Hexter Elementary PTA. Like the modern homes showcased by the WRHT, Hexter is a true gem of a DISD school.
              </p>
              <p className="text-slate-700 leading-relaxed">
                The school has won a coveted Blue Ribbon award and continues to be one of the highest performing elementary schools in the District and in Texas. The school serves a diverse population of students with a top-notch public education. Parent engagement at the school is exceptionally high and the White Rock Home Tour is one of our most significant fundraisers, allowing us to invest in needed campus improvements, technology and literacy. We love our school, and our WRHT, and are thankful to be a part of such a wonderful community that supports modern architecture and public education!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 px-4 md:px-8 bg-slate-50">
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
              className="border-white text-white hover:bg-amber-900"
            >
              <Link href="/contact">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
