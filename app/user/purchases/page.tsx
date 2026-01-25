import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Ticket, Gift, ShoppingBag, ChevronDown } from "lucide-react"
import { headers } from "next/headers"

export default async function PurchasesPage() {
  const user = await getSession()

  if (!user) {
    redirect("/login?redirect=/user/purchases")
  }

  const headersList = await headers()
  const host = headersList.get("host") || ""

  let currentEventId = null
  try {
    const eventResult = await sql.query(`SELECT id FROM events WHERE domain = $1 OR $1 LIKE '%' || domain LIMIT 1`, [
      host,
    ])
    if (eventResult.length > 0) {
      currentEventId = eventResult[0].id
    }
  } catch (error) {
    console.error("[v0] Error fetching current event:", error)
  }

  let shopOrders = []
  try {
    const orders = await sql.query(
      `SELECT 
        so.id,
        so.event_id,
        so.quantity,
        so.unit_price,
        so.total_amount,
        so.status,
        so.created_at,
        si.title as item_title,
        si.image_url as item_image,
        e.event_name,
        e.domain
      FROM shop_orders so
      JOIN shop_items si ON so.shop_item_id = si.id
      JOIN events e ON so.event_id = e.id
      WHERE so.user_id = $1
      ORDER BY so.created_at DESC`,
      [user.id],
    )
    shopOrders = orders.map((o: any) => ({
      ...o,
      unit_price: typeof o.unit_price === "string" ? Number.parseFloat(o.unit_price) : o.unit_price,
      total_amount: typeof o.total_amount === "string" ? Number.parseFloat(o.total_amount) : o.total_amount,
    }))
  } catch (error: any) {
    if (!error.message.includes('relation "shop_orders" does not exist')) {
      console.error("[v0] Error fetching shop orders:", error)
    }
  }

  const currentEventOrders = shopOrders.filter((o: any) => o.event_id === currentEventId)
  const otherEventOrders = shopOrders.filter((o: any) => o.event_id !== currentEventId)

  const renderShopOrderTable = (orders: any[]) => {
    if (orders.length === 0) {
      return <p className="py-4 text-center text-sm text-muted-foreground">No shop orders</p>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm">
              <th className="pb-3 font-medium">Event</th>
              <th className="pb-3 font-medium">Item</th>
              <th className="pb-3 font-medium">Quantity</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">QR Code</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: any) => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="py-3 text-sm">{order.event_name}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {order.item_image && (
                      <img
                        src={order.item_image || "/placeholder.svg"}
                        alt={order.item_title}
                        className="h-10 w-10 object-cover rounded"
                      />
                    )}
                    <span className="text-sm">{order.item_title}</span>
                  </div>
                </td>
                <td className="py-3 text-sm">{order.quantity}</td>
                <td className="py-3 text-sm font-semibold">${order.total_amount.toFixed(2)}</td>
                <td className="py-3">
                  <Badge variant={order.status === "completed" ? "default" : "secondary"}>{order.status}</Badge>
                </td>
                <td className="py-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="py-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        View QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Order QR Code</DialogTitle>
                        <DialogDescription>Show this QR code to pick up your item at the event</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${appUrl}/admin/redeem/shop/${order.id}`}
                            alt="Order QR Code"
                            className="rounded-lg border"
                          />
                        </div>
                        <div className="rounded-lg bg-muted p-4 text-sm">
                          {order.item_image && (
                            <img
                              src={order.item_image || "/placeholder.svg"}
                              alt={order.item_title}
                              className="w-full h-32 object-cover rounded mb-2"
                            />
                          )}
                          <p className="font-semibold">{order.item_title}</p>
                          <p className="text-muted-foreground">{order.event_name}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Quantity: {order.quantity} × ${order.unit_price.toFixed(2)}
                          </p>
                          <p className="text-sm font-bold mt-1">Total: ${order.total_amount.toFixed(2)}</p>
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          Scan this QR code at the event to pick up your order
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  let ticketPurchases = []
  try {
    const tickets = await sql.query(
      `SELECT 
        tp.id,
        tp.event_id,
        tp.ticket_id,
        tp.quantity,
        tp.total_amount,
        tp.status,
        tp.created_at,
        et.name as ticket_name,
        e.event_name,
        e.domain
      FROM ticket_purchases tp
      JOIN event_tickets et ON tp.ticket_id = et.id
      JOIN events e ON tp.event_id = e.id
      WHERE tp.user_id = $1
      ORDER BY tp.created_at DESC`,
      [user.id],
    )
    ticketPurchases = tickets.map((t: any) => ({
      ...t,
      total_amount: typeof t.total_amount === "string" ? Number.parseFloat(t.total_amount) : t.total_amount,
    }))
  } catch (error: any) {
    if (!error.message.includes('relation "ticket_purchases" does not exist')) {
      console.error("[v0] Error fetching ticket purchases:", error)
    }
  }

  const currentEventTickets = ticketPurchases.filter((t: any) => t.event_id === currentEventId)
  const otherEventTickets = ticketPurchases.filter((t: any) => t.event_id !== currentEventId)

  let currentEventRaffles: any[] = []
  let otherEventRaffles: any[] = []
  let raffleEntries: any[] = []
  try {
    const rafflesWithEvent = await sql.query(
      `SELECT 
        re.id,
        re.raffle_id,
        re.ticket_number,
        re.purchased_at,
        re.payment_amount,
        re.payment_status,
        r.title as raffle_name,
        r.event_id,
        r.winner_user_id,
        r.winner_ticket_number,
        e.event_name,
        e.domain
      FROM raffle_entries re
      JOIN raffles r ON re.raffle_id = r.id
      JOIN events e ON r.event_id = e.id
      WHERE re.user_id = $1
      ORDER BY re.purchased_at DESC`,
      [user.id],
    )
    raffleEntries = rafflesWithEvent.map((r: any) => ({
      ...r,
      payment_amount: typeof r.payment_amount === "string" ? Number.parseFloat(r.payment_amount) : r.payment_amount,
      is_winner: r.winner_user_id === user.id && r.winner_ticket_number === r.ticket_number,
    }))
    currentEventRaffles = raffleEntries.filter((r: any) => r.event_id === currentEventId)
    otherEventRaffles = raffleEntries.filter((r: any) => r.event_id !== currentEventId)
  } catch (error: any) {
    if (!error.message.includes('relation "raffle_entries" does not exist')) {
      console.error("[v0] Error fetching raffle entries:", error)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

  const renderTicketTable = (tickets: any[]) => {
    if (tickets.length === 0) {
      return <p className="py-4 text-center text-sm text-muted-foreground">No tickets</p>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm">
              <th className="pb-3 font-medium">Event</th>
              <th className="pb-3 font-medium">Ticket Type</th>
              <th className="pb-3 font-medium">Quantity</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">QR Code</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket: any) => (
              <tr key={ticket.id} className="border-b last:border-0">
                <td className="py-3 text-sm">{ticket.event_name}</td>
                <td className="py-3 text-sm">{ticket.ticket_name}</td>
                <td className="py-3 text-sm">{ticket.quantity}</td>
                <td className="py-3 text-sm font-semibold">${ticket.total_amount.toFixed(2)}</td>
                <td className="py-3">
                  <Badge variant={ticket.status === "completed" ? "default" : "secondary"}>{ticket.status}</Badge>
                </td>
                <td className="py-3 text-sm">{new Date(ticket.created_at).toLocaleDateString()}</td>
                <td className="py-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        View QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ticket QR Code</DialogTitle>
                        <DialogDescription>Show this QR code to the admin at the event entrance</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${appUrl}/admin/redeem/ticket/${ticket.id}`}
                            alt="Ticket QR Code"
                            className="rounded-lg border"
                          />
                        </div>
                        <div className="rounded-lg bg-muted p-4 text-sm">
                          <p className="font-semibold">{ticket.ticket_name}</p>
                          <p className="text-muted-foreground">{ticket.event_name}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Quantity: {ticket.quantity} ticket{ticket.quantity > 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          Scan this QR code at the event to redeem your ticket
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderRaffleTable = (raffles: any[]) => {
    if (raffles.length === 0) {
      return <p className="py-4 text-center text-sm text-muted-foreground">No raffle entries</p>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm">
              <th className="pb-3 font-medium">Event</th>
              <th className="pb-3 font-medium">Raffle</th>
              <th className="pb-3 font-medium">Ticket #</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">QR Code</th>
            </tr>
          </thead>
          <tbody>
            {raffles.map((raffle: any) => (
              <tr key={raffle.id} className="border-b last:border-0">
                <td className="py-3 text-sm">{raffle.event_name}</td>
                <td className="py-3 text-sm">{raffle.raffle_name}</td>
                <td className="py-3">
                  <span className="font-mono text-sm font-semibold text-primary">{raffle.ticket_number}</span>
                </td>
                <td className="py-3 text-sm font-semibold">${raffle.payment_amount.toFixed(2)}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Badge variant={raffle.payment_status === "completed" ? "default" : "secondary"}>
                      {raffle.payment_status}
                    </Badge>
                    {raffle.is_winner && <Badge className="bg-yellow-500">WINNER</Badge>}
                  </div>
                </td>
                <td className="py-3 text-sm">{new Date(raffle.purchased_at).toLocaleDateString()}</td>
                <td className="py-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        View QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Raffle Entry QR Code</DialogTitle>
                        <DialogDescription>Show this QR code to check if you're a winner</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${appUrl}/admin/redeem/raffle/${raffle.id}`}
                            alt="Raffle QR Code"
                            className="rounded-lg border"
                          />
                        </div>
                        <div className="rounded-lg bg-muted p-4 text-sm">
                          <p className="font-semibold">{raffle.raffle_name}</p>
                          <p className="text-muted-foreground">{raffle.event_name}</p>
                          <p className="mt-2 text-lg font-bold text-primary">Ticket: {raffle.ticket_number}</p>
                          {raffle.is_winner && <p className="mt-2 text-lg font-bold text-yellow-600">🎉 YOU WON! 🎉</p>}
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          Admin will scan this to verify your entry and check if you're a winner
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <p className="text-muted-foreground">View your tickets, shop orders, and raffle entries across all events</p>
      </div>

      {currentEventOrders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <CardTitle>Shop Orders - This Event</CardTitle>
            </div>
            <CardDescription>Your purchased items from this event's shop</CardDescription>
          </CardHeader>
          <CardContent>{renderShopOrderTable(currentEventOrders)}</CardContent>
        </Card>
      )}

      {otherEventOrders.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    <div>
                      <CardTitle>Shop Orders - Other Events</CardTitle>
                      <CardDescription>
                        Your purchased items from other events ({otherEventOrders.length})
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>{renderShopOrderTable(otherEventOrders)}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {currentEventOrders.length === 0 && otherEventOrders.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <CardTitle>Shop Orders</CardTitle>
            </div>
            <CardDescription>Your purchased items from event shops</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">No shop orders yet</p>
          </CardContent>
        </Card>
      )}

      {currentEventTickets.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              <CardTitle>Event Tickets - This Event</CardTitle>
            </div>
            <CardDescription>Your tickets for this event</CardDescription>
          </CardHeader>
          <CardContent>{renderTicketTable(currentEventTickets)}</CardContent>
        </Card>
      )}

      {otherEventTickets.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    <div>
                      <CardTitle>Event Tickets - Other Events</CardTitle>
                      <CardDescription>Your tickets from other events ({otherEventTickets.length})</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>{renderTicketTable(otherEventTickets)}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {currentEventTickets.length === 0 && otherEventTickets.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              <CardTitle>Event Tickets</CardTitle>
            </div>
            <CardDescription>Your purchased event tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">No tickets purchased yet</p>
          </CardContent>
        </Card>
      )}

      {currentEventRaffles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <CardTitle>Raffle Entries - This Event</CardTitle>
            </div>
            <CardDescription>Your raffle tickets for this event</CardDescription>
          </CardHeader>
          <CardContent>{renderRaffleTable(currentEventRaffles)}</CardContent>
        </Card>
      )}

      {otherEventRaffles.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    <div>
                      <CardTitle>Raffle Entries - Other Events</CardTitle>
                      <CardDescription>
                        Your raffle tickets from other events ({otherEventRaffles.length})
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>{renderRaffleTable(otherEventRaffles)}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {currentEventRaffles.length === 0 && otherEventRaffles.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <CardTitle>Raffle Entries</CardTitle>
            </div>
            <CardDescription>Your raffle tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">No raffle entries yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
