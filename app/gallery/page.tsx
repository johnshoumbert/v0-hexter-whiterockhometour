"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, X, ImageIcon, Heart, MessageCircle, Send, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { LoginModal } from "@/components/login-modal"

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

interface Like {
  id: string
  user_id: string
  user_name: string
  user_image: string | null
  created_at: string
}

interface Comment {
  id: string
  comment_text: string
  user_id: string
  user_name: string
  user_image: string | null
  created_at: string
  updated_at: string
}

interface EventSettings {
  gallery_title: string
  gallery_description: string
}

export default function GalleryPage() {
  const { event, isLoading: eventLoading } = useEvent()
  const { user } = useAuth()
  const { toast } = useToast()

  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState("")

  const [selectedImageData, setSelectedImageData] = useState<GalleryImage | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [likes, setLikes] = useState<Like[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState("")
  const [isLiked, setIsLiked] = useState(false)
  const [isLoadingLikes, setIsLoadingLikes] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  const [eventSettings, setEventSettings] = useState<EventSettings>({
    gallery_title: "Photo Gallery",
    gallery_description: "Share and view event photos",
  })

  const [loginModalOpen, setLoginModalOpen] = useState(false)

  useEffect(() => {
    if (!eventLoading && event) {
      fetchImages()
      fetchEventSettings()
    }
  }, [eventLoading, event])

  const fetchEventSettings = async () => {
    if (!event) return

    try {
      const response = await fetch(`/api/events/${event.id}`)
      if (!response.ok) throw new Error("Failed to fetch event settings")
      const data = await response.json()
      setEventSettings({
        gallery_title: data.event.gallery_title || "Photo Gallery",
        gallery_description: data.event.gallery_description || "Share and view event photos",
      })
    } catch (error) {
      console.error("[v0] Error fetching event settings:", error)
    }
  }

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

  const fetchLikesAndComments = async (imageId: string) => {
    if (!event) return

    setIsLoadingLikes(true)
    setIsLoadingComments(true)

    try {
      const [likesRes, commentsRes] = await Promise.all([
        fetch(`/api/events/${event.id}/gallery/${imageId}/likes`),
        fetch(`/api/events/${event.id}/gallery/${imageId}/comments`),
      ])

      if (likesRes.ok) {
        const likesData = await likesRes.json()
        setLikes(likesData.likes || [])
        setIsLiked(user ? likesData.likes.some((like: Like) => like.user_id === user.id) : false)
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json()
        setComments(commentsData.comments || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching likes and comments:", error)
    } finally {
      setIsLoadingLikes(false)
      setIsLoadingComments(false)
    }
  }

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImageData(image)
    setIsModalOpen(true)
    fetchLikesAndComments(image.id)
  }

  const handleLike = async () => {
    if (!user) {
      setLoginModalOpen(true)
      return
    }

    if (!selectedImageData || !event) return

    try {
      const response = await fetch(`/api/events/${event.id}/gallery/${selectedImageData.id}/likes`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to toggle like")

      const data = await response.json()
      setIsLiked(data.liked)

      // Refresh likes
      await fetchLikesAndComments(selectedImageData.id)

      toast({
        title: data.liked ? "Liked" : "Unliked",
        description: data.liked ? "Photo liked successfully" : "Photo unliked successfully",
      })
    } catch (error) {
      console.error("[v0] Error toggling like:", error)
      toast({
        title: "Error",
        description: "Failed to toggle like",
        variant: "destructive",
      })
    }
  }

  const handleComment = async () => {
    if (!user) {
      setLoginModalOpen(true)
      return
    }

    if (!selectedImageData || !event) return

    if (!commentText.trim()) return

    try {
      const response = await fetch(`/api/events/${event.id}/gallery/${selectedImageData.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: commentText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to post comment")
      }

      setCommentText("")
      await fetchLikesAndComments(selectedImageData.id)

      toast({
        title: "Success",
        description: "Comment posted successfully",
      })
    } catch (error) {
      console.error("[v0] Error posting comment:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to post comment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!event || !selectedImageData) return
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const response = await fetch(`/api/events/${event.id}/gallery/${selectedImageData.id}/comments/${commentId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete comment")

      await fetchLikesAndComments(selectedImageData.id)

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      })
    } catch (error) {
      console.error("[v0] Error deleting comment:", error)
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      })
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedImage || !event || !user) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedImage)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error("Failed to upload image")
      const { url } = await uploadResponse.json()

      const saveResponse = await fetch(`/api/events/${event.id}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url, description }),
      })

      if (!saveResponse.ok) throw new Error("Failed to save image")

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })

      setSelectedImage(null)
      setPreviewUrl(null)
      setDescription("")
      setIsDialogOpen(false)

      await fetchImages()
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
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
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{eventSettings.gallery_title}</h1>
          <p className="text-muted-foreground mt-2">{eventSettings.gallery_description}</p>
        </div>

        {user && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Photo</DialogTitle>
                <DialogDescription>Share a photo from the event with the community</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="image">Image</Label>
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedImage(null)
                          setPreviewUrl(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-12 h-12 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input id="image" type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description for your photo..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={handleUpload} disabled={!selectedImage || isUploading} className="w-full">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
            <p className="text-muted-foreground text-center mb-4">Be the first to share a photo from the event!</p>
            {user && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className="overflow-hidden group cursor-pointer"
              onClick={() => handleImageClick(image)}
            >
              <div className="relative aspect-square">
                <img
                  src={image.image_url || "/placeholder.svg"}
                  alt={image.description || "Gallery image"}
                  className="w-full h-full object-cover"
                />
                {(user?.id === image.user_id || user?.is_admin) && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(image.id)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardContent className="p-3">
                {image.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{image.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
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
                  <span className="text-xs text-muted-foreground truncate">{image.uploader_name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedImageData && (
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image Section */}
              <div className="relative bg-black flex items-center justify-center">
                <img
                  src={selectedImageData.image_url || "/placeholder.svg"}
                  alt={selectedImageData.description || "Gallery image"}
                  className="w-full h-full object-contain max-h-[90vh]"
                />
              </div>

              {/* Interaction Section */}
              <div className="flex flex-col h-[90vh]">
                <DialogHeader className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedImageData.uploader_image || undefined}
                        alt={selectedImageData.uploader_name}
                      />
                      <AvatarFallback>
                        {selectedImageData.uploader_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-base">{selectedImageData.uploader_name}</DialogTitle>
                      {selectedImageData.description && (
                        <p className="text-sm text-muted-foreground">{selectedImageData.description}</p>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                {/* Comments Section */}
                <ScrollArea className="flex-1 p-4">
                  {isLoadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No comments yet</p>
                      <p className="text-sm text-muted-foreground">Be the first to comment!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user_image || undefined} alt={comment.user_name} />
                            <AvatarFallback className="text-xs">
                              {comment.user_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-semibold">{comment.user_name}</p>
                                <p className="text-sm text-muted-foreground">{comment.comment_text}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {(user?.id === comment.user_id || user?.is_admin) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <Separator />

                {/* Like and Comment Actions */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={handleLike}
                      disabled={!user || isLoadingLikes}
                    >
                      <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                      <span>{likes.length}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>{comments.length}</span>
                    </Button>
                  </div>

                  {user ? (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        className="resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleComment()
                          }
                        }}
                      />
                      <Button onClick={handleComment} disabled={!commentText.trim()} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">Log in to like and comment</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => {
          // Refresh the current image data after login
          if (selectedImageData) {
            fetchLikesAndComments(selectedImageData.id)
          }
        }}
      />
    </div>
  )
}
