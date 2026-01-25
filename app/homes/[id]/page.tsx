"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Heart, MapPin, Share2, ChevronLeft, ChevronRight, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { ShareModal } from "@/components/share-modal"

interface Home {
  id: string
  name: string
  address: string
  sponsor: string
  short_description: string
  full_description: string
  item_images: string[]
  directions_url: string
  display_order: number
}

interface Comment {
  id: string
  comment: string
  created_at: string
  user_id: string
  user_name: string
  user_email: string
}

export default function HomeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [home, setHome] = useState<Home | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [likesCount, setLikesCount] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    fetchHomeDetails()
    fetchComments()
    fetchLikes()
  }, [params.id])

  const fetchHomeDetails = async () => {
    try {
      const res = await fetch(`/api/homes/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        // Parse item_images if it's a JSON string
        const parsedHome = {
          ...data,
          item_images: typeof data.item_images === 'string' 
            ? JSON.parse(data.item_images || '[]')
            : Array.isArray(data.item_images)
            ? data.item_images
            : []
        }
        setHome(parsedHome)
      }
    } catch (error) {
      console.error("Error fetching home:", error)
      toast({
        title: "Error",
        description: "Failed to load home details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      console.log("[v0] Fetching comments for home:", params.id)
      const res = await fetch(`/api/homes/${params.id}/comments`)
      console.log("[v0] Comments API response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Comments data:", data)
        setComments(data.comments || [])
      } else {
        const errorText = await res.text()
        console.error("[v0] Failed to fetch comments:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching comments:", error)
    }
  }

  const fetchLikes = async () => {
    try {
      console.log("[v0] Fetching likes for home:", params.id)
      const res = await fetch(`/api/homes/${params.id}/likes`)
      console.log("[v0] Likes API response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Likes data:", data)
        setLikesCount(data.count || 0)
        setHasLiked(data.hasLiked || false)
      } else {
        const errorText = await res.text()
        console.error("[v0] Failed to fetch likes:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching likes:", error)
    }
  }

  const handleCommentSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      })
      return
    }

    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      console.log("[v0] Posting comment to home:", params.id)
      const res = await fetch(`/api/homes/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      })

      console.log("[v0] Comment post response status:", res.status)

      if (res.ok) {
        setNewComment("")
        fetchComments()
        toast({
          title: "Success",
          description: "Comment added",
        })
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("[v0] Failed to add comment:", errorData)
        throw new Error(errorData.error || "Failed to add comment")
      }
    } catch (error) {
      console.error("[v0] Error adding comment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const res = await fetch(`/api/homes/${params.id}/comments/${commentId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchComments()
        toast({
          title: "Success",
          description: "Comment deleted",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      })
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like homes",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Toggling like for home:", params.id)
      const res = await fetch(`/api/homes/${params.id}/likes`, {
        method: "POST",
      })

      console.log("[v0] Like toggle response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Like toggle data:", data)
        setHasLiked(data.liked)
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1)
        toast({
          title: data.liked ? "Added to favorites" : "Removed from favorites",
        })
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("[v0] Failed to toggle like:", errorData)
        throw new Error(errorData.error || "Failed to toggle like")
      }
    } catch (error) {
      console.error("[v0] Error toggling like:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle like",
        variant: "destructive",
      })
    }
  }

  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  const nextImage = () => {
    if (home?.item_images && home.item_images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % home.item_images.length)
    }
  }

  const prevImage = () => {
    if (home?.item_images && home.item_images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + home.item_images.length) % home.item_images.length)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading home details...</p>
        </div>
      </div>
    )
  }

  if (!home) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Home not found</p>
          <Button onClick={() => router.push("/the-homes")}>Back to Homes</Button>
        </div>
      </div>
    )
  }

  const hasImages = home.item_images && home.item_images.length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push("/the-homes")} className="mb-6">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Homes
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-4">
              {hasImages ? (
                <>
                  <Image
                    src={home.item_images[currentImageIndex]}
                    alt={home.name}
                    fill
                    className="object-cover"
                    priority
                  />
                  {home.item_images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No images available</p>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {hasImages && home.item_images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {home.item_images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative aspect-square rounded overflow-hidden ${
                      idx === currentImageIndex ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <Image src={img} alt={`${home.name} ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Home Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{home.name}</h1>
              {home.address && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {home.address}
                </p>
              )}
            </div>

            {home.sponsor && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">SPONSORED BY</p>
                <p className="text-lg font-semibold">{home.sponsor}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant={hasLiked ? "default" : "outline"}
                onClick={handleLike}
                className="flex-1"
              >
                <Heart className={`h-4 w-4 mr-2 ${hasLiked ? "fill-current" : ""}`} />
                {likesCount} {likesCount === 1 ? "Like" : "Likes"}
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              {home.directions_url && (
                <Button variant="outline" asChild>
                  <a href={home.directions_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Directions
                  </a>
                </Button>
              )}
            </div>

            {/* Description */}
            <div>
              {home.short_description && (
                <p className="text-lg font-semibold mb-2">{home.short_description}</p>
              )}
              {home.full_description && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {home.full_description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-12 max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>

          {/* Add Comment */}
          {user ? (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-4"
                  rows={3}
                />
                <Button onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()}>
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to leave a comment
                </p>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{comment.user_name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {(user?.id === comment.user_id || user?.role === "admin") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line">{comment.comment}</p>
                </CardContent>
              </Card>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {home && (
        <ShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={home.name}
          description={home.short_description || home.full_description}
        />
      )}
    </div>
  )
}
