"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, Bell, ShoppingCart, Clock, Trophy } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { useCartStore } from "@/stores/cart-store"
import { ThemeToggle } from "@/components/theme-toggle"
import { ImageWithFallback } from "@/components/image-with-fallback"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useRouter, usePathname } from "next/navigation"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [auctionStatus, setAuctionStatus] = useState<"not-started" | "live" | "ended">("live")
  const [showBanner, setShowBanner] = useState(false)
  const [unusedLicenses, setUnusedLicenses] = useState<number>(0)
  const [enableKiosk, setEnableKiosk] = useState(false)
  const [enableGallery, setEnableGallery] = useState(false)
  const [enableDonation, setEnableDonation] = useState(false)
  const [enableVoting, setEnableVoting] = useState(false)
  const [enableRegistration, setEnableRegistration] = useState(false)
  const [enableShop, setEnableShop] = useState(false)
  const [enableSponsors, setEnableSponsors] = useState(false) // Added enableSponsors state
  const [enableAuction, setEnableAuction] = useState(false) // Added enableAuction state
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [showMessageDropdown, setShowMessageDropdown] = useState(false)
  const { user, logout, isLoading, refreshUser } = useAuth()
  const { event, isMainDomain } = useEvent()
  const { getCartCount, setCartOpen } = useCartStore()
  const cartCount = getCartCount()
  const prevEventIdRef = useRef<string | null>(null)
  const hasRefreshedForEvent = useRef<string | null>(null)
  const [shopClosed, setShopClosed] = useState(false)

  const isKioskMode = pathname?.startsWith("/kiosk")

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [router]) // Empty dependency array - effect only runs once

  useEffect(() => {
    if (event?.id && user && hasRefreshedForEvent.current !== event.id) {
      console.log("[v0] Event loaded, refreshing user with event ID:", event.id)
      hasRefreshedForEvent.current = event.id
      refreshUser(event.id)
    }
  }, [event?.id, user, refreshUser])

  useEffect(() => {
    if (!event || isMainDomain) {
      setShowBanner(false)
      return
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(event.end_date).getTime()
      const start = event.start_date ? new Date(event.start_date).getTime() : 0

      // Auction hasn't started yet
      if (start && now < start) {
        setAuctionStatus("not-started")
        setShowBanner(true)

        const difference = start - now
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        if (days > 0) {
          setTimeLeft(`Auction starts in ${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeLeft(`Auction starts in ${hours}h ${minutes}m ${seconds}s`)
        } else {
          setTimeLeft(`Auction starts in ${minutes}m ${seconds}s`)
        }
        return
      }

      // Auction has ended
      if (now >= end) {
        setAuctionStatus("ended")
        setShowBanner(true)
        setTimeLeft("Auction is closed")
        return
      }

      // Auction is live
      setAuctionStatus("live")
      setShowBanner(true)

      const difference = end - now
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m remaining`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s remaining`)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [event, isMainDomain])

  useEffect(() => {
    if (user && isMainDomain) {
      fetch("/api/users/me/licenses")
        .then((res) => res.json())
        .then((data) => {
          if (data.unusedCount !== undefined) {
            setUnusedLicenses(data.unusedCount)
          }
        })
        .catch((err) => {
          console.error("Failed to fetch license count:", err)
        })
    }
  }, [user, isMainDomain])

  useEffect(() => {
    if (event && !isMainDomain) {
      setEnableGallery(event.enable_gallery || false)
      setEnableVoting(event.enable_voting || false)
      setEnableDonation(event.enable_donation || false)
      setEnableRegistration(event.enable_registration || false)
      setEnableShop(event.enable_shop || false) // Added enableShop effect
      setEnableSponsors(event.enable_sponsor || false) // Added enableSponsors effect
      setEnableAuction(event.enable_auction !== false) // Default to true for backward compatibility
    }
  }, [event, isMainDomain])

  useEffect(() => {
    if (user && event?.id && !isMainDomain) {
      fetch(`/api/events/${event.id}/messages/unread`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) {
            setRecentMessages(data.messages)
            setUnreadCount(data.count)
          }
        })
        .catch((err) => console.error("[v0] Failed to fetch unread messages:", err))
    }
  }, [user, event?.id, isMainDomain])

  useEffect(() => {
    const fetchShopStatus = async () => {
      if (!event?.id) return
      try {
        const response = await fetch(`/api/events/${event.id}/shop/status`)
        if (response.ok) {
          const data = await response.json()
          setShopClosed(data.closed || false)
        }
      } catch (error) {
        console.error("Error fetching shop status:", error)
      }
    }
    fetchShopStatus()
  }, [event?.id])

  const navLinks = isMainDomain
    ? [
        { href: "/", label: "Home" },
        { href: "/help", label: "Help" },
        { href: "/pricing", label: "Pricing" },
        { href: "/getting-started", label: "Getting Started" },
        { href: "/demo-auction", label: "Demo Auction" },
      ]
    : [
        { href: "/the-homes", label: "THE HOMES" },
        { href: "/history", label: "HISTORY" },
        { href: "/tour-details", label: "DETAILS" },
        ...(enableSponsors ? [{ href: "/sponsor", label: "SPONSORS" }] : []),
        { href: "/contact", label: "CONTACT US" },
        ...(enableAuction ? [{ href: "/auctions", label: "AUCTION" }] : []),
        ...(enableShop ? [{ href: "/shop", label: "SHOP" }] : []),
        ...(enableVoting ? [{ href: "/voting", label: "VOTING" }] : []),
        ...(enableDonation ? [{ href: "/donate", label: "DONATE" }] : []),
        ...(enableGallery ? [{ href: "/gallery", label: "GALLERY" }] : []),
        ...(enableRegistration ? [{ href: "/tickets", label: "TICKETS" }] : []),
      ]

  const logoUrl = event?.logo_image_url
  const eventName = event?.event_name || "MySchoolAuction"

  if (isKioskMode) {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background backdrop-blur supports-[backdrop-filter]:bg-background">
      {showBanner && (
        <div
          className={`${
            auctionStatus === "live"
              ? "bg-primary text-primary-foreground"
              : auctionStatus === "not-started"
                ? "bg-muted text-foreground"
                : "bg-destructive text-destructive-foreground"
          }`}
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              {auctionStatus === "live" && (
                <>
                  <Clock className="h-4 w-4" />
                  <span className="text-balance">Auction is Live • {timeLeft}</span>
                </>
              )}
              {auctionStatus === "not-started" && (
                <>
                  <Clock className="h-4 w-4" />
                  <span className="text-balance">Auction starts in {timeLeft}</span>
                </>
              )}
              {auctionStatus === "ended" && (
                <>
                  <Trophy className="h-4 w-4" />
                  <Link href="/user/wins" className="hover:underline flex items-center gap-2">
                    <span>Auction is closed</span>
                    <span className="text-xs opacity-90">(See My Winnings)</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <div className="relative h-10 w-10 flex-shrink-0">
                <ImageWithFallback
                  src={logoUrl || "/placeholder.svg"}
                  alt={`${eventName} logo`}
                  fill
                  className="object-contain"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex-shrink-0" />
            )}
            <span className="text-xl font-bold truncate">{eventName}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {!isMainDomain && user && cartCount > 0 && !shopClosed && (
              <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-medium bg-destructive text-white rounded-full">
                  {cartCount}
                </span>
              </Button>
            )}
            <div className="hidden md:block">
              <Button variant="ghost" size="icon" className="bg-transparent hover:bg-transparent" asChild>
                <div>
                  <ThemeToggle />
                </div>
              </Button>
            </div>
            {!isLoading && (
              <>
                {user ? (
                  <>
                    {!isMainDomain && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="relative bg-transparent hover:bg-transparent">
                            <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                            {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                {unreadCount}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                          <DropdownMenuLabel>New Messages</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {recentMessages.length > 0 ? (
                            <>
                              {recentMessages.map((msg) => (
                                <DropdownMenuItem key={msg.id} asChild>
                                  <Link
                                    href={
                                      user?.is_admin || user?.isEventAdmin
                                        ? `/admin/messages?sender=${msg.sender.id}`
                                        : `/user/chat?receiver=${msg.sender.id}`
                                    }
                                    className="flex flex-col items-start gap-1 p-3"
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                          {msg.sender.name
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{msg.sender.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-10">
                                      {new Date(msg.created_at).toLocaleDateString()}
                                    </p>
                                  </Link>
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  href={user?.is_admin || user?.isEventAdmin ? "/admin/messages" : "/user/chat"}
                                  className="w-full text-center text-sm text-primary"
                                >
                                  View All Messages
                                </Link>
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">No new messages</div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <Avatar className="h-8 w-8">
                            {user?.profile_image ? (
                              <AvatarImage src={user?.profile_image || "/placeholder.svg"} alt={user?.name || "User"} />
                            ) : (
                              <AvatarFallback>
                                {user?.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>
                          <div className="flex flex-col">
                            <span className="font-medium">{user?.name}</span>
                            <span className="text-xs text-muted-foreground">{user?.email}</span>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(user?.role === "admin" || user?.is_admin) && isMainDomain && (
                          <DropdownMenuItem asChild>
                            <Link href="/administration/dashboard">
                              <Menu className="mr-2 h-4 w-4" />
                              Administration
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {isMainDomain ? (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href="/account">Account</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/create-auction">
                                Start an Auction {unusedLicenses > 0 && `(${unusedLicenses})`}
                              </Link>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            {(user?.is_admin || user?.isEventAdmin) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href="/admin">Manage Auction</Link>
                                </DropdownMenuItem>
                              </>
                            )}
                            {user?.eventRole === "staff" ||
                              ((user?.role === "admin" || user?.is_admin) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href="/staff">Staff Portal</Link>
                                  </DropdownMenuItem>
                                </>
                              ))}
                            <DropdownMenuItem asChild>
                              <Link href="/user">Dashboard</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/profile">Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/bids">My Bids</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/wins">My Wins</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/payments">Payments</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/chat">Messages</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/purchases">My Orders</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/purchases" prefetch={false}>
                                My Tickets
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/purchases" prefetch={false}>
                                My Donations
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/purchases" prefetch={false}>
                                My Raffles
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/user/purchases" prefetch={false}>
                                My Votes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href="/kiosk/register">Kiosk Mode</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/support">Support</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                              <Menu className="mr-2 h-4 w-4" />
                              Logout
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    {isMainDomain ? (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button>
                            <Menu className="mr-2 h-4 w-4" />
                            Login
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-56 p-2">
                          <div className="flex flex-col gap-2">
                            <Button asChild variant="ghost" className="w-full justify-start">
                              <Link href="/login">
                                <Menu className="mr-2 h-4 w-4" />
                                Login to App
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start">
                              <Link href="/login/admin">
                                <Menu className="mr-2 h-4 w-4" />
                                Login to Admin
                              </Link>
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>
                    ) : (
                      <Button asChild>
                        <Link href="/login">Login</Link>
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {!isMainDomain && user && cartCount > 0 && !shopClosed && (
              <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-medium bg-destructive text-white rounded-full">
                  {cartCount}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <Menu className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="border-t py-4 md:hidden max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col gap-3">
              {(user?.is_admin || user?.isEventAdmin) && (
                <>
                  <div className="border-t pt-2 mt-2" />
                  <Link
                    href="/admin"
                    className="text-sm text-muted-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Manage Auction
                  </Link>
                </>
              )}
              {user?.eventRole === "staff" && (
                <>
                  <div className="border-t pt-2 mt-2" />
                  <Link
                    href="/staff"
                    className="text-sm text-muted-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Staff Portal
                  </Link>
                </>
              )}
              {navLinks
                .filter((link) => link.href !== "/kiosk/register")
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              {!isLoading && (
                <>
                  {user ? (
                    <>
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-10 w-10">
                            {user?.profile_image ? (
                              <AvatarImage src={user?.profile_image || "/placeholder.svg"} alt={user?.name || "User"} />
                            ) : (
                              <AvatarFallback>
                                {user?.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {(user?.role === "admin" || user?.is_admin) && isMainDomain && (
                            <Link
                              href="/administration/dashboard"
                              className="text-sm text-muted-foreground"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Menu className="mr-2 h-4 w-4 inline" />
                              Administration
                            </Link>
                          )}
                          {isMainDomain ? (
                            <>
                              <Link
                                href="/account"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Account
                              </Link>
                              <Link
                                href="/create-auction"
                                className="text-sm font-medium text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Start an Auction {unusedLicenses > 0 && `(${unusedLicenses})`}
                              </Link>
                            </>
                          ) : (
                            <>
                              <Link
                                href="/user"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Dashboard
                              </Link>
                              <Link
                                href="/user/profile"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Profile
                              </Link>
                              <Link
                                href="/user/wins"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                My Wins
                              </Link>
                              <Link
                                href="/user/purchases"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                My Orders
                              </Link>
                              <Link
                                href="/user/purchases"
                                prefetch={false}
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                My Raffles
                              </Link>

                              <div className="border-t pt-2 mt-2" />
                              <Link
                                href="/kiosk/register"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Kiosk Mode
                              </Link>
                              <Link
                                href="/support"
                                className="text-sm text-muted-foreground"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Support
                              </Link>
                              <button
                                onClick={() => {
                                  logout()
                                  setIsMobileMenuOpen(false)
                                }}
                                className="text-sm text-destructive text-left"
                              >
                                Sign Out
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {isMainDomain ? (
                        <div className="flex flex-col gap-2">
                          <Button asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Link href="/login">Login to App</Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="w-full bg-transparent"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Link href="/login/admin">Login to Admin</Link>
                          </Button>
                        </div>
                      ) : (
                        <Button asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                          <Link href="/login">Login</Link>
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
