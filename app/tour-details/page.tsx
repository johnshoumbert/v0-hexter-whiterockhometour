'use client'

import { useState, useEffect } from 'react'
import { useEvent } from '@/contexts/event-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, MapPin, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function TourDetailsPage() {
  const { event } = useEvent()
  const [heroImage, setHeroImage] = useState<string>('https://ubsxwry7ayqkssqp.public.blob.vercel-storage.com/wrth-details-hero-ftxV0yRz3Xh5u0wqHzgWxtaEYb3fsM')

  useEffect(() => {
    const fetchHeroImage = async () => {
      if (!event?.id) return

      try {
        const response = await fetch(`/api/events/${event.id}/settings?page=details&object=details_hero`)
        if (response.ok) {
          const data = await response.json()
          if (data.length > 0 && data[0].value) {
            setHeroImage(data[0].value)
          }
        }
      } catch (error) {
        console.error('[v0] Error fetching hero image:', error)
      }
    }

    fetchHeroImage()
  }, [event?.id])

  return (
    <div className="min-h-screen">
      {/* Hero Section with Split Layout */}
      <section className="relative">
        <div className="grid lg:grid-cols-2 min-h-[600px] lg:min-h-[800px]">
          {/* Left Side - Content */}
          <div className="bg-background px-6 md:px-12 lg:px-16 py-12 lg:py-16 flex items-center">
            <div className="w-full max-w-xl">
              <div className="space-y-8">
                {/* What */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 uppercase">What:</h2>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground/90 leading-relaxed">
                      It's the 17th annual White Rock Home Tour, a self-guided tour showcasing six mid-century and new modern homes
                    </p>
                  </div>
                </div>

                {/* When */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 uppercase">When:</h2>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground/90 leading-relaxed">
                      Saturday, April 26 and Sunday, April 27, 2025. The 6 tour homes open at 12 noon and close at 5 pm sharp both days.
                    </p>
                  </div>
                </div>

                {/* Where */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 uppercase">Where:</h2>
                  <div className="flex gap-3 mb-4">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground/90 leading-relaxed">
                      White Rock Lake area in East Dallas
                    </p>
                  </div>
                  <Link href="/tour-map">
                    <Button variant="outline" className="border-2 border-foreground hover:bg-foreground hover:text-background uppercase font-bold">
                      Click for the tour map
                    </Button>
                  </Link>
                </div>

                {/* Why */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 uppercase">Why:</h2>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground/90 leading-relaxed">
                      100% proceeds benefit DISD's Hexter Elementary to bridge the budget gap and provide much-needed resources for students and teachers
                    </p>
                  </div>
                </div>

                {/* Cost */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 uppercase">Cost:</h2>
                  <div className="flex gap-3 mb-6">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground/90 leading-relaxed">
                      Tickets are $35 per person (ages 13 and up). Children 12 and under are free.
                    </p>
                  </div>
                  <Link href="/tickets">
                    <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 uppercase font-bold">
                      Click to buy your tickets now
                    </Button>
                  </Link>
                  <p className="text-sm text-foreground/70 mt-6 leading-relaxed">
                    You can also purchase tickets using your mobile device at each home during tour weekend for $35 each.{' '}
                    <strong>We can not accept cash.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Hero Image */}
          <div className="relative bg-muted">
            {heroImage ? (
              <Image
                src={heroImage}
                alt="Tour Details Hero"
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>
        </div>
      </section>

      {/* More Info Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4 uppercase">More About Tickets</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Tickets are good for either or both days.</li>
                  <li>• Each tour home may be visited only once.</li>
                  <li>• The tour homes may be visited in any order.</li>
                  <li>• You may purchase tickets during tour weekend at any tour home using your mobile device.</li>
                  <li>• WE CAN NOT ACCEPT CASH FOR TICKET SALES.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4 uppercase">Change in Plans?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  All sales are final and no refunds will be provided. All ticket money is donated directly to Hexter Elementary School.
                </p>

                <h3 className="text-lg font-bold mb-4 uppercase">Children</h3>
                <p className="text-sm text-muted-foreground">
                  Children 12 and under are free and do not need tickets. Children under 18 must always be accompanied by an adult. Please keep a very watchful eye on your children inside the tour homes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Frequently asked questions</h2>

          <div className="space-y-4">
            <FAQItem question="Is photography allowed?">
              Sorry, no photography is allowed inside the tour homes.
            </FAQItem>

            <FAQItem question="Are pets allowed?">
              We love your furry family member more than anyone, but PLEASE LEAVE THEM AT HOME. No pets are allowed on the White Rock Home Tour.
            </FAQItem>

            <FAQItem question="This is my first time on a home tour. How does it work?">
              This is a self-guided home tour. You may visit the homes in any order. Park safely, then walk to the home and you will be greeted by volunteers who will take your ticket and welcome you into the home. Docents are situated throughout the homes to share information about the architecture, interior design, etc.
            </FAQItem>

            <FAQItem question="What's the proper etiquette for a home tour?">
              Please see "home tour attendee" guidelines below for our etiquette rules. Thank you tour patrons for helping us have a smooth event this year!
            </FAQItem>

            <FAQItem question="Where can tour patrons get a snack or drink?">
              Tour patrons can visit our "Spirit Day Sponsors" during the tour and 10% of sales benefits the Hexter Elementary PTA when you use the code "WHITE ROCK HOME TOUR". On Saturday 4/26 (all day) please visit One90 Smoked Meats and on Sunday 4/27 from 6 to 10 pm please visit goodfriend burger house. Thank you for your support!
            </FAQItem>
          </div>
        </div>
      </section>

      {/* Guidelines Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Home Tour Attendee Guidelines</h2>

          <Card>
            <CardContent className="pt-8">
              <ul className="space-y-3 text-muted-foreground">
                <li>* No photographs are allowed inside the home.</li>
                <li>* Please remove shoes or wear booties provided at each featured home.</li>
                <li>* Turn off or mute cell phones while in the homes. Please take all calls outside.</li>
                <li>* No food or drinks may be taken inside the homes.</li>
                <li>* No smoking is allowed on the property or inside the homes.</li>
                <li>* Do not open closed drawers, refrigerators, closets, doors, or cabinets.</li>
                <li>* Do not enter areas that have been closed or blocked off.</li>
                <li>* Children under the age of 18 must always be accompanied by an adult.</li>
                <li>* No pets allowed.</li>
                <li>* No large bags or backpacks allowed.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function FAQItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardContent className="flex items-center justify-between py-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h3 className="text-lg font-semibold text-left">{question}</h3>
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6 text-muted-foreground">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
