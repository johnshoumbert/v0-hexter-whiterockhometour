"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

export function ThemeSettingsPanel() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [eventMessage, setEventMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchTheme()
  }, [])

  const fetchTheme = async () => {
    try {
      const response = await fetch("/api/themes")
      if (response.ok) {
        const { theme } = await response.json()
        setPrimaryColor(theme.primary_color || "#3b82f6")
        setSecondaryColor(theme.secondary_color || "#8b5cf6")
        setLogoUrl(theme.logo_url)
        setEventMessage(theme.event_message || "")
      }
    } catch (error) {
      console.error("[v0] Failed to fetch theme:", error)
      toast.error("Failed to load theme settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to upload logo")
      }

      const { url } = await response.json()
      setLogoUrl(url)
      toast.success("Logo uploaded successfully")
    } catch (error) {
      console.error("[v0] Error uploading logo:", error)
      toast.error("Failed to upload logo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/themes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl,
          event_message: eventMessage,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save theme")
      }

      toast.success("Theme settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving theme:", error)
      toast.error("Failed to save theme settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Color Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>Customize your platform's color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-4">
              <Input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-12 w-20"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-4">
              <Input
                id="secondary-color"
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-12 w-20"
              />
              <Input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Event Logo</CardTitle>
          <CardDescription>Upload your event or organization logo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed bg-muted overflow-hidden">
            {logoUrl ? (
              <Image src={logoUrl || "/placeholder.svg"} alt="Event logo" fill className="object-contain p-4" />
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Click to upload logo</p>
              </div>
            )}
          </div>
          <Input
            type="file"
            onChange={handleLogoUpload}
            accept="image/*"
            disabled={isUploading}
            className="cursor-pointer"
          />
        </CardContent>
      </Card>

      {/* Event Message */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Event Message</CardTitle>
          <CardDescription>Set the hero message for your auction event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={eventMessage}
            onChange={(e) => setEventMessage(e.target.value)}
            placeholder="Welcome to our charity auction! Bid on amazing items and support a great cause."
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your changes will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 rounded-lg border p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: primaryColor }} />
              <div>
                <h3 className="font-semibold">Primary Color</h3>
                <p className="text-sm text-muted-foreground">Used for buttons and accents</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: secondaryColor }} />
              <div>
                <h3 className="font-semibold">Secondary Color</h3>
                <p className="text-sm text-muted-foreground">Used for highlights and badges</p>
              </div>
            </div>
            {eventMessage && (
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium">{eventMessage}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="lg:col-span-2">
        <Button onClick={handleSave} disabled={isSaving || isUploading} className="w-full" size="lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Theme Settings"
          )}
        </Button>
      </div>
    </div>
  )
}
