"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface AuctionContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  auctionId: string
  auctionTitle: string
}

export function AuctionContactModal({ open, onOpenChange, auctionId, auctionTitle }: AuctionContactModalProps) {
  const { user } = useAuth()
  const { event } = useEvent()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize message with auction details
  const initialMessage = `Question about the auction Item ${auctionId}: ${auctionTitle}\n\n`

  // Reset message when modal opens
  useState(() => {
    if (open && message === "") {
      setMessage(initialMessage)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Please log in to send a message")
      return
    }

    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/events/${event?.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send message")
      }

      toast.success("Message sent to auction admin!")
      setMessage(initialMessage)
      onOpenChange(false)
    } catch (error: any) {
      console.error("[v0] Failed to send message:", error)
      toast.error(error.message || "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Auction Admin</DialogTitle>
          <DialogDescription>
            Send a message to the auction administrators about this item. They will respond as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your question or message here..."
              className="min-h-[150px]"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
