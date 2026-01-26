"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Sponsor {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  level: string | null
  show_on_home: boolean
}

interface SponsorLevel {
  id: string
  name: string
  level: string
  display_order: number
  sponsors: Sponsor[]
}

export function SponsorDisplaySection() {
  const { event } = useEvent()
  const [sponsorLevels, setSponsorLevels] = useState<SponsorLevel[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupByLevel, setGroupByLevel] = useState(false)

  useEffect(() => {
    const fetchSponsorsData = async () => {
      if (!event?.id) return

      setIsLoading(true)
      try {
        // Fetch sponsor levels first
        const levelsRes = await fetch(`/api/events/${event.id}/sponsor-levels`)
        const levelsData = await levelsRes.json()

        // Fetch sponsors that show on home
        const sponsorsRes = await fetch(`/api/events/${event.id}/sponsors?showOnHome=true`)
        const sponsorsData = await sponsorsRes.json()

        console.log("[v0] Loaded sponsor levels:", levelsData.levels)
        console.log("[v0] Loaded home sponsors:", sponsorsData.sponsors)

        // Check if we should group by levels (if there are levels defined)
        const hasLevels = levelsData.levels && levelsData.levels.length > 0
        setGroupByLevel(hasLevels)

        if (hasLevels) {
          // Group sponsors by level
          const levelsWithSponsors = levelsData.levels.map((level: any) => ({
            ...level,
            sponsors: sponsorsData.sponsors.filter((s: Sponsor) => s.level === level.level && s.show_on_home),
          }))
          setSponsorLevels(levelsWithSponsors)
        } else {
          // No levels, just show all sponsors
          setSponsors(sponsorsData.sponsors.filter((s: Sponsor) => s.show_on_home))
        }
      } catch (error) {
        console.error("[v0] Error fetching sponsors:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSponsorsData()
  }, [event?.id])

  if (isLoading) {
    return null
  }

  // Don't show section if no sponsors
  const hasSponsors = groupByLevel
    ? sponsorLevels.some((level) => level.sponsors.length > 0)
    : sponsors.length > 0

  if (!hasSponsors) {
    return null
  }

  return (
    <div className="bg-white py-16">
      <div className="container mx-auto px-4">
        {/* Header with decorative lines */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="h-1 bg-blue-800 flex-grow max-w-[200px]" />
          <h2 className="text-lg md:text-2xl font-bold text-center tracking-wide">
            THE 17TH ANNUAL WRHT IS MADE POSSIBLE BY
          </h2>
          <div className="h-1 bg-blue-800 flex-grow max-w-[200px]" />
        </div>

        {groupByLevel ? (
          /* Grouped by sponsor levels */
          <div className="space-y-12">
            {sponsorLevels.map((level) => {
              if (level.sponsors.length === 0) return null

              return (
                <div key={level.id} className="text-center">
                  <p className="text-sm font-bold text-gray-700 mb-6 tracking-wider uppercase">{level.name}</p>
                  <div
                    className={`grid gap-8 max-w-4xl mx-auto ${
                      level.sponsors.length === 1
                        ? "grid-cols-1"
                        : level.sponsors.length === 2
                          ? "md:grid-cols-2"
                          : "md:grid-cols-3"
                    }`}
                  >
                    {level.sponsors.map((sponsor) => (
                      <Link
                        key={sponsor.id}
                        href={`/sponsors/${sponsor.id}`}
                        className="flex justify-center items-center hover:opacity-75 transition-opacity"
                      >
                        {sponsor.logo_url ? (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            className="h-20 max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-xl font-semibold text-gray-800">{sponsor.name}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* No levels, show all sponsors in a grid */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {sponsors.map((sponsor) => (
              <Link
                key={sponsor.id}
                href={`/sponsors/${sponsor.id}`}
                className="flex justify-center items-center hover:opacity-75 transition-opacity"
              >
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="h-16 max-w-full object-contain" />
                ) : (
                  <div className="text-base font-semibold text-gray-800 text-center">{sponsor.name}</div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* More Sponsors Button */}
        <div className="text-center mt-12">
          <Link href="/sponsor">
            <Button
              size="lg"
              className="bg-black hover:bg-gray-800 text-white px-12 py-6 text-base font-bold tracking-wide"
            >
              MORE SPONSORS + INFO HERE
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
