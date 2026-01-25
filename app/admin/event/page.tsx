"use client"

import type React from "react"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2, Upload, Bold, Italic, List, ListOrdered, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEvent } from "@/contexts/event-context"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventThemePreview } from "@/components/event-theme-preview"
import { PredefinedThemes, type ThemeTemplate } from "@/components/predefined-themes"

interface EventSettings {
  id: string
  event_name: string
  start_date: string | null
  end_date: string | null
  go_live_date: string | null
  coming_soon_enabled: boolean
  coming_soon_description: string | null
  coming_soon_banner_url: string | null
  // </CHANGE>
  domain: string | null
  support_email: string | null // Added support_email field
  show_qr_codes: boolean
  allow_likes: boolean
  max_bidding: boolean
  auto_bids: boolean
  hero_image_url: string | null
  logo_image_url: string | null
  hero_description: string | null
  impact_image_url: string | null
  goal: number
  is_silent_auction: boolean
  enable_auction: boolean
  auto_charge: boolean
  invoice_enabled: boolean
  payment_deadline_hours: number
  pickup_instructions: string | null
  donation_response_text: string | null
  request_attendance: boolean
  enable_raffles: boolean
  allow_user_item_submission: boolean
  user_can_set_item_price: boolean
  enable_gallery: boolean // Added enable_gallery field to interface
  gallery_title: string // Add gallery title
  gallery_description: string // Add gallery description
  enable_shop: boolean // Added enable_shop field to interface
  additional_sections?: any[] // Added additional_sections field to interface
  // Added fields from updates
  enable_registration?: boolean
  enable_donation?: boolean
  enable_voting?: boolean
  enable_sponsor?: boolean
  show_impact_stats?: boolean
  theme_bg_color?: string | null
  theme_bg_image?: string | null
  theme_font_family?: string | null
  theme_font_family_regular?: string | null
  theme_font_family_bold?: string | null
  theme_text_color?: string | null
  theme_bold_text_color?: string | null
  theme_mode?: "light" | "dark" | "not-set" | null
  theme_button_light_bg?: string | null
  theme_button_light_text?: string | null
  theme_button_dark_bg?: string | null
  theme_button_dark_text?: string | null
  theme_dark_bg_color?: string | null
  theme_dark_bg_image?: string | null
  theme_dark_text_color?: string | null
  theme_dark_bold_text_color?: string | null
}

interface FundingHeroSettings {
  students: number
  donors: number
  programs: {
    show: boolean
    value: number
  }
}

interface EmailSetting {
  email_type: string
  enabled: boolean
  template_id: string | null
}

export default function AdminEventPage() {
  const { event: contextEvent, isLoading: eventLoading, refetchEvent } = useEvent() // Changed refreshEvent to refetchEvent
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [fundingHero, setFundingHero] = useState<FundingHeroSettings>({
    students: 500,
    donors: 250,
    programs: { show: true, value: 15 },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const donationEditorRef = useRef<HTMLTextAreaElement>(null)
  const [emailSettings, setEmailSettings] = useState<EmailSetting[]>([])

  const [originalDomain, setOriginalDomain] = useState<string | null>(null)
  const [domainChanged, setDomainChanged] = useState(false)
  const [themeTab, setThemeTab] = useState<"predefined" | "custom">("predefined")

  const handleRefresh = () => {
    window.location.reload()
  }

  useEffect(() => {
    if (contextEvent) {
      fetchSettings()
    }
  }, [contextEvent])

  const fetchSettings = async () => {
    if (!contextEvent) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/events/${contextEvent.id}`)
      if (!res.ok) throw new Error("Failed to fetch settings")
      const data = await res.json()

      if (data.event) {
        const eventData = data.event
        setSettings({
          event_name: eventData.event_name,
          start_date: formatDateForInput(eventData.start_date),
          end_date: formatDateForInput(eventData.end_date),
          go_live_date: formatDateForInput(eventData.go_live_date),
          coming_soon_enabled: eventData.coming_soon_enabled ?? false,
          coming_soon_description: eventData.coming_soon_description || "",
          coming_soon_banner_url: eventData.coming_soon_banner_url || "",
          // </CHANGE>
          domain: eventData.domain || "",
          support_email: eventData.support_email || "",
          hero_image_url: eventData.hero_image_url || "",
          hero_description: eventData.hero_description || "",
          logo_image_url: eventData.logo_image_url || "",
          gallery_title: eventData.gallery_title || "Gallery",
          gallery_description: eventData.gallery_description || "",
          pickup_instructions: eventData.pickup_instructions || "",
          donation_response_text: eventData.donation_response_text || "",
          goal: eventData.goal || 0,
          impact_image_url: eventData.impact_image_url || "",
          is_silent_auction: eventData.is_silent_auction,
          enable_auction: eventData.enable_auction ?? true,
          enable_registration: eventData.enable_registration,
          enable_donation: eventData.enable_donation,
          enable_raffles: eventData.enable_raffles,
          enable_gallery: eventData.enable_gallery,
          enable_shop: eventData.enable_shop,
          enable_voting: eventData.enable_voting,
          enable_sponsor: eventData.enable_sponsor,
          show_impact_stats: eventData.show_impact_stats,
          show_qr_codes: eventData.show_qr_codes,
          allow_likes: eventData.allow_likes,
          auto_bids: eventData.auto_bids,
          max_bidding: eventData.max_bidding,
          auto_charge: eventData.auto_charge,
          allow_user_item_submission: eventData.allow_user_item_submission,
          user_can_set_item_price: eventData.user_can_set_item_price,
          request_attendance: eventData.request_attendance,
          payment_deadline_hours: eventData.payment_deadline_hours,
          invoice_enabled: eventData.invoice_enabled,
          additional_sections: Array.isArray(eventData.additional_sections) ? eventData.additional_sections : [],
          theme_bg_color: eventData.theme_bg_color || null,
          theme_bg_image: eventData.theme_bg_image || null,
          theme_font_family: eventData.theme_font_family || "Inter",
          theme_font_family_regular: eventData.theme_font_family_regular || "Nunito",
          theme_font_family_bold: eventData.theme_font_family_bold || "Nunito",
          theme_text_color: eventData.theme_text_color || null,
          theme_bold_text_color: eventData.theme_bold_text_color || null,
          theme_mode: eventData.theme_mode || "light",
          theme_button_light_bg: eventData.theme_button_light_bg || "#000000",
          theme_button_light_text: eventData.theme_button_light_text || "#ffffff",
          theme_button_dark_bg: eventData.theme_button_dark_bg || "#ffffff",
          theme_button_dark_text: eventData.theme_button_dark_text || "#000000",
          theme_dark_bg_color: eventData.theme_dark_bg_color || "#0a0a0a",
          theme_dark_bg_image: eventData.theme_dark_bg_image || null,
          theme_dark_text_color: eventData.theme_dark_text_color || "#e5e5e5",
          theme_dark_bold_text_color: eventData.theme_dark_bold_text_color || "#ffffff",
        })
        setOriginalDomain(eventData.domain || "")
      }

      const emailRes = await fetch(`/api/events/${contextEvent.id}/email-settings`)
      if (emailRes.ok) {
        const emailData = await emailRes.json()
        setEmailSettings(emailData.settings || [])
      }

      const settingsRes = await fetch(`/api/events/${contextEvent.id}/settings?page=home&object=Funding Hero`)
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        if (settingsData.settings && settingsData.settings.value) {
          setFundingHero(settingsData.settings.value)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching event settings:", error)
      toast({
        title: "Error",
        description: "Failed to load event settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings || !contextEvent) return

    setIsSaving(true)
    try {
      console.log("[v0] Saving event settings for event ID:", contextEvent.id)
      console.log("[v0] Settings to save:", JSON.stringify(settings, null, 2))

      if (domainChanged && settings.domain !== originalDomain) {
        const confirmed = window.confirm(
          "⚠️ WARNING: Changing the custom domain will break all existing links to your event. Are you sure you want to continue?",
        )
        if (!confirmed) {
          setIsSaving(false)
          return
        }
      }

      const res = await fetch(`/api/events/${contextEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      console.log("[v0] Response status:", res.status)
      console.log("[v0] Response ok:", res.ok)

      const responseData = await res.json()
      console.log("[v0] Response data:", responseData)

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to save settings")
      }

      await fetch(`/api/events/${contextEvent.id}/email-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: emailSettings }),
      })

      const settingsRes = await fetch(`/api/events/${contextEvent.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "home",
          object: "Funding Hero",
          value: fundingHero,
        }),
      })

      if (!settingsRes.ok) {
        throw new Error("Failed to save funding hero settings")
      }

      toast({
        title: "✅ Success",
        description: "Event settings have been saved successfully!",
      })

      setOriginalDomain(settings.domain || "")
      setDomainChanged(false)

      await refetchEvent() // Changed refreshEvent to refetchEvent
      await fetchSettings()
    } catch (error) {
      console.error("[v0] Error saving event settings:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to save event settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetTheme = async () => {
    try {
      setSettings({
        ...settings,
        theme_mode: "not-set",
        theme_bg_color: null,
        theme_bg_image: null,
        theme_font_family_regular: "Nunito",
        theme_font_family_bold: "Nunito",
        theme_text_color: null,
        theme_bold_text_color: null,
        theme_button_light_bg: null,
        theme_button_light_text: null,
        theme_button_dark_bg: null,
        theme_button_dark_text: null,
        theme_dark_bg_color: null,
        theme_dark_bg_image: null,
        theme_dark_text_color: null,
        theme_dark_bold_text_color: null,
      })
      toast({
        title: "Theme Reset",
        description: "Theme settings have been reset to defaults. Click Save to apply.",
      })
    } catch (error) {
      console.error("Error resetting theme:", error)
      toast({
        title: "Error",
        description: "Failed to reset theme settings",
        variant: "destructive",
      })
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      })

      const responseClone = uploadResponse.clone()

      if (!uploadResponse.ok) {
        let errorMessage = "Failed to upload image"
        try {
          const errorData = await uploadResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          try {
            const errorText = await responseClone.text()
            errorMessage = errorText || `Upload failed with status ${uploadResponse.status}`
          } catch {
            errorMessage = `Upload failed with status ${uploadResponse.status}`
          }
        }
        throw new Error(errorMessage)
      }

      const { url } = await uploadResponse.json()

      setSettings((prev) => (prev ? { ...prev, hero_image_url: url } : prev))
      toast({
        title: "Success",
        description: "Hero image uploaded successfully",
      })
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      })

      const responseClone = uploadResponse.clone()

      if (!uploadResponse.ok) {
        let errorMessage = "Failed to upload logo"
        try {
          const errorData = await uploadResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          try {
            const errorText = await responseClone.text()
            errorMessage = errorText || `Upload failed with status ${uploadResponse.status}`
          } catch {
            errorMessage = `Upload failed with status ${uploadResponse.status}`
          }
        }
        throw new Error(errorMessage)
      }

      const { url } = await uploadResponse.json()

      setSettings((prev) => (prev ? { ...prev, logo_image_url: url } : prev))
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      })
    } catch (error) {
      console.error("[v0] Error uploading logo:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleImpactImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      })

      let errorMessage = "Failed to upload image"

      if (!uploadResponse.ok) {
        try {
          const errorData = await uploadResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, try to get text
          const errorText = await uploadResponse.text()
          errorMessage = errorText || `Upload failed with status ${uploadResponse.status}`
        }
        throw new Error(errorMessage)
      }

      const { url } = await uploadResponse.json()

      setSettings((prev) => (prev ? { ...prev, impact_image_url: url } : prev))
      toast({
        title: "Success",
        description: "Impact image uploaded successfully",
      })
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleComingSoonBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error("Failed to upload image")

      const { url } = await uploadResponse.json()
      setSettings((prev) => (prev ? { ...prev, coming_soon_banner_url: url } : prev))

      toast({
        title: "Success",
        description: "Coming soon banner uploaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload banner image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleGoLiveNow = async () => {
    if (!contextEvent || !settings) return

    try {
      setIsSaving(true)

      const response = await fetch(`/api/events/${contextEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coming_soon_enabled: false,
          go_live_date: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error("Failed to go live")

      setSettings({
        ...settings,
        coming_soon_enabled: false,
        go_live_date: formatDateForInput(new Date().toISOString()),
      })

      toast({
        title: "Success",
        description: "Event is now live!",
      })

      await refetchEvent()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to make event live",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }
  // </CHANGE>

  const formatDateForInput = (date: string | null) => {
    if (!date) return ""
    const d = new Date(date)
    // Format as YYYY-MM-DDTHH:mm for datetime-local input, using local timezone
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleDateChange = (dateString: string | null, field: "start_date" | "end_date" | "go_live_date") => {
    if (!dateString) {
      setSettings({ ...settings, [field]: null })
      return
    }

    // Convert datetime-local string to ISO string with timezone
    // datetime-local returns "YYYY-MM-DDTHH:mm" in local timezone
    // We need to convert this to a proper ISO string
    const localDate = new Date(dateString)
    const isoString = localDate.toISOString()

    console.log(`[v0] Converting ${field}: ${dateString} (local) -> ${isoString} (ISO)`)
    setSettings({ ...settings, [field]: isoString })
  }

  const insertFormatting = (before: string, after: string = before) => {
    const textarea = donationEditorRef.current
    if (!textarea || !settings) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = settings.donation_response_text || ""
    const selectedText = text.substring(start, end)

    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)
    setSettings({ ...settings, donation_response_text: newText })

    // Reset cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      auction_ended_winner: "Winner Notification",
      auction_ended_payment_pending: "Payment Pending",
      auction_reminder_1hour: "1 Hour Reminder",
      auction_reminder_30min: "30 Min Reminder",
      auction_reminder_5min: "5 Min Reminder",
      finish_account: "Finish Account",
      bid_confirmation: "Bid Confirmation",
      outbid_notification: "Outbid Notification",
    }
    return labels[type] || type
  }

  if (eventLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!contextEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No event found</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No event settings found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Event Settings</h1>
            <p className="text-muted-foreground">Configure your {settings.event_name || "event"} settings</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="auction">Auction</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
          </TabsList>

          {/* <TabsContent value="basic" className="space-y-4"> */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Configure the main event details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event_name">Event Name</Label>
                  <Input
                    id="event_name"
                    value={settings.event_name}
                    onChange={(e) => setSettings({ ...settings, event_name: e.target.value })}
                    placeholder="Enter event name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Fundraising Goal ($)</Label>
                  <Input
                    id="goal"
                    type="number"
                    min="0"
                    step="100"
                    value={settings.goal}
                    onChange={(e) => setSettings({ ...settings, goal: Number(e.target.value) })}
                    placeholder="Enter fundraising goal"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formatDateForInput(settings.start_date)}
                      onChange={(e) => handleDateChange(e.target.value || null, "start_date")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formatDateForInput(settings.end_date)}
                      onChange={(e) => handleDateChange(e.target.value || null, "end_date")}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="coming_soon_enabled">Coming Soon Page</Label>
                        <p className="text-sm text-muted-foreground">
                          Show a coming soon page instead of the full event site
                        </p>
                      </div>
                      <Switch
                        id="coming_soon_enabled"
                        checked={settings.coming_soon_enabled}
                        onCheckedChange={(checked) => setSettings({ ...settings, coming_soon_enabled: checked })}
                      />
                    </div>

                    {settings.coming_soon_enabled && (
                      <div className="space-y-4 p-4 bg-muted rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="go_live_date">Go Live Date</Label>
                          <div className="flex gap-2">
                            <Input
                              id="go_live_date"
                              type="datetime-local"
                              value={formatDateForInput(settings.go_live_date)}
                              onChange={(e) => handleDateChange(e.target.value || null, "go_live_date")}
                              className="flex-1"
                            />
                            <Button type="button" variant="default" onClick={handleGoLiveNow} disabled={isSaving}>
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Going Live...
                                </>
                              ) : (
                                "Go Live Now"
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Set when the event site should go live. Use "Go Live Now" to make it live immediately.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="coming_soon_description">Coming Soon Description</Label>
                          <RichTextEditor
                            id="coming_soon_description"
                            value={settings.coming_soon_description || ""}
                            onChange={(value) => setSettings({ ...settings, coming_soon_description: value || null })}
                            placeholder="Enter a description for the coming soon page..."
                          />
                          <p className="text-xs text-muted-foreground">This text will appear on the coming soon page</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Coming Soon Banner Image</Label>
                          {settings.coming_soon_banner_url && (
                            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border">
                              <img
                                src={settings.coming_soon_banner_url || "/placeholder.svg"}
                                alt="Coming Soon Banner"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <Button variant="outline" disabled={isUploading} asChild>
                              <label className="cursor-pointer">
                                {isUploading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Banner
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleComingSoonBannerUpload}
                                />
                              </label>
                            </Button>
                            {settings.coming_soon_banner_url && (
                              <Button
                                variant="ghost"
                                onClick={() => setSettings({ ...settings, coming_soon_banner_url: null })}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Optional banner image for the coming soon page
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* </CHANGE> */}

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Custom Domain</Label>
                    <Input
                      id="domain"
                      value={settings.domain || ""}
                      onChange={(e) => {
                        setSettings({ ...settings, domain: e.target.value || null })
                        setDomainChanged(e.target.value !== originalDomain)
                      }}
                      placeholder="auction.yoursite.com"
                    />
                    {domainChanged && settings.domain !== originalDomain && (
                      <p className="text-sm text-red-600 font-medium">
                        Warning: Changing the custom domain will break all existing links to your event!
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Optional: Connect a custom domain for your event site
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={settings.support_email || ""}
                      onChange={(e) => setSettings({ ...settings, support_email: e.target.value || null })}
                      placeholder="support@yourschool.com"
                    />
                    <p className="text-xs text-muted-foreground">Contact email for event attendees to reach support</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact Statistics</CardTitle>
                <CardDescription>Configure the statistics shown on your home page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="students">Students Supported</Label>
                    <Input
                      id="students"
                      type="number"
                      min="0"
                      value={fundingHero.students}
                      onChange={(e) => setFundingHero({ ...fundingHero, students: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donors">Generous Donors</Label>
                    <Input
                      id="donors"
                      type="number"
                      min="0"
                      value={fundingHero.donors}
                      onChange={(e) => setFundingHero({ ...fundingHero, donors: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show_programs">Show Programs Funded</Label>
                      <p className="text-sm text-muted-foreground">Display the programs funded statistic</p>
                    </div>
                    <Switch
                      id="show_programs"
                      checked={fundingHero.programs.show}
                      onCheckedChange={(checked) =>
                        setFundingHero({
                          ...fundingHero,
                          programs: { ...fundingHero.programs, show: checked },
                        })
                      }
                    />
                  </div>

                  {fundingHero.programs.show && (
                    <div className="space-y-2">
                      <Label htmlFor="programs_value">Programs Funded</Label>
                      <Input
                        id="programs_value"
                        type="number"
                        min="0"
                        value={fundingHero.programs.value}
                        onChange={(e) =>
                          setFundingHero({
                            ...fundingHero,
                            programs: { ...fundingHero.programs, value: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Logo</CardTitle>
                <CardDescription>Upload your event logo (displayed in navigation)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.logo_image_url && (
                  <div className="relative w-48 h-48 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                    <img
                      src={settings.logo_image_url || "/placeholder.svg"}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain p-4"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button variant="outline" disabled={isUploading} asChild>
                    <label className="cursor-pointer">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Logo
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </Button>
                  {settings.logo_image_url && (
                    <Button variant="ghost" onClick={() => setSettings({ ...settings, logo_image_url: null })}>
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hero Image & Description</CardTitle>
                <CardDescription>Upload a banner image and description for your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.hero_image_url && (
                  <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border">
                    <img
                      src={settings.hero_image_url || "/placeholder.svg"}
                      alt="Hero"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button variant="outline" disabled={isUploading} asChild>
                    <label className="cursor-pointer">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </Button>
                  {settings.hero_image_url && (
                    <Button variant="ghost" onClick={() => setSettings({ ...settings, hero_image_url: null })}>
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="hero_description">Hero Description</Label>
                  <RichTextEditor
                    id="hero_description"
                    value={settings.hero_description || ""}
                    onChange={(value) => setSettings({ ...settings, hero_description: value || null })}
                    placeholder="Enter a description for your event hero section..."
                  />
                  <p className="text-xs text-muted-foreground">This text will appear on your event's hero section</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact Story Image</CardTitle>
                <CardDescription>Upload an image for the "Your Bids Help Fund Our Programs" section</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.impact_image_url && (
                  <div className="relative aspect-video w-full max-w-lg overflow-hidden rounded-lg border">
                    <img
                      src={settings.impact_image_url || "/placeholder.svg"}
                      alt="Impact Story"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button variant="outline" disabled={isUploading} asChild>
                    <label className="cursor-pointer">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImpactImageUpload} />
                    </label>
                  </Button>
                  {settings.impact_image_url && (
                    <Button variant="ghost" onClick={() => setSettings({ ...settings, impact_image_url: null })}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This image will appear in the "Your Bids Help Fund Our Programs" section on the home page
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Theming</CardTitle>
                <CardDescription>Customize the look and feel of your event's home page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={themeTab} onValueChange={(value) => setThemeTab(value as "predefined" | "custom")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="predefined">Predefined Themes</TabsTrigger>
                    <TabsTrigger value="custom">Custom Theme</TabsTrigger>
                  </TabsList>

                  <TabsContent value="predefined" className="space-y-6">
                    <PredefinedThemes
                      onApplyTheme={(theme: ThemeTemplate) => {
                        setSettings({
                          ...settings,
                          theme_font_family_regular: theme.fonts.regular,
                          theme_font_family_bold: theme.fonts.bold,
                          theme_bg_color: theme.colors.lightBg,
                          theme_text_color: theme.colors.lightText,
                          theme_bold_text_color: theme.colors.lightBoldText,
                          theme_dark_bg_color: theme.colors.darkBg,
                          theme_dark_text_color: theme.colors.darkText,
                          theme_dark_bold_text_color: theme.colors.darkBoldText,
                          theme_button_light_bg: theme.buttons.lightBg,
                          theme_button_light_text: theme.buttons.lightText,
                          theme_button_dark_bg: theme.buttons.darkBg,
                          theme_button_dark_text: theme.buttons.darkText,
                          theme_mode: "not-set",
                        })
                        toast({
                          title: "Theme Applied",
                          description: `${theme.name} theme applied successfully. Customize further below or click Save.`,
                        })
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-6">
                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="theme_mode">Default Theme Mode</Label>
                        <select
                          id="theme_mode"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={settings?.theme_mode || "not-set"}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme_mode: e.target.value as "light" | "dark" | "not-set",
                            })
                          }
                        >
                          <option value="not-set">Not Set (Use Light/Dark Mode Defaults)</option>
                          <option value="light">Light Mode</option>
                          <option value="dark">Dark Mode</option>
                        </select>
                      </div>
                    </div>

                    {/* Light Mode Colors */}
                    {(settings?.theme_mode === "light" || settings?.theme_mode === "not-set") && (
                      <div className="space-y-4 p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold text-sm">Light Mode Colors</h3>
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="theme_bg_color">Background Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="theme_bg_color"
                                  type="color"
                                  value={settings.theme_bg_color || "#ffffff"}
                                  onChange={(e) => setSettings({ ...settings, theme_bg_color: e.target.value })}
                                  className="h-10 w-20"
                                />
                                <Input
                                  type="text"
                                  value={settings.theme_bg_color || "#ffffff"}
                                  onChange={(e) => setSettings({ ...settings, theme_bg_color: e.target.value })}
                                  placeholder="#ffffff"
                                  className="flex-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="theme_bg_image">Background Image (Optional)</Label>
                              {settings.theme_bg_image && (
                                <div className="relative w-full h-20 overflow-hidden rounded border mb-2">
                                  <img
                                    src={settings.theme_bg_image || "/placeholder.svg"}
                                    alt="Background"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={isUploading} asChild>
                                  <label className="cursor-pointer">
                                    {isUploading ? (
                                      <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="mr-2 h-3 w-3" />
                                        Upload
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        setIsUploading(true)
                                        try {
                                          const formData = new FormData()
                                          formData.append("file", file)
                                          const uploadResponse = await fetch("/api/blob/upload", {
                                            method: "POST",
                                            body: formData,
                                          })
                                          if (!uploadResponse.ok) throw new Error("Failed to upload")
                                          const { url } = await uploadResponse.json()
                                          setSettings((prev) => (prev ? { ...prev, theme_bg_image: url } : prev))
                                          toast({ title: "Success", description: "Background image uploaded" })
                                        } catch (error) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to upload image",
                                            variant: "destructive",
                                          })
                                        } finally {
                                          setIsUploading(false)
                                        }
                                      }}
                                    />
                                  </label>
                                </Button>
                                {settings.theme_bg_image && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSettings({ ...settings, theme_bg_image: null })}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="theme_text_color">Regular Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="theme_text_color"
                                  type="color"
                                  value={settings.theme_text_color || "#333333"}
                                  onChange={(e) => setSettings({ ...settings, theme_text_color: e.target.value })}
                                  className="h-10 w-20"
                                />
                                <Input
                                  type="text"
                                  value={settings.theme_text_color || "#333333"}
                                  onChange={(e) => setSettings({ ...settings, theme_text_color: e.target.value })}
                                  placeholder="#333333"
                                  className="flex-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="theme_bold_text_color">Bold Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="theme_bold_text_color"
                                  type="color"
                                  value={settings.theme_bold_text_color || "#000000"}
                                  onChange={(e) => setSettings({ ...settings, theme_bold_text_color: e.target.value })}
                                  className="h-10 w-20"
                                />
                                <Input
                                  type="text"
                                  value={settings.theme_bold_text_color || "#000000"}
                                  onChange={(e) => setSettings({ ...settings, theme_bold_text_color: e.target.value })}
                                  placeholder="#000000"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(settings?.theme_mode === "dark" || settings?.theme_mode === "not-set") && (
                      <div className="space-y-4 p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold text-sm">Dark Mode Colors</h3>
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="theme_dark_bg_color">Background Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="theme_dark_bg_color"
                                  type="color"
                                  value={settings.theme_dark_bg_color || "#0a0a0a"}
                                  onChange={(e) => setSettings({ ...settings, theme_dark_bg_color: e.target.value })}
                                  className="h-10 w-20"
                                />
                                <Input
                                  type="text"
                                  value={settings.theme_dark_bg_color || "#0a0a0a"}
                                  onChange={(e) => setSettings({ ...settings, theme_dark_bg_color: e.target.value })}
                                  placeholder="#0a0a0a"
                                  className="flex-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="theme_dark_bg_image">Background Image (Optional)</Label>
                              {settings.theme_dark_bg_image && (
                                <div className="relative w-full h-20 overflow-hidden rounded border mb-2">
                                  <img
                                    src={settings.theme_dark_bg_image || "/placeholder.svg"}
                                    alt="Background"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={isUploading} asChild>
                                  <label className="cursor-pointer">
                                    {isUploading ? (
                                      <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="mr-2 h-3 w-3" />
                                        Upload
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        setIsUploading(true)
                                        try {
                                          const formData = new FormData()
                                          formData.append("file", file)

                                          const response = await fetch("/api/blob/upload", {
                                            method: "POST",
                                            body: formData,
                                          })

                                          if (!response.ok) throw new Error("Upload failed")

                                          const { url } = await response.json()
                                          setSettings({ ...settings, theme_dark_bg_image: url })
                                        } catch (error) {
                                          toast({
                                            title: "Upload failed",
                                            description: "Failed to upload image",
                                            variant: "destructive",
                                          })
                                        } finally {
                                          setIsUploading(false)
                                        }
                                      }}
                                    />
                                  </label>
                                </Button>
                                {settings.theme_dark_bg_image && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSettings({ ...settings, theme_dark_bg_image: null })}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="theme_dark_text_color">Regular Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="theme_dark_text_color"
                                  type="color"
                                  value={settings.theme_dark_text_color || "#e5e5e5"}
                                  onChange={(e) => setSettings({ ...settings, theme_dark_text_color: e.target.value })}
                                  className="h-10 w-20"
                                />
                                <Input
                                  type="text"
                                  value={settings.theme_dark_text_color || "#e5e5e5"}
                                  onChange={(e) => setSettings({ ...settings, theme_dark_text_color: e.target.value })}
                                  placeholder="#e5e5e5"
                                  className="flex-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="theme_dark_bold_text_color">Bold Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="theme_dark_bold_text_color"
                                  type="color"
                                  value={settings.theme_dark_bold_text_color || "#ffffff"}
                                  onChange={(e) =>
                                    setSettings({ ...settings, theme_dark_bold_text_color: e.target.value })
                                  }
                                  className="h-10 w-20"
                                />
                                <Input
                                  type="text"
                                  value={settings.theme_dark_bold_text_color || "#ffffff"}
                                  onChange={(e) =>
                                    setSettings({ ...settings, theme_dark_bold_text_color: e.target.value })
                                  }
                                  placeholder="#ffffff"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button variant="outline" onClick={handleResetTheme} className="w-full bg-transparent">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Theme to Default
                    </Button>
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Preview</h3>
                  <EventThemePreview
                    bgColor={
                      settings?.theme_mode === "dark"
                        ? settings.theme_dark_bg_color || "#0a0a0a"
                        : settings?.theme_bg_color || "#ffffff"
                    }
                    bgImage={
                      settings?.theme_mode === "dark"
                        ? settings.theme_dark_bg_image || undefined
                        : settings?.theme_bg_image || undefined
                    }
                    fontFamily={settings?.theme_font_family || "Inter"}
                    fontFamilyRegular={settings?.theme_font_family_regular || "Nunito"}
                    fontFamilyBold={settings?.theme_font_family_bold || "Nunito"}
                    textColor={
                      settings?.theme_mode === "dark"
                        ? settings.theme_dark_text_color || "#e5e5e5"
                        : settings?.theme_text_color || "#333333"
                    }
                    boldTextColor={
                      settings?.theme_mode === "dark"
                        ? settings.theme_dark_bold_text_color || "#ffffff"
                        : settings?.theme_bold_text_color || "#000000"
                    }
                    mode={settings?.theme_mode || "light"}
                    eventName={settings?.event_name}
                    buttonLightBg={settings?.theme_button_light_bg || "#000000"}
                    buttonLightText={settings?.theme_button_light_text || "#ffffff"}
                    buttonDarkBg={settings?.theme_button_dark_bg || "#ffffff"}
                    buttonDarkText={settings?.theme_button_dark_text || "#000000"}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auction" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auction Settings</CardTitle>
                <CardDescription>Configure auction features and visibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_auction">Enable Auction</Label>
                    <p className="text-sm text-muted-foreground">Turn auction functionality on or off for this event</p>
                  </div>
                  <Switch
                    id="enable_auction"
                    checked={settings.enable_auction}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_auction: checked })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="go_live_date">Auction Go Live Date</Label>
                  <Input
                    id="go_live_date"
                    type="datetime-local"
                    value={formatDateForInput(settings.go_live_date)}
                    onChange={(e) => handleDateChange(e.target.value || null, "go_live_date")}
                  />
                  <p className="text-xs text-muted-foreground">
                    When should auction items become visible to attendees? Leave empty to show items immediately.
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_silent_auction">Silent Auction Mode</Label>
                    <p className="text-sm text-muted-foreground">Hide current bid amounts from bidders</p>
                  </div>
                  <Switch
                    id="is_silent_auction"
                    checked={settings.is_silent_auction}
                    onCheckedChange={(checked) => setSettings({ ...settings, is_silent_auction: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_raffles">Enable Raffles</Label>
                    <p className="text-sm text-muted-foreground">Allow raffle ticket sales</p>
                  </div>
                  <Switch
                    id="enable_raffles"
                    checked={settings.enable_raffles}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_raffles: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="request_attendance">Request Attendance</Label>
                    <p className="text-sm text-muted-foreground">Ask users to RSVP to your event</p>
                  </div>
                  <Switch
                    id="request_attendance"
                    checked={settings.request_attendance}
                    onCheckedChange={(checked) => setSettings({ ...settings, request_attendance: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_user_item_submission">Allow User Item Submissions</Label>
                    <p className="text-sm text-muted-foreground">Users can submit items for auction approval</p>
                  </div>
                  <Switch
                    id="allow_user_item_submission"
                    checked={settings.allow_user_item_submission}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_user_item_submission: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="user_can_set_item_price">User Can Set Item Price</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to set starting bid when submitting items
                    </p>
                  </div>
                  <Switch
                    id="user_can_set_item_price"
                    checked={settings.user_can_set_item_price}
                    onCheckedChange={(checked) => setSettings({ ...settings, user_can_set_item_price: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Photo Gallery Settings</CardTitle>
                <CardDescription>Configure the photo gallery feature for your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_gallery">Enable Photo Gallery</Label>
                    <p className="text-sm text-muted-foreground">Allow users to upload and view event photos</p>
                  </div>
                  <Switch
                    id="enable_gallery"
                    checked={settings.enable_gallery}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_gallery: checked })}
                  />
                </div>

                {settings.enable_gallery && (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="gallery_title">Gallery Page Title</Label>
                      <Input
                        id="gallery_title"
                        value={settings.gallery_title || ""}
                        onChange={(e) => setSettings({ ...settings, gallery_title: e.target.value })}
                        placeholder="Photo Gallery"
                      />
                      <p className="text-xs text-muted-foreground">The main heading displayed on the gallery page</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gallery_description">Gallery Description</Label>
                      <RichTextEditor
                        id="gallery_description"
                        value={settings.gallery_description || ""}
                        onChange={(value) => setSettings({ ...settings, gallery_description: value || null })}
                        placeholder="Share and view event photos"
                      />
                      <p className="text-xs text-muted-foreground">A brief description shown below the title</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Handling</CardTitle>
                <CardDescription>Configure how auction payments are processed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_charge">Automatically Charge Winners</Label>
                    <p className="text-sm text-muted-foreground">
                      Charge winners' saved payment methods when auction ends
                    </p>
                  </div>
                  <Switch
                    id="auto_charge"
                    checked={settings.auto_charge}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        auto_charge: checked,
                        invoice_enabled: checked ? false : settings.invoice_enabled,
                      })
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="invoice_enabled">Send Invoices Manually</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate invoices for admin review instead of auto-charging
                    </p>
                  </div>
                  <Switch
                    id="invoice_enabled"
                    checked={settings.invoice_enabled}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        invoice_enabled: checked,
                        auto_charge: checked ? false : settings.auto_charge,
                      })
                    }}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="payment_deadline_hours">Payment Deadline (hours after auction ends)</Label>
                  <Input
                    id="payment_deadline_hours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.payment_deadline_hours || 48}
                    onChange={(e) => setSettings({ ...settings, payment_deadline_hours: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Winners must complete payment within this timeframe</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Pickup/Shipping Instructions</CardTitle>
                <CardDescription>
                  Set default instructions that apply to all auction items (unless overridden at item level)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_instructions">Pickup Instructions</Label>
                  <RichTextEditor
                    id="pickup_instructions"
                    value={settings.pickup_instructions || ""}
                    onChange={(value) => setSettings({ ...settings, pickup_instructions: value || null })}
                    placeholder="Enter default pickup/shipping instructions for winners..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Include pickup location, dates/times, contact information, and any special requirements. Individual
                    auction items can override these instructions if needed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Donation Response Message</CardTitle>
                <CardDescription>
                  Customize the thank you message shown to donors after they complete a donation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="donation_response_text">Thank You Message</Label>
                  <div className="border rounded-md">
                    {/* Simple formatting toolbar */}
                    <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("**")}
                        title="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("*")}
                        title="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("- ", "")}
                        title="Bullet List"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertFormatting("1. ", "")}
                        title="Numbered List"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      ref={donationEditorRef}
                      id="donation_response_text"
                      value={settings.donation_response_text || ""}
                      onChange={(e) => setSettings({ ...settings, donation_response_text: e.target.value || null })}
                      placeholder="Enter a personalized thank you message for donors..."
                      rows={6}
                      className="border-0 rounded-t-none resize-none focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This message will be displayed to donors on the success page after they complete their donation
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Settings</CardTitle>
                <CardDescription>Enable or disable features for your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_auction">Enable Auction</Label>
                    <p className="text-sm text-muted-foreground">Allow bidding on auction items</p>
                  </div>
                  <Switch
                    id="enable_auction"
                    checked={settings.enable_auction !== false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_auction: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_voting">Enable Voting</Label>
                    <p className="text-sm text-muted-foreground">Allow attendees to vote on polls</p>
                  </div>
                  <Switch
                    id="enable_voting"
                    checked={settings.enable_voting || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_voting: checked })}
                  />
                </div>

                <Separator />
                {/* ... existing code ... */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_shop">Enable Shop</Label>
                    <p className="text-sm text-muted-foreground">Allow users to purchase items directly</p>
                  </div>
                  <Switch
                    id="enable_shop"
                    checked={settings.enable_shop}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_shop: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_qr_codes">Show QR Codes</Label>
                    <p className="text-sm text-muted-foreground">Display QR codes for auction items</p>
                  </div>
                  <Switch
                    id="show_qr_codes"
                    checked={settings.show_qr_codes}
                    onCheckedChange={(checked) => setSettings({ ...settings, show_qr_codes: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_likes">Allow Likes</Label>
                    <p className="text-sm text-muted-foreground">Allow users to like auction items</p>
                  </div>
                  <Switch
                    id="allow_likes"
                    checked={settings.allow_likes}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_likes: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_abandoned_cart_reminders">Abandoned Cart Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send reminder emails for abandoned shop carts</p>
                  </div>
                  <Switch
                    id="enable_abandoned_cart_reminders"
                    checked={settings.enable_abandoned_cart_reminders || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_abandoned_cart_reminders: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="max_bidding">Max Bidding</Label>
                    <p className="text-sm text-muted-foreground">Enable maximum bid limits</p>
                  </div>
                  <Switch
                    id="max_bidding"
                    checked={settings.max_bidding}
                    onCheckedChange={(checked) => setSettings({ ...settings, max_bidding: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_bids">Auto Bids</Label>
                    <p className="text-sm text-muted-foreground">Allow automatic bidding</p>
                  </div>
                  <Switch
                    id="auto_bids"
                    checked={settings.auto_bids}
                    onCheckedChange={(checked) => setSettings({ ...settings, auto_bids: checked })}
                  />
                </div>

                <Separator />

                {/* Re-add enable_voting toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_voting">Enable Voting</Label>
                    <p className="text-sm text-muted-foreground">Allow users to vote on items or categories</p>
                  </div>
                  <Switch
                    id="enable_voting"
                    checked={settings.enable_voting}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_voting: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_registration">Enable Registration</Label>
                    <p className="text-sm text-muted-foreground">Allow users to register for the event</p>
                  </div>
                  <Switch
                    id="enable_registration"
                    checked={settings.enable_registration}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_registration: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_donation">Enable Donations</Label>
                    <p className="text-sm text-muted-foreground">Allow users to make direct donations</p>
                  </div>
                  <Switch
                    id="enable_donation"
                    checked={settings.enable_donation}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_donation: checked })}
                  />
                </div>

                <Separator />

                {/* Add Switch for enable_sponsor */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_sponsor">Enable Sponsors</Label>
                    <p className="text-sm text-muted-foreground">Allow users to become sponsors</p>
                  </div>
                  <Switch
                    id="enable_sponsor"
                    checked={settings.enable_sponsor}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_sponsor: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Additional Info Sections</CardTitle>
                    <CardDescription>Add custom sections to display on your event home page</CardDescription>
                  </div>
                  <Switch
                    checked={!!settings.additional_sections && (settings.additional_sections as any[]).length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSettings({
                          ...settings,
                          additional_sections: [
                            ...(settings.additional_sections as any[]),
                            { id: Date.now(), header: "", body: "" },
                          ],
                        })
                      } else {
                        setSettings({ ...settings, additional_sections: [] })
                      }
                    }}
                  />
                </div>
              </CardHeader>
              {(settings.additional_sections as any[])?.length > 0 && (
                <CardContent className="space-y-4">
                  {(settings.additional_sections as any[]).map((section: any, idx: number) => (
                    <div key={section.id} className="space-y-4 rounded-lg border p-4">
                      <div className="space-y-2">
                        <Label htmlFor={`section-header-${section.id}`}>Section Header</Label>
                        <Input
                          id={`section-header-${section.id}`}
                          value={section.header || ""}
                          onChange={(e) => {
                            const updated = [...(settings.additional_sections as any[])]
                            updated[idx] = { ...updated[idx], header: e.target.value }
                            setSettings({ ...settings, additional_sections: updated })
                          }}
                          placeholder="Section title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`section-body-${section.id}`}>Section Body</Label>
                        <RichTextEditor
                          value={section.body || ""}
                          onChange={(value) => {
                            const updated = [...(settings.additional_sections as any[])]
                            updated[idx] = { ...updated[idx], body: value || "" }
                            setSettings({ ...settings, additional_sections: updated })
                          }}
                          placeholder="Section content..."
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const updated = (settings.additional_sections as any[]).filter((_, i) => i !== idx)
                          setSettings({ ...settings, additional_sections: updated })
                        }}
                      >
                        Remove Section
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSettings({
                        ...settings,
                        additional_sections: [
                          ...(settings.additional_sections as any[]),
                          { id: Date.now(), header: "", body: "" },
                        ],
                      })
                    }}
                  >
                    Add Another Section
                  </Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 border rounded-lg shadow-lg">
          <Button variant="outline" onClick={handleResetTheme} disabled={isSaving || isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Theme to Default
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save All Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
