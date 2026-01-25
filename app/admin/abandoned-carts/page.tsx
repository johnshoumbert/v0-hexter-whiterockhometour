"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, RefreshCw, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

interface CartItem {
  item_type: string
  item_id: string
  item_name: string
  quantity: number
  unit_price: number
}

interface AbandonedCart {
  session_id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  item_count: number
  total_value: number
  last_activity: string
  first_added: string
  abandoned_at: string
  reminder_sent_at: string | null
  items: CartItem[]
}

export default function AbandonedCartsPage() {
  const { event } = useEvent()
  const [carts, setCarts] = useState<AbandonedCart[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  const fetchAbandonedCarts = async () => {
    if (!event?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/events/${event.id}/cart/abandoned`)
      
      if (!response.ok) throw new Error("Failed to fetch abandoned carts")
      
      const data = await response.json()
      setCarts(data.carts || [])
    } catch (error) {
      console.error("[v0] Error fetching abandoned carts:", error)
      toast.error("Failed to load abandoned carts")
    } finally {
      setLoading(false)
    }
  }

  const handleSendReminder = async (sessionId: string) => {
    if (!event?.id) return

    try {
      setSendingReminder(sessionId)
      const response = await fetch(`/api/events/${event.id}/cart/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send reminder")
      }

      toast.success("Reminder email sent successfully")
      fetchAbandonedCarts() // Refresh the list
    } catch (error: any) {
      console.error("[v0] Error sending reminder:", error)
      toast.error(error.message || "Failed to send reminder")
    } finally {
      setSendingReminder(null)
    }
  }

  useEffect(() => {
    fetchAbandonedCarts()
  }, [event?.id])

  if (!event) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Abandoned Carts</h1>
          <p className="text-muted-foreground">
            Review and recover incomplete transactions
          </p>
        </div>
        <Button onClick={fetchAbandonedCarts} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cart Overview</CardTitle>
          <CardDescription>
            Carts that have been inactive for more than 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading abandoned carts...</div>
          ) : carts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="mx-auto h-12 w-12 mb-2 opacity-50" />
              No abandoned carts found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.map((cart) => (
                  <TableRow key={cart.session_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {cart.user_name || cart.user_email || "Guest"}
                        </div>
                        {cart.user_email && (
                          <div className="text-xs text-muted-foreground">
                            {cart.user_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cart.item_count} items</div>
                        <div className="text-xs text-muted-foreground">
                          {cart.items.slice(0, 2).map((item) => item.item_name).join(", ")}
                          {cart.items.length > 2 && ` +${cart.items.length - 2} more`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${cart.total_value.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(cart.last_activity).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(cart.last_activity).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cart.reminder_sent_at ? (
                        <Badge variant="secondary">Reminder Sent</Badge>
                      ) : (
                        <Badge variant="outline">Abandoned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {cart.user_email && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(cart.session_id)}
                          disabled={sendingReminder === cart.session_id || !!cart.reminder_sent_at}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {cart.reminder_sent_at ? "Sent" : "Send Reminder"}
                        </Button>
                      )}
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
