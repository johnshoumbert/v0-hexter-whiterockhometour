"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Mail,
  Phone,
  Package,
  DollarSign,
  CreditCard,
  Calendar,
  Loader2,
  CheckCircle2,
  QrCode,
} from "lucide-react"

interface WinnerDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  winner: any
  onUpdate?: () => void
}

export function WinnerDetailsSheet({ open, onOpenChange, winner, onUpdate }: WinnerDetailsSheetProps) {
  const { toast } = useToast()
  const [isReleasingItem, setIsReleasingItem] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [releaseCode, setReleaseCode] = useState<string>("")

  if (!winner) return null

  const handleDeliveryStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const delivered = newStatus === "delivered"
      const response = await fetch(`/api/events/${winner.event_id}/winners/${winner.id}/delivery-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivered }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update delivery status")
      }

      toast({
        title: "Status Updated",
        description: `Item marked as ${delivered ? "delivered" : "awaiting pickup"}.`,
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleReleaseItem = async () => {
    setIsReleasingItem(true)
    try {
      const response = await fetch(`/api/events/${winner.event_id}/winners/${winner.id}/release`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to release item")
      }

      const data = await response.json()
      setReleaseCode(data.releaseCode)

      toast({
        title: "Item Released",
        description: "The item has been marked as delivered.",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Release Failed",
        description: error.message || "Failed to release item",
        variant: "destructive",
      })
    } finally {
      setIsReleasingItem(false)
    }
  }

  // Generate QR code data URL
  const qrCodeData = `${window.location.origin}/release/${winner.id}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Winner Details</SheetTitle>
          <SheetDescription>View winner information and manage item release</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Winner Info</TabsTrigger>
              <TabsTrigger value="release">Item Release</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-6">
              {/* Auction Item */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Auction Item</h3>
                <div className="rounded-lg border p-4 space-y-3">
                  {winner.auction_image_url && (
                    <img
                      src={winner.auction_image_url || "/placeholder.svg"}
                      alt={winner.auction_title}
                      className="w-full h-48 object-cover rounded-md"
                    />
                  )}
                  <div>
                    <p className="font-medium text-lg">{winner.auction_title}</p>
                    {winner.auction_description && (
                      <p className="text-sm text-muted-foreground mt-1">{winner.auction_description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Winning Bid</span>
                    <span className="text-2xl font-bold text-primary">
                      ${Number(winner.final_bid).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Winner Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Winner Information</h3>
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-base font-medium">{winner.user_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-base font-medium">{winner.user_email}</p>
                    </div>
                  </div>

                  {winner.user_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-base font-medium">{winner.user_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Status</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant={winner.payment_status === "completed" ? "default" : "secondary"}
                      className={
                        winner.payment_status === "completed"
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }
                    >
                      {winner.payment_status === "completed" ? "Paid" : "Pending"}
                    </Badge>
                  </div>

                  {winner.invoice_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Invoice</span>
                      <span className="text-sm font-medium">{winner.invoice_number}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Method</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm">
                        {winner.bid_authorized ? "Card on File" : "Not Set"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Delivery Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delivery Status</h3>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Item Status</span>
                  </div>
                  <Select
                    value={winner.delivered ? "delivered" : "awaiting"}
                    onValueChange={handleDeliveryStatusChange}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awaiting">Awaiting Pickup</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {winner.released_at && (
                  <p className="text-xs text-muted-foreground">
                    Released on {new Date(winner.released_at).toLocaleDateString()} at{" "}
                    {new Date(winner.released_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="release" className="space-y-6 mt-6">
              {/* Release QR Code */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Release QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Winner can scan this QR code to confirm item pickup.
                </p>
                <div className="flex justify-center p-6 bg-white rounded-lg border">
                  <img src={qrCodeUrl || "/placeholder.svg"} alt="Release QR Code" className="w-64 h-64" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-mono break-all">{qrCodeData}</p>
                </div>
              </div>

              <Separator />

              {/* Release Button */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Manual Release</h3>
                <p className="text-sm text-muted-foreground">
                  Mark this item as delivered and released to the winner.
                </p>

                {winner.delivered ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Item Released</p>
                        <p className="text-sm text-green-700">This item has been delivered to the winner.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleReleaseItem}
                    disabled={isReleasingItem || winner.payment_status !== "completed"}
                    className="w-full"
                    size="lg"
                  >
                    {isReleasingItem ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Releasing...
                      </>
                    ) : (
                      <>
                        <Package className="mr-2 h-5 w-5" />
                        Release Item
                      </>
                    )}
                  </Button>
                )}

                {winner.payment_status !== "completed" && !winner.delivered && (
                  <p className="text-sm text-amber-600">
                    ⚠️ Payment must be completed before item can be released.
                  </p>
                )}

                {releaseCode && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Release Code</p>
                    <p className="text-2xl font-bold text-blue-600 font-mono mt-2">{releaseCode}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Share this code with the winner for verification
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
