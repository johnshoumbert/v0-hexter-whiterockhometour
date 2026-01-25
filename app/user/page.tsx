import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CountdownTimer } from "@/components/countdown-timer"
import { Trophy, DollarSign, MessageSquare, Receipt, ShoppingCart, Ticket, Gift } from "lucide-react"

export default async function UserDashboard() {
  const user = await getSession()

  if (!user) {
    redirect("/login?redirect=/user")
  }

  console.log("[v0] User Dashboard - Loading data for user:", user.email)

  // Get user's active bids
  const activeBids = await sql`
    SELECT DISTINCT ON (b.auction_id)
      a.id, a.title, a.image_url, a.end_time, a.status,
      b.amount as my_bid,
      (SELECT MAX(amount) FROM bids WHERE auction_id = a.id) as current_bid,
      (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as bid_count
    FROM bids b
    JOIN auctions a ON b.auction_id = a.id
    WHERE b.user_id = ${user.id} AND a.status = 'active'
    ORDER BY b.auction_id, b.created_at DESC
  `

  // Get user's wins
  const wins = await sql`
    SELECT w.*, a.title, a.image_url, a.description
    FROM winners w
    JOIN auctions a ON w.auction_id = a.id
    WHERE w.user_id = ${user.id}
    ORDER BY w.created_at DESC
  `

  // Get user's payments
  const payments = await sql`
    SELECT p.*, a.title as auction_title
    FROM payments p
    JOIN auctions a ON p.auction_id = a.id
    WHERE p.user_id = ${user.id}
    ORDER BY p.created_at DESC
  `

  // Get user's messages
  const messages = await sql`
    SELECT m.*, 
      sender.name as sender_name,
      sender.role as sender_role
    FROM messages m
    JOIN users sender ON m.sender_id = sender.id
    WHERE m.receiver_id = ${user.id}
    ORDER BY m.created_at DESC
    LIMIT 10
  `

  // Get user's licenses including pending
  console.log("[v0] Fetching licenses for user:", user.email)
  const licenses = await sql`
    SELECT id, code, event_count, amount, status, used, used_at, created_at
    FROM licenses
    WHERE email = ${user.email}
    ORDER BY created_at DESC
  `
  console.log("[v0] Found", licenses.length, "licenses for user")
  console.log("[v0] Licenses:", JSON.stringify(licenses, null, 2))

  // Fetch user purchases for tickets and raffles
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

  let raffleEntries = []
  try {
    const raffles = await sql.query(
      `SELECT 
        re.id,
        re.raffle_id,
        re.ticket_number,
        re.purchased_at,
        re.payment_amount,
        re.payment_status,
        r.title as raffle_name,
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
    raffleEntries = raffles.map((r: any) => ({
      ...r,
      payment_amount: typeof r.payment_amount === "string" ? Number.parseFloat(r.payment_amount) : r.payment_amount,
      is_winner: r.winner_user_id === user.id && r.winner_ticket_number === r.ticket_number,
    }))
  } catch (error: any) {
    if (!error.message.includes('relation "raffle_entries" does not exist')) {
      console.error("[v0] Error fetching raffle entries:", error)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myschoolauction.com"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
        <p className="text-muted-foreground">Manage your bids, wins, payments, donations, and messages</p>
      </div>

      <Tabs defaultValue="bids" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="bids">
            <DollarSign className="mr-2 h-4 w-4" />
            Current Bids
          </TabsTrigger>
          <TabsTrigger value="wins">
            <Trophy className="mr-2 h-4 w-4" />
            Wins
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Purchases
          </TabsTrigger>
          <TabsTrigger value="donations">
            <Gift className="mr-2 h-4 w-4" />
            Donations
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bids" className="space-y-4">
          {activeBids.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No active bids</p>
                <p className="text-sm text-muted-foreground">Start bidding on auctions to see them here</p>
                <Button className="mt-4" asChild>
                  <Link href="/auctions">Browse Auctions</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeBids.map((bid: any) => (
                <Card key={bid.id}>
                  <CardHeader className="p-0">
                    <img
                      src={bid.image_url || "/placeholder.svg?height=200&width=400"}
                      alt={bid.title}
                      className="h-48 w-full rounded-t-lg object-cover"
                    />
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="mb-2 line-clamp-2">{bid.title}</CardTitle>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Your Bid</span>
                        <span className="font-semibold">${Number(bid.my_bid).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Bid</span>
                        <span className="font-semibold text-primary">${Number(bid.current_bid).toLocaleString()}</span>
                      </div>
                      {Number(bid.my_bid) >= Number(bid.current_bid) ? (
                        <Badge className="w-full justify-center">Winning!</Badge>
                      ) : (
                        <Badge variant="secondary" className="w-full justify-center">
                          Outbid
                        </Badge>
                      )}
                      <CountdownTimer endTime={new Date(bid.end_time)} compact />
                      <Button className="w-full" size="sm" asChild>
                        <Link href={`/auctions/${bid.id}`}>View Auction</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wins" className="space-y-4">
          {wins.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No wins yet</p>
                <p className="text-sm text-muted-foreground">Keep bidding to win amazing items!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {wins.map((win: any) => (
                <Card key={win.id}>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{win.title}</CardTitle>
                    <CardDescription>{win.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Winning Bid</span>
                      <span className="text-xl font-bold text-primary">${Number(win.final_bid).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Status</span>
                      <Badge variant={win.payment_status === "paid" ? "default" : "secondary"}>
                        {win.payment_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Delivery Status</span>
                      <Badge variant={win.delivered ? "default" : "secondary"}>
                        {win.delivered ? "Delivered" : "Pending"}
                      </Badge>
                    </div>
                    {win.payment_status !== "paid" && (
                      <Button className="w-full" asChild>
                        <Link href={`/checkout?auction_id=${win.auction_id}`}>Pay Now</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {payments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No payments yet</p>
                <p className="text-sm text-muted-foreground">Your payment history will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View all your transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium">{payment.auction_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${Number(payment.amount).toLocaleString()}</p>
                        <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          {/* Tickets Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                <CardTitle>Event Tickets</CardTitle>
              </div>
              <CardDescription>Your purchased event tickets across all events</CardDescription>
            </CardHeader>
            <CardContent>
              {ticketPurchases.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No tickets purchased yet</p>
              ) : (
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
                      {ticketPurchases.map((ticket: any) => (
                        <tr key={ticket.id} className="border-b last:border-0">
                          <td className="py-3 text-sm">{ticket.event_name}</td>
                          <td className="py-3 text-sm">{ticket.ticket_name}</td>
                          <td className="py-3 text-sm">{ticket.quantity}</td>
                          <td className="py-3 text-sm font-semibold">${ticket.total_amount.toFixed(2)}</td>
                          <td className="py-3">
                            <Badge variant={ticket.status === "completed" ? "default" : "secondary"}>
                              {ticket.status}
                            </Badge>
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
                                  <DialogDescription>
                                    Show this QR code to the admin at the event entrance
                                  </DialogDescription>
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
              )}
            </CardContent>
          </Card>

          {/* Raffles Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                <CardTitle>Raffle Entries</CardTitle>
              </div>
              <CardDescription>Your raffle tickets across all events</CardDescription>
            </CardHeader>
            <CardContent>
              {raffleEntries.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No raffle entries yet</p>
              ) : (
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
                      {raffleEntries.map((raffle: any) => (
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
                                    <p className="mt-2 text-lg font-bold text-primary">
                                      Ticket: {raffle.ticket_number}
                                    </p>
                                    {raffle.is_winner && (
                                      <p className="mt-2 text-lg font-bold text-yellow-600">🎉 YOU WON! 🎉</p>
                                    )}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Donations</CardTitle>
              <CardDescription>View your monetary and item donations across all events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button asChild>
                  <Link href="/user/donations">View All Donations</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No messages</p>
                <p className="text-sm text-muted-foreground">Messages from admins will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {messages.map((message: any) => (
                <Card key={message.id} className={message.sender_role === "admin" ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {message.sender_name}
                        {message.sender_role === "admin" && (
                          <Badge className="ml-2" variant="default">
                            Admin
                          </Badge>
                        )}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{message.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
