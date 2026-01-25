'use client'

import { useState } from 'react'
import { useEvent } from '@/contexts/event-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function TourDetailsPage() {
  const { event } = useEvent()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">The Details</h1>
          <p className="text-lg text-muted-foreground">
            Important information to help you plan your tour experience.
          </p>
        </div>
      </section>

      {/* Details Grid */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-3 uppercase">What:</h3>
              <p className="text-muted-foreground leading-relaxed">
                It's the 17th annual White Rock Home Tour, a self-guided tour showcasing six mid-century and new modern homes
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 uppercase">When:</h3>
              <p className="text-muted-foreground leading-relaxed">
                Saturday, April 26 and Sunday, April 27, 2025. The 6 tour homes open at 12 noon and close at 5 pm sharp both days.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 uppercase">Where:</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                White Rock Lake area in East Dallas
              </p>
              <Button variant="outline" className="border-2 border-foreground hover:bg-foreground hover:text-background">
                <MapPin className="mr-2 h-4 w-4" />
                CLICK FOR THE TOUR MAP
              </Button>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 uppercase">Why:</h3>
              <p className="text-muted-foreground leading-relaxed">
                100% proceeds benefit DISD's Hexter Elementary to bridge the budget gap and provide much-needed resources for students and teachers
              </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-3 uppercase">Cost:</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Tickets are $35 per person (ages 13 and up). Children 12 and under are free.
            </p>
            <Link href="/tickets">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90">
                CLICK TO BUY YOUR TICKETS NOW
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-6">
              You can also purchase tickets using your mobile device at each home during tour weekend for $35 each.{' '}
              <strong>We can not accept cash.</strong>
            </p>
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
