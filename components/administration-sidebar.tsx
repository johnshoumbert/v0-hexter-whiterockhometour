"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Building,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  Inbox,
  MailCheck,
  FileCode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navItems = [
  {
    title: "Dashboard",
    href: "/administration/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/administration/users",
    icon: Users,
  },
  {
    title: "Email Logs",
    href: "/administration/email-logs",
    icon: Inbox,
  },
  {
    title: "Email Settings",
    href: "/administration/email-settings",
    icon: MailCheck,
  },
  {
    title: "Email Templates",
    href: "/administration/email-templates",
    icon: FileCode,
  },
  {
    title: "Contact Requests",
    href: "/administration/contacts",
    icon: Mail,
  },
  {
    title: "Licenses",
    href: "/administration/licenses",
    icon: Mail,
  },
  {
    title: "Advocates",
    href: "/administration/advocates",
    icon: FileText,
  },
  {
    title: "Organizations",
    href: "/administration/organizations",
    icon: Building,
  },
  {
    title: "Messages",
    href: "/administration/messages",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    href: "/administration/settings",
    icon: Settings,
  },
]

export function AdministrationSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("admin_session")
    router.push("/login/admin")
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background">
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <span className="text-lg font-bold text-white">TS</span>
            </div>
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
          <div className="border-t p-4 space-y-2">
            <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
              <Link href="/">View Site</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
