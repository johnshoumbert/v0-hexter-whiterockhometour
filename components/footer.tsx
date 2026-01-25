"use client"

import Link from "next/link"
import { Facebook, Instagram, Mail } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { event } = useEvent()

  const logoUrl = event?.logo_image_url
  const eventName = event?.event_name || "Auction"

  const enableAuction = event?.enable_auction !== false
  const enableVoting = event?.enable_voting || false

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <div className="relative h-10 w-10 flex-shrink-0">
                  <Image
                    src="/images/design-mode/myschoolauction.png"
                    alt={`${eventName} logo`}
                    fill
                    className="object-contain"
                    sizes="40px"
                  />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary" />
              )}
              <span className="text-lg font-bold">{eventName}</span>
            </div>
            <p className="text-sm text-muted-foreground">Supporting our School through charitable auctions</p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-muted-foreground hover:text-foreground">
                  History
                </Link>
              </li>
              {enableAuction && (
                <li>
                  <Link href="/auctions" className="text-muted-foreground hover:text-foreground">
                    Auctions
                  </Link>
                </li>
              )}
              <li>
                <Link href="/events" className="text-muted-foreground hover:text-foreground">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/donate" className="text-muted-foreground hover:text-foreground">
                  Donate
                </Link>
              </li>
              <li>
                <Link href="/create-auction" className="text-primary hover:text-primary/80 font-medium">
                  Start an Auction
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h3 className="font-semibold">Connect</h3>
            <div className="flex gap-4">
              <Link
                href="https://www.facebook.com/profile.php?viewas=100000686899395&id=61583487040467"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>

              <Link
                href="https://www.instagram.com/myschoolauction/"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="/support" className="text-muted-foreground hover:text-foreground" aria-label="Support">
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Powered by{" "}
            <Link href="https://www.myschoolauction.com" className="text-primary hover:text-primary/80 font-medium">
              MySchoolAuction.com
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">The premier platform for school fundraising auctions</p>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Shoumbert Labs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
