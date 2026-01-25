"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Gavel,
  Package,
  Users,
  CreditCard,
  Menu,
  X,
  MessageSquare,
  Calendar,
  Wallet,
  UserCog,
  Ticket,
  Vote,
  Trophy,
  ImageIcon,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  FileText,
  Home,
  Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState } from "react"

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },

  {
    title: "Event",
    href: "/admin/event",
    icon: Calendar,
  },
  {
    title: "Items",
    href: "/admin/items",
    icon: Package,
  },
  {
    title: "Homes",
    href: "/admin/homes",
    icon: Home,
  },
  {
    title: "Bids",
    href: "/admin/bids",
    icon: Gavel,
  },
  {
    title: "Bidders",
    href: "/admin/bidders",
    icon: Users,
  },
  {
    title: "Winners",
    href: "/admin/winners",
    icon: Trophy,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: UserCog,
  },
  {
    title: "Staff",
    href: "/admin/staff",
    icon: Users,
  },
  {
    title: "Messages",
    href: "/admin/messages",
    icon: MessageSquare,
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    title: "Invoices",
    href: "/admin/invoices",
    icon: FileText,
  },
  {
    title: "Tracking",
    href: "/admin/tracking",
    icon: TrendingUp,
  },
  {
    title: "Payment Methods",
    href: "/admin/payment-methods",
    icon: Wallet,
  },
  {
    title: "Sponsors",
    href: "/admin/sponsors",
    icon: Users,
  },
  {
    title: "Tickets",
    href: "/admin/tickets",
    icon: Ticket,
  },
  {
    title: "Voting",
    href: "/admin/voting",
    icon: Vote,
  },
  {
    title: "Raffles",
    href: "/admin/raffles",
    icon: Trophy,
  },
  {
    title: "Gallery",
    href: "/admin/gallery",
    icon: ImageIcon,
  },
  {
    title: "Testimonials",
    href: "/admin/testimonials",
    icon: Quote,
  },
  {
    title: "Shop",
    href: "/admin/shop",
    icon: ShoppingBag,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Abandoned Carts",
    href: "/admin/abandoned-carts",
    icon: ShoppingCart,
  },
  {
    title: "Coupons",
    href: "/admin/coupons",
    icon: Tag,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button - moved to fixed position at header level */}
      <div className="fixed right-4 top-28 z-50 lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background shadow-lg">
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform lg:static lg:translate-x-0 lg:mt-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "top-0", // start from top of viewport for full height drawer
        )}
      >
        <div className="flex h-full flex-col pt-16">
          {/* Header */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-bold">Admin Panel</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">View Site</Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
