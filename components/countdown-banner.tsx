"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface CountdownBannerProps {
  endTime: Date
  startTime?: Date
}

export function CountdownBanner({ endTime, startTime }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const start = startTime ? new Date(startTime).getTime() : 0

      // Only show banner if event has started
      if (start && now < start) {
        setIsVisible(false)
        return
      }

      setIsVisible(true)

      const difference = end - now

      if (difference <= 0) {
        setTimeLeft("Auction Ended")
        return
      }

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
  }, [endTime, startTime])

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-sm font-medium md:text-base">
          <Clock className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-balance">{timeLeft}</span>
        </div>
      </div>
    </div>
  )
}
