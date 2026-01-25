import { notFound, redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, User, Calendar, Ticket } from "lucide-react"

export default async function RaffleCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()

  if (!session) {
    redirect("/login/admin?redirect=/admin/redeem/raffle/" + (await params).id)
  }

  // Check if user is admin
  const user = await sql.query(`SELECT role FROM users WHERE id = $1`, [session.id])
  if (user.length === 0 || user[0].role !== "admin") {
    return <div className="container py-12 text-center">Access denied. Admin only.</div>
  }

  const { id } = await params

  // Get raffle entry details
  const entry = await sql.query(
    `SELECT 
      re.*,
      r.title as raffle_name,
      r.winner_user_id,
      r.winner_ticket_number,
      e.event_name,
      u.name as user_name,
      u.email as user_email
    FROM raffle_entries re
    JOIN raffles r ON re.raffle_id = r.id
    JOIN events e ON r.event_id = e.id
    JOIN users u ON re.user_id = u.id
    WHERE re.id = $1`,
    [id],
  )

  if (entry.length === 0) {
    notFound()
  }

  const raffle = entry[0]
  const isWinner = raffle.winner_user_id === raffle.user_id && raffle.winner_ticket_number === raffle.ticket_number
  const hasWinnerBeenDrawn = !!raffle.winner_user_id

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Raffle Entry Verification</CardTitle>
          <CardDescription>Check raffle entry status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <User className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Participant</p>
                <p className="font-semibold">{raffle.user_name}</p>
                <p className="text-sm text-muted-foreground">{raffle.user_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Ticket className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Raffle</p>
                <p className="font-semibold">{raffle.raffle_name}</p>
                <p className="text-sm text-muted-foreground">{raffle.event_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Ticket className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Number</p>
                <p className="text-2xl font-bold text-primary">{raffle.ticket_number}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                <p className="font-semibold">{new Date(raffle.purchased_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {hasWinnerBeenDrawn && isWinner && (
            <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 text-center dark:from-yellow-950 dark:to-yellow-900">
              <Trophy className="mx-auto mb-2 h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">🎉 WINNER! 🎉</p>
              <p className="mt-2 text-yellow-800 dark:text-yellow-200">This ticket is the winning entry!</p>
            </div>
          )}

          {hasWinnerBeenDrawn && !isWinner && (
            <div className="rounded-lg bg-muted p-6 text-center">
              <p className="font-semibold text-muted-foreground">This ticket did not win</p>
              <p className="mt-1 text-sm text-muted-foreground">Thank you for participating!</p>
            </div>
          )}

          {!hasWinnerBeenDrawn && (
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <p className="font-semibold">Winner Not Yet Drawn</p>
              <p className="mt-1 text-sm text-muted-foreground">The raffle drawing has not taken place yet</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Badge variant={raffle.payment_status === "completed" ? "default" : "secondary"}>
              {raffle.payment_status.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
