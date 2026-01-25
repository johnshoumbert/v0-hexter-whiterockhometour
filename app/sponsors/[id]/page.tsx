"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Footer } from "@/components/footer"
import { ArrowLeft, ExternalLink, Mail, Phone, MapPin, Pencil } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { SponsorForm } from "@/components/sponsor-form"

interface Sponsor {
  id: string
  name: string
  logo_url: string
  website_url: string
  description?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  event_id: string
  level?: string
  sponsorship_amount?: number
}

export default function SponsorPage() {
  const params = useParams()
  const router = useRouter()
  const { event } = useEvent()
  const { user } = useAuth()
  const [sponsor, setSponsor] = useState<Sponsor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const isEventAdmin = user?.is_admin && event?.id === sponsor?.event_id

  useEffect(() => {
    async function fetchSponsor() {
      try {
        const response = await fetch(`/api/sponsors/${params.id}`)

        if (!response.ok) {
          throw new Error("Sponsor not found")
        }

        const data = await response.json()
        setSponsor(data.sponsor)
      } catch (err) {
        console.error("[v0] Error fetching sponsor:", err)
        setError("Failed to load sponsor information")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchSponsor()
    }
  }, [params.id])

  useEffect(() => {
    async function checkAdmin() {
      console.log("[v0] Checking admin status - user:", user?.id, "event:", event?.id)

      if (!user || !event?.id) {
        console.log("[v0] No user or event, setting isAdmin to false")
        return
      }

      try {
        const url = `/api/events/${event.id}/admins`
        console.log("[v0] Fetching admin status from:", url)

        const response = await fetch(url)
        console.log("[v0] Admin check response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Admin data:", data)
        } else {
          console.log("[v0] Admin check failed with status:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error checking admin status:", error)
      }
    }

    checkAdmin()
  }, [user, event])

  const handleSuccess = () => {
    setSheetOpen(false)
    // Refresh sponsor data
    fetch(`/api/sponsors/${params.id}`)
      .then((res) => res.json())
      .then((data) => setSponsor(data.sponsor))
  }

  const handleDelete = () => {
    setSheetOpen(false)
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading sponsor...</p>
        </div>
      </div>
    )
  }

  if (error || !sponsor) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold">Sponsor Not Found</h1>
            <p className="mb-8 text-lg text-muted-foreground">
              We couldn't find this sponsor. It may have been removed or doesn't exist.
            </p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-muted/50 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>

              {isEventAdmin && (
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Sponsor
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="overflow-y-auto sm:max-w-2xl">
                    <SheetHeader>
                      <SheetTitle>Edit Sponsor</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <SponsorForm
                        sponsor={sponsor}
                        eventId={sponsor.event_id}
                        onSuccess={handleSuccess}
                        onDelete={handleDelete}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </section>

        {/* Sponsor Details */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              {/* Logo and Name */}
              <div className="mb-12 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-2xl border bg-card p-8 shadow-lg">
                    <img
                      src={sponsor.logo_url || "/placeholder.svg?height=200&width=300"}
                      alt={sponsor.name}
                      className="h-32 w-auto object-contain"
                    />
                  </div>
                </div>
                <h1 className="mb-4 text-4xl font-bold">{sponsor.name}</h1>
                {sponsor.description && (
                  <p className="text-balance text-lg text-muted-foreground mx-auto max-w-2xl">{sponsor.description}</p>
                )}
              </div>

              {/* Sponsor Level and Offering section */}
              {(sponsor.level || sponsor.sponsorship_amount) && (
                <div className="mb-8 rounded-xl border bg-card p-8 shadow-sm">
                  <h2 className="mb-6 text-2xl font-bold">Sponsorship Details</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {sponsor.level && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Sponsorship Level</p>
                        <p className="text-lg font-semibold capitalize">{sponsor.level}</p>
                      </div>
                    )}
                    {sponsor.sponsorship_amount && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Sponsorship Amount</p>
                        <p className="text-lg font-semibold text-primary">
                          ${sponsor.sponsorship_amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {sponsor.description && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-muted-foreground mb-2">About This Sponsorship</p>
                      <p className="text-muted-foreground">{sponsor.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Information */}
              <div className="rounded-xl border bg-card p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold">Contact Information</h2>
                <div className="space-y-4">
                  {sponsor.website_url && (
                    <div className="flex items-start gap-3">
                      <ExternalLink className="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Website</p>
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {sponsor.website_url}
                        </a>
                      </div>
                    </div>
                  )}

                  {sponsor.contact_email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <a href={`mailto:${sponsor.contact_email}`} className="text-primary hover:underline">
                          {sponsor.contact_email}
                        </a>
                      </div>
                    </div>
                  )}

                  {sponsor.contact_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <a href={`tel:${sponsor.contact_phone}`} className="text-primary hover:underline">
                          {sponsor.contact_phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {sponsor.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p>{sponsor.address}</p>
                      </div>
                    </div>
                  )}

                  {!sponsor.website_url && !sponsor.contact_email && !sponsor.contact_phone && !sponsor.address && (
                    <p className="text-center text-muted-foreground py-4">
                      No contact information available at this time.
                    </p>
                  )}
                </div>
              </div>

              {/* Thank You Message */}
              <div className="mt-12 rounded-xl bg-primary/10 p-8 text-center">
                <h2 className="mb-3 text-2xl font-bold">Thank You for Your Support!</h2>
                <p className="text-balance text-muted-foreground mx-auto max-w-xl">
                  We are grateful to {sponsor.name} for their generous sponsorship of {event?.event_name || "our event"}
                  . Their support helps make our mission possible.
                </p>
              </div>

              {/* Call to Action */}
              {sponsor.website_url && (
                <div className="mt-8 text-center">
                  <Button size="lg" asChild>
                    <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer">
                      Visit {sponsor.name}
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
