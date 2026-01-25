"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlatformLanding } from "@/components/platform-landing"
import { Edit } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  const { event, isLoading, isMainDomain } = useEvent()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [countdown, setCountdown] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Check if user is admin
  useEffect(() => {
    if (user && event) {
      fetch(`/api/events/${event.id}/admins`)
        .then((res) => res.json())
        .then((data) => {
          const adminIds = data.admins?.map((admin: any) => admin.user_id) || []
          setIsAdmin(adminIds.includes(user.id))
        })
        .catch((err) => console.error("Error checking admin status:", err))
    }
  }, [user, event])

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

  // Get hero settings from event
  const heroSettings = event?.page_settings?.home?.["Main Hero"] || {}
  const heroImage = heroSettings.backgroundImage || "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image.png-vaXEO4FNUmTmYX2mCqCr9KMzaBg5fz.jpeg"
  const heroTitle = heroSettings.title || "THANK YOU DALLAS! SAVE THE DATE"
  const heroSubtitle = heroSettings.subtitle || "Next year's White Rock Home Tour will be April 25 & 26, 2026"

  // Show main platform landing if on main domain
  if (isMainDomain) {
    return <PlatformLanding />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner with Countdown */}
      <div className="bg-black text-white py-2 text-center text-sm font-light tracking-wide">
        <div className="container mx-auto px-4">
          {countdown.days > 0 ? (
            <span>
              COUNTDOWN TO 2026 WRHT: {countdown.years > 0 && `${countdown.years}Y `}
              {countdown.months > 0 && `${countdown.months}M `}
              {countdown.days}D {countdown.hours}H {countdown.minutes}M {countdown.seconds}S
            </span>
          ) : (
            <span>THANK YOU FOR A GREAT 17TH YEAR, DALLAS!</span>
          )}
        </div>
      </div>

      {/* Hero Section with Background Image */}
      <section className="relative h-[600px] md:h-[700px]">
        <Image
          src={heroImage}
          alt="White Rock Home Tour"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Admin Edit Button */}
        {isAdmin && (
          <button
            onClick={() => {
              // Open edit dialog (to be implemented)
              alert("Hero editing functionality - to be implemented with admin panel")
            }}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all z-10"
            title="Edit Hero Image"
          >
            <Edit className="w-5 h-5 text-gray-900" />
          </button>
        )}

        {/* Hero Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight drop-shadow-lg">
              {heroTitle}
            </h1>
            <p className="text-xl md:text-2xl font-light italic max-w-3xl mx-auto drop-shadow-md">
              {heroSubtitle}
            </p>
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
            <Link href="/tickets">GET YOUR TICKETS NOW</Link>
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
            <Link href="/contact">CONTACT US</Link>
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
              href="/the-homes"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">THE HOMES</div>
            </Link>

            <Link
              href="/history"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">HISTORY</div>
            </Link>

            <Link
              href="/help"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">TOUR DETAILS</div>
            </Link>

            <Link
              href="/sponsor"
              className="group block border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition-colors p-8 text-center"
            >
              <div className="text-xl font-bold uppercase tracking-wide">SPONSORSHIPS</div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
