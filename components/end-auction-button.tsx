"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, CircleStop } from "lucide-react"
import { toast } from "sonner"

interface EndAuctionButtonProps {
  eventId: string
  onSuccess?: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function EndAuctionButton({
  eventId,
  onSuccess,
  variant = "destructive",
  size = "default",
  className,
}: EndAuctionButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  const handleEndAuctions = async () => {
    try {
      setIsEnding(true)

      const response = await fetch(`/api/events/${eventId}/auctions/end-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to end auctions")
      }

      const data = await response.json()

      toast.success("Auctions ended successfully!", {
        description: `${data.results.totalWinners} winners notified. ${data.results.charged} charged, ${data.results.failed} failed, ${data.results.skipped} skipped.`,
      })

      setShowDialog(false)
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Failed to end auctions:", error)
      toast.error(error instanceof Error ? error.message : "Failed to end auctions")
    } finally {
      setIsEnding(false)
    }
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setShowDialog(true)}>
        <CircleStop className="mr-2 h-4 w-4" />
        End All Auctions
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End All Auctions?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will immediately end all auction items for this event and perform the following actions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Set all auction items to "ended" status</li>
                <li>Notify all winners via email</li>
                <li>Create winner records in the database</li>
                <li>Charge winners' saved payment methods (if event is not set to manual invoicing)</li>
              </ul>
              <p className="text-destructive font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndAuctions}
              disabled={isEnding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isEnding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ending...
                </>
              ) : (
                "End All Auctions"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
