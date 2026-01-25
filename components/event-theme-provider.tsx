"use client"

import type React from "react"

import { useEventTheme } from "@/hooks/use-event-theme"

/**
 * Component that applies event theme globally
 * Should be placed at the root layout level
 */
export function EventThemeProvider({ children }: { children: React.ReactNode }) {
  useEventTheme()
  return <>{children}</>
}
