"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Gavel,
  Trophy,
  CreditCard,
  MessageSquare,
  User,
  Menu,
  X,
  FileText,
  Building2,
  Calendar,
  ShoppingCart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navItems = [
  {
    title: "Home",
    href: "/user",
    icon: Home,
  },
  {
    title: "My Bids",
    href: "/user/bids",
    icon: Gavel,
  },
  {
    title: "My Wins",
    href: "/user/wins",
    icon: Trophy,
  },
  {
    title: "Payments",
    href: "/user/payments",
    icon: CreditCard,
  },
  {
    title: "Purchases",
    href: "/user/purchases",
    icon: ShoppingCart,
  },
  {
    title: "Licenses",
    href: "/user/licenses",
    icon: FileText,
  },
  {
    title: "Organization",
    href: "/user/organization",
    icon: Building2,
  },
  {
    title: "Events",
    href: "/user/events",
    icon: Calendar,
  },
  {
    title: "Messages",
    href: "/user/chat",
    icon: MessageSquare,
  },
  {
    title: "Profile",
    href: "/user/profile",
    icon: User,
  },
]

export function UserSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="fixed right-4 top-20 z-50 lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background shadow-lg">
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-24 bottom-0 left-0 z-40 w-64 border-r bg-background transition-transform lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6 lg:h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-xl font-bold">CharityBid</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}
          </nav>

          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
