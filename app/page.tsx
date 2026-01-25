"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, ArrowRight } from "lucide-react"
import { PlatformLanding } from "@/components/platform-landing"

export default function HomePage() {
  const { event, isLoading, isMainDomain } = useEvent()
  const [countdown, setCountdown] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Countdown to April 25-26, 2026
  useEffect(() => {
    const targetDate = new Date("2026-04-25T00:00:00")

    const updateCountdown = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff > 0) {
        const seconds = Math.floor((diff / 1000) % 60)
        const minutes = Math.floor((diff / (1000 * 60)) % 60)
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const months = Math.floor(days / 30)
        const years = Math.floor(months / 12)

        setCountdown({
          years,
          months: months % 12,
          days: days % 30,
          hours,
          minutes,
          seconds,
        })
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  // Show main platform landing if on main domain
  if (isMainDomain) {
    return <PlatformLanding />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            Thank you Dallas! Save the date
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">
            Next year's White Rock Home Tour will be April 25 & 26, 2026
          </p>
        </div>
      </section>

      {/* Countdown Section */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Countdown to the 2026 WRHT
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Years", value: countdown.years },
              { label: "Months", value: countdown.months },
              { label: "Days", value: countdown.days },
              { label: "Hrs", value: countdown.hours },
              { label: "Mins", value: countdown.minutes },
              { label: "Secs", value: countdown.seconds },
            ].map((item, index) => (
              <div key={item.label} className="text-center">
                <div className="bg-white border-2 border-gray-900 p-6 mb-2">
                  <div className="text-4xl md:text-5xl font-bold text-gray-900">
                    {item.value}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            WHAT PEOPLE ARE SAYING ABOUT THE WRHT
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="border-2 border-gray-900">
              <CardContent className="p-8">
                <blockquote className="text-gray-700 leading-relaxed mb-6">
                  "There are many great home tours in the North Texas area, but we value our
                  collaborations with the White Rock Home Tour especially. Curated by a passionate
                  group of volunteers on behalf of a worthy cause, the tour spotlights the
                  residential architecture of one of Dallas' most interesting neighborhoods."
                </blockquote>
                <div className="font-bold text-gray-900">GREG BROWN</div>
                <div className="text-sm text-gray-600">Dallas Center for Architecture</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-900">
              <CardContent className="p-8">
                <blockquote className="text-gray-700 leading-relaxed mb-6">
                  "I am always excited to see what will be on the tour each year, it is always an
                  excellent opportunity for increasing awareness and appreciation for our local
                  residential architecture and design culture, specifically modern homes."
                </blockquote>
                <div className="font-bold text-gray-900">CLIFF WELCH, AIA</div>
                <div className="text-sm text-gray-600">Welch Architecture</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-900">
              <CardContent className="p-8">
                <blockquote className="text-gray-700 leading-relaxed mb-6">
                  "As a longtime resident of the White Rock Lake area, I can't think of a more
                  vibrant community to live and work. Since living in the neighborhood, we haven't
                  missed a single year of the White Rock Home Tour. I am pleased and honored to
                  sponsor the White Rock Home Tour."
                </blockquote>
                <div className="font-bold text-gray-900">JENNIFER RILEY RICE, REALTOR</div>
                <div className="text-sm text-gray-600">Heather Guild Group @ Compass</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-900">
              <CardContent className="p-8">
                <blockquote className="text-gray-700 leading-relaxed mb-6">
                  "I was the Chair for the 2013 White Rock Home Tour while my daughter attended
                  Hexter. It was a true highlight of being at Hexter and watching the talented
                  planning team come together and have a lot of fun pulling off a very successful
                  home tour that year."
                </blockquote>
                <div className="font-bold text-gray-900">DENNIS COLEMAN, REALTOR</div>
                <div className="text-sm text-gray-600">Ebby Halliday</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
            Please join us for our 17th year
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
            of celebrating mid-century and modern residential architecture, interior design, and
            landscape design in East Dallas, all to benefit the students and teachers of DISD's
            Hexter Elementary.
          </p>
          <Button
            size="lg"
            className="bg-gray-900 hover:bg-gray-800 text-white border-2 border-gray-900 px-8 py-6 text-lg font-semibold"
            asChild
          >
            <Link href="/tickets">Buy Your Tickets</Link>
          </Button>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold text-center mb-8 text-gray-900">
            The 17th annual WRHT is made possible by
          </h3>
          <div className="text-center mb-12">
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                PRESENTING SPONSOR
              </div>
              <div className="h-24 bg-gray-100 border border-gray-300 flex items-center justify-center">
                <span className="text-gray-400">Sponsor Logo</span>
              </div>
            </div>
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                MODERN SPONSOR
              </div>
              <div className="h-20 bg-gray-100 border border-gray-300 flex items-center justify-center">
                <span className="text-gray-400">Sponsor Logo</span>
              </div>
            </div>
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                MEDIA PRIME SPONSOR
              </div>
              <div className="h-20 bg-gray-100 border border-gray-300 flex items-center justify-center">
                <span className="text-gray-400">Sponsor Logo</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-8 py-6 text-lg font-semibold"
              asChild
            >
              <Link href="/sponsor">MORE SPONSORS + INFO HERE</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
            Want to join the WRHT as a Sponsor?
          </h2>
          <Button
            size="lg"
            className="bg-gray-900 hover:bg-gray-800 text-white border-2 border-gray-900 px-8 py-6 text-lg font-semibold"
            asChild
          >
            <Link href="/contact">Contact Us Today</Link>
          </Button>
        </div>
      </section>

      {/* About Section with Box Buttons */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-900">
            ABOUT THE WRHT
          </h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12 leading-relaxed">
            The White Rock Home Tour was founded in 2006 as a fundraiser for Hexter Elementary (a
            public school in Dallas ISD) near White Rock Lake. Each year the tour showcases
            magnificent mid-century and new modern homes.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Link
              href="/history"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">THE HOMES</div>
            </Link>

            <Link
              href="/tickets"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">BUY TICKETS</div>
            </Link>

            <Link
              href="/help"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">TOUR DETAILS</div>
            </Link>

            <Link
              href="/contact"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">CONTACT US</div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
