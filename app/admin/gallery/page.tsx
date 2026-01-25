"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, X, ImageIcon, ExternalLink } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface GalleryImage {
  id: string
  event_id: string
  user_id: string
  image_url: string
  description: string | null
  display_order: number
  created_at: string
  uploader_name: string
  uploader_image: string | null
  uploader_email: string
}

export default function AdminGalleryPage() {
  const { event, isLoading: eventLoading } = useEvent()
  const { toast } = useToast()

  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!eventLoading && event) {
      fetchImages()
    }
  }, [eventLoading, event])

  const fetchImages = async () => {
    if (!event) return

    try {
      const response = await fetch(`/api/events/${event.id}/gallery`)
      if (!response.ok) throw new Error("Failed to fetch images")
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("[v0] Error fetching gallery images:", error)
      toast({
        title: "Error",
        description: "Failed to load gallery images",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!event) return
    if (!confirm("Are you sure you want to delete this image?")) return

    try {
      const response = await fetch(`/api/events/${event.id}/gallery/${imageId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete image")

      toast({
        title: "Success",
        description: "Image deleted successfully",
      })

      await fetchImages()
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    }
  }

  if (eventLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No event found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photo Gallery Management</h1>
          <p className="text-muted-foreground">Manage event photos uploaded by users</p>
        </div>
        <Button asChild>
          <a href="/gallery" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Gallery
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gallery Images ({images.length})</CardTitle>
          <CardDescription>All photos uploaded by users for this event</CardDescription>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
              <p className="text-muted-foreground text-center">Photos uploaded by users will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {images.map((image) => (
                  <TableRow key={image.id}>
                    <TableCell>
                      <a href={image.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={image.image_url || "/placeholder.svg"}
                          alt={image.description || "Gallery image"}
                          className="w-16 h-16 object-cover rounded-md hover:opacity-75 transition-opacity"
                        />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm line-clamp-2">{image.description || "No description"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={image.uploader_image || undefined} alt={image.uploader_name} />
                          <AvatarFallback className="text-xs">
                            {image.uploader_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{image.uploader_name}</p>
                          <p className="text-xs text-muted-foreground">{image.uploader_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{new Date(image.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(image.created_at).toLocaleTimeString()}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(image.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
