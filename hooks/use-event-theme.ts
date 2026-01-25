"use client"

import { useEffect } from "react"
import { useEvent } from "@/contexts/event-context"

export function useEventTheme() {
  const { event } = useEvent()

  useEffect(() => {
    // Store the last known event to prevent theme flashing on page navigation
    if (!event) {
      // Don't immediately remove event-themed class - might just be a navigation transition
      // Keep previous theme until new event is loaded
      return
    }

    const hasCustomTheme =
      event.theme_bg_color ||
      event.theme_bg_image ||
      event.theme_font_family_regular ||
      event.theme_font_family_bold ||
      event.theme_text_color ||
      event.theme_bold_text_color ||
      event.theme_button_light_bg ||
      event.theme_button_dark_bg

    // If no custom theme is set, remove event-themed class to use default shadcn styles
    if (!hasCustomTheme) {
      document.body.classList.remove("event-themed")
      document.documentElement.style.fontFamily = ""
      document.body.removeAttribute("data-theme-mode")
      return
    }

    const root = document.documentElement
    const body = document.body

    // Apply custom theme values only if they exist
    if (event.theme_bg_color) {
      root.style.setProperty("--event-bg-color", event.theme_bg_color)
    }
    if (event.theme_bg_image) {
      root.style.setProperty("--event-bg-image", `url(${event.theme_bg_image})`)
    }
    if (event.theme_font_family_regular) {
      root.style.setProperty("--event-font-family-regular", event.theme_font_family_regular)
      body.style.fontFamily = event.theme_font_family_regular
    }
    if (event.theme_font_family_bold) {
      root.style.setProperty("--event-font-family-bold", event.theme_font_family_bold)
    }
    if (event.theme_text_color) {
      root.style.setProperty("--event-text-color", event.theme_text_color)
    }
    if (event.theme_bold_text_color) {
      root.style.setProperty("--event-bold-text-color", event.theme_bold_text_color)
    }
    if (event.theme_button_light_bg) {
      root.style.setProperty("--event-button-light-bg", event.theme_button_light_bg)
    }
    if (event.theme_button_light_text) {
      root.style.setProperty("--event-button-light-text", event.theme_button_light_text)
    }
    if (event.theme_button_dark_bg) {
      root.style.setProperty("--event-button-dark-bg", event.theme_button_dark_bg)
    }
    if (event.theme_button_dark_text) {
      root.style.setProperty("--event-button-dark-text", event.theme_button_dark_text)
    }

    document.body.classList.add("event-themed")

    if (event.theme_mode && event.theme_mode !== "not-set") {
      document.body.classList.add(event.theme_mode)
      document.body.setAttribute("data-theme-mode", event.theme_mode)
    } else {
      document.body.classList.remove("dark", "light")
      document.body.removeAttribute("data-theme-mode")
    }
  }, [event])
}
