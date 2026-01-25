"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, CheckCircle2, User, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Winner {
  id: number
  final_bid: string
  payment_status: string
  pickup_status: string
  pickup_date: string | null
  auction_title: string
  auction_description: string
  auction_image_url: string
  winner_name: string
  winner_email: string
}

export default function AdminPickupPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [winner, setWinner] = useState<Winner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchWinnerDetails()
  }, [params.id])

  const fetchWinnerDetails = async () => {
    try {
      const response = await fetch(`/api/winners/${params.id}/pickup`)
      if (response.ok) {
        const data = await response.json()
        setWinner(data.winner)
      } else {
        toast({
          title: "Error",
          description: "Failed to load winner details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to fetch winner:", error)
      toast({
        title: "Error",
        description: "Failed to load winner details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReleaseItem = async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/winners/${params.id}/pickup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item released to winner",
        })
        fetchWinnerDetails()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to release item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to release item:", error)
      toast({
        title: "Error",
        description: "Failed to release item",
        variant: "destructive",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!winner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Winner not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Pickup Confirmation
          </CardTitle>
          <CardDescription>Release auction item to winner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Item Details */}
          <div className="space-y-4">
            <div className="aspect-video relative rounded-lg overflow-hidden">
              <img
                src={winner.auction_image_url || "/placeholder.svg?height=300&width=500"}
                alt={winner.auction_title}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">{winner.auction_title}</h3>
              <p className="text-muted-foreground">{winner.auction_description}</p>
            </div>
          </div>

          {/* Winner Details */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Winner</p>
                <p className="text-sm text-muted-foreground">{winner.winner_name}</p>
                <p className="text-xs text-muted-foreground">{winner.winner_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Winning Bid</p>
                <p className="text-lg font-bold">${Number(winner.final_bid).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={winner.payment_status === "completed" ? "default" : "secondary"}>
              Payment: {winner.payment_status}
            </Badge>
            <Badge variant={winner.pickup_status === "completed" ? "default" : "secondary"}>
              Pickup: {winner.pickup_status}
            </Badge>
          </div>

          {/* Pickup Status */}
          {winner.pickup_status === "completed" ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Item Already Released</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Picked up on {new Date(winner.pickup_date!).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Notes Field */}
              <div className="space-y-2">
                <Label htmlFor="notes">Pickup Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about the pickup..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Release Button */}
              <Button
                onClick={handleReleaseItem}
                disabled={isConfirming || winner.payment_status !== "completed"}
                className="w-full"
                size="lg"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Releasing Item...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Release Item to Winner
                  </>
                )}
              </Button>

              {winner.payment_status !== "completed" && (
                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                  Payment must be completed before releasing the item
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
