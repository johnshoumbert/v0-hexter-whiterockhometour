"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface Notification {
  id: string
  type: string
  auction_id: string
  auction_title: string
  auction_slug: string
  message: string
  read: boolean
  created_at: string
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
let notificationsCache: { data: Notification[]; timestamp: number } | null = null

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const isFetchingRef = useRef(false)
  const router = useRouter()
  const { user } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(
    async (force = false) => {
      if (!user) return

      // Check cache first
      if (!force && notificationsCache && Date.now() - notificationsCache.timestamp < CACHE_DURATION) {
        setNotifications(notificationsCache.data)
        setUnreadCount(notificationsCache.data.filter((n) => !n.read).length)
        return
      }

      if (isFetchingRef.current) return
      isFetchingRef.current = true

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch("/api/notifications", {
          signal: abortControllerRef.current.signal,
        })

        if (response.ok) {
          const data = await response.json()
          notificationsCache = {
            data: data.notifications,
            timestamp: Date.now(),
          }
          setNotifications(data.notifications)
          setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length)
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("[v0] Error fetching notifications:", error)
        }
      } finally {
        isFetchingRef.current = false
      }
    },
    [user], // Removed isFetching from dependencies to prevent infinite loop
  )

  useEffect(() => {
    if (user) {
      fetchNotifications()

      // Poll every 5 minutes instead of 30 seconds to reduce load
      pollIntervalRef.current = setInterval(() => fetchNotifications(), 5 * 60 * 1000)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
    }
  }, [user, fetchNotifications])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await fetch(`/api/notifications/${notification.id}`, {
      method: "PUT",
    })

    // Navigate to auction
    if (notification.auction_slug) {
      router.push(`/auctions/${notification.auction_slug}`)
    }

    setIsOpen(false)
    fetchNotifications(true)
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter((n) => !n.read).map((n) => fetch(`/api/notifications/${n.id}`, { method: "PUT" })),
      )
      fetchNotifications(true)
    } catch (error) {
      console.error("[v0] Error marking all as read:", error)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchNotifications(true)
    }
  }

  if (!user) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-0 text-xs">
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`cursor-pointer flex-col items-start gap-1 p-3 ${!notification.read ? "bg-muted/50" : ""}`}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-sm font-medium">{notification.auction_title}</p>
                  {!notification.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
