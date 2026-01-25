import { notFound, redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket, User, Calendar, DollarSign } from "lucide-react"

export default async function TicketRedeemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()

  if (!session) {
    redirect("/login/admin?redirect=/admin/redeem/ticket/" + (await params).id)
  }

  // Check if user is admin
  const user = await sql.query(`SELECT role FROM users WHERE id = $1`, [session.id])
  if (user.length === 0 || user[0].role !== "admin") {
    return <div className="container py-12 text-center">Access denied. Admin only.</div>
  }

  const { id } = await params

  // Get ticket purchase details
  const purchase = await sql.query(
    `SELECT 
      tp.*,
      et.name as ticket_name,
      e.event_name,
      u.name as user_name,
      u.email as user_email
    FROM ticket_purchases tp
    JOIN event_tickets et ON tp.ticket_id = et.id
    JOIN events e ON tp.event_id = e.id
    JOIN users u ON tp.user_id = u.id
    WHERE tp.id = $1`,
    [id],
  )

  if (purchase.length === 0) {
    notFound()
  }

  const ticket = purchase[0]

  async function redeemTicket() {
    "use server"
    await sql.query(`UPDATE ticket_purchases SET status = 'redeemed', updated_at = NOW() WHERE id = $1`, [id])
    redirect("/admin/tickets?redeemed=true")
  }

  const isRedeemed = ticket.status === "redeemed"

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ticket Redemption</CardTitle>
          <CardDescription>Verify and redeem ticket purchase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <User className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendee</p>
                <p className="font-semibold">{ticket.user_name}</p>
                <p className="text-sm text-muted-foreground">{ticket.user_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Ticket className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Type</p>
                <p className="font-semibold">{ticket.ticket_name}</p>
                <p className="text-sm text-muted-foreground">{ticket.event_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity & Amount</p>
                <p className="font-semibold">
                  {ticket.quantity} ticket{ticket.quantity > 1 ? "s" : ""} × $
                  {Number.parseFloat(ticket.total_amount).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                <p className="font-semibold">{new Date(ticket.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant={isRedeemed ? "default" : "secondary"} className="mt-1">
                {isRedeemed ? "REDEEMED" : ticket.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {!isRedeemed && (
            <form action={redeemTicket}>
              <Button type="submit" className="w-full" size="lg">
                Redeem Ticket
              </Button>
            </form>
          )}

          {isRedeemed && (
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
              <p className="font-semibold text-green-900 dark:text-green-100">
                ✓ This ticket has already been redeemed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
