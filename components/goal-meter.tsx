"use client"

import { useEffect, useState } from "react"

interface GoalMeterProps {
  current: number
  goal: number
  label?: string
}

export function GoalMeter({ current, goal, label = "Support our students!" }: GoalMeterProps) {
  const [progress, setProgress] = useState(0)
  const percentage = Math.min((current / goal) * 100, 100)

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}

      <div className="relative h-8 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-foreground mix-blend-difference">
            {formatCurrency(current)} raised of {formatCurrency(goal)} goal
          </span>
        </div>
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{Math.round(percentage)}% funded</span>
        <span>{formatCurrency(goal - current)} to go</span>
      </div>
    </div>
  )
}
