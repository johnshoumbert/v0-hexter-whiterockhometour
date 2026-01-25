"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, User, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    profile_image: "",
  })

  // Image cropping state
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    if (!user?.id) {
      console.error("[v0] Cannot fetch profile: user ID is missing")
      return
    }

    try {
      console.log("[v0] Fetching profile for user:", user.id)
      const response = await fetch(`/api/users/${user.id}`)

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.error || "Failed to fetch profile")
        } else {
          throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      console.log("[v0] Profile fetched successfully:", data.user.name)
      setFormData({
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        profile_image: data.user.profile_image || "",
      })
    } catch (error) {
      console.error("[v0] Failed to fetch profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load profile",
        variant: "destructive",
      })
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string)
        setShowImageDialog(true)
        setZoom(1)
        setPosition({ x: 0, y: 0 })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleSaveImage = async () => {
    if (!selectedImage || !canvasRef.current || !imageRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to desired output (300x300 for profile image)
    const outputSize = 300
    canvas.width = outputSize
    canvas.height = outputSize

    const img = imageRef.current
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()

    // Calculate the visible area dimensions
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Get the natural image dimensions
    const imgNaturalWidth = img.naturalWidth
    const imgNaturalHeight = img.naturalHeight

    // Calculate how the image is displayed (object-contain behavior)
    const imgDisplayRatio = Math.min(containerWidth / imgNaturalWidth, containerHeight / imgNaturalHeight)
    const displayWidth = imgNaturalWidth * imgDisplayRatio
    const displayHeight = imgNaturalHeight * imgDisplayRatio

    // Calculate the center of the container
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2

    // The crop circle is 256px diameter (w-64 h-64 = 16rem = 256px)
    const cropDiameter = 256
    const cropRadius = cropDiameter / 2

    // Calculate the crop area in display coordinates
    const cropLeft = centerX - cropRadius
    const cropTop = centerY - cropRadius

    // Convert display coordinates to natural image coordinates
    // Account for zoom and position
    const scaleFactor = imgNaturalWidth / (displayWidth * zoom)

    // Calculate where the image starts in the container (centered)
    const imgStartX = (containerWidth - displayWidth * zoom) / 2 + position.x
    const imgStartY = (containerHeight - displayHeight * zoom) / 2 + position.y

    // Calculate crop in natural image coordinates
    const cropX = (cropLeft - imgStartX) * scaleFactor
    const cropY = (cropTop - imgStartY) * scaleFactor
    const cropSize = cropDiameter * scaleFactor

    // Draw the cropped image
    ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize)

    // Convert canvas to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) return

        try {
          setIsLoading(true)

          // Upload to blob storage
          const formData = new FormData()
          formData.append("file", blob, "profile-image.jpg")

          const uploadResponse = await fetch("/api/blob/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload image")
          }

          const { url } = await uploadResponse.json()

          // Update form data with new image URL
          setFormData((prev) => ({ ...prev, profile_image: url }))
          setShowImageDialog(false)
          setSelectedImage(null)

          toast({
            title: "Success",
            description: "Profile image updated. Click Save Changes to apply.",
          })
        } catch (error) {
          console.error("[v0] Error uploading image:", error)
          toast({
            title: "Error",
            description: "Failed to upload image",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      },
      "image/jpeg",
      0.9,
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("[v0] Submitting profile update:", formData)

      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        await refreshUser()
      } else {
        const error = await response.json()
        console.error("[v0] Error response:", error)
        throw new Error(error.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {formData.profile_image ? (
                  <Image
                    src={formData.profile_image || "/placeholder.svg"}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                {formData.profile_image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, profile_image: "" })}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Image Crop Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjust Your Photo</DialogTitle>
            <DialogDescription>
              Drag to reposition and use the slider to zoom. The circular area will be saved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Preview */}
            <div
              ref={containerRef}
              className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {selectedImage && (
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: "center",
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <img
                    ref={imageRef}
                    src={selectedImage || "/placeholder.svg"}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-2">
              <Label>Zoom: {zoom.toFixed(1)}x</Label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImageDialog(false)
                  setSelectedImage(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveImage} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Save Photo"
                )}
              </Button>
            </div>
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
