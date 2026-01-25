"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface CountdownTimerProps {
  endTime: Date | string
  compact?: boolean
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

export function CountdownTimer({ endTime, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft())

  function calculateTimeLeft(): TimeLeft {
    const end = new Date(endTime).getTime()
    const now = new Date().getTime()
    const difference = end - now

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  const isUrgent = timeLeft.total > 0 && timeLeft.total < 3600000 // Less than 1 hour
  const isEnded = timeLeft.total <= 0

  if (isEnded) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Ended</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-sm ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
        <Clock className="h-4 w-4" />
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${isUrgent ? "text-destructive" : ""}`}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums">{timeLeft.days}</span>
          <span className="text-xs text-muted-foreground">days</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums">{String(timeLeft.hours).padStart(2, "0")}</span>
        <span className="text-xs text-muted-foreground">hours</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums">{String(timeLeft.minutes).padStart(2, "0")}</span>
        <span className="text-xs text-muted-foreground">mins</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums">{String(timeLeft.seconds).padStart(2, "0")}</span>
        <span className="text-xs text-muted-foreground">secs</span>
      </div>
    </div>
  )
}
