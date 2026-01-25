"use client"

import Link from "next/link"
import { Facebook, Instagram, ChevronUp } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { event } = useEvent()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-[#2a2a2a] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-3 items-start">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase mb-6">About The WRHT</h3>
            <p className="text-sm leading-relaxed text-gray-300">
              The White Rock Home Tour was founded in 2006 as a fundraiser for Hexter Elementary (a public school in Dallas ISD) near White Rock Lake. Each year the tour showcases magnificent mid-century and new modern homes.
            </p>
          </div>

          {/* Logo Section */}
          <div className="flex justify-center">
            <div className="relative w-48 h-48">
              <Image
                src="https://wrhometour.com/wp-content/uploads/2022/11/Hexter-Logo-Color.png"
                alt="Hexter Elementary Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/the-homes" 
                className="text-sm font-bold tracking-wider uppercase hover:text-gray-300 transition-colors"
              >
                THE HOMES
              </Link>
              <Link 
                href="/tickets" 
                className="text-sm font-bold tracking-wider uppercase hover:text-gray-300 transition-colors"
              >
                BUY TICKETS
              </Link>
              <Link 
                href="/tour-details" 
                className="text-sm font-bold tracking-wider uppercase hover:text-gray-300 transition-colors"
              >
                TOUR DETAILS
              </Link>
              <Link 
                href="/contact" 
                className="text-sm font-bold tracking-wider uppercase hover:text-gray-300 transition-colors"
              >
                CONTACT US
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link 
              href="https://shoumbert.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              © 2026 Shoumbert Labs. All rights reserved.
            </Link>
            
            <div className="flex items-center gap-6">
              <Link
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <button
                onClick={scrollToTop}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Scroll to top"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
