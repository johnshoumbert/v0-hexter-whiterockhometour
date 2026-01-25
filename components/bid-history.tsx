"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface BidHistoryProps {
  bids: Array<{
    bidder: string
    bidderImage?: string
    amount: number
    time: string
  }>
  isSilentAuction?: boolean
}

export function BidHistory({ bids, isSilentAuction = false }: BidHistoryProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Bid History</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {!isSilentAuction && <TableHead>Bidder</TableHead>}
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bids.map((bid, index) => (
              <TableRow key={index}>
                {!isSilentAuction && (
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={bid.bidderImage || "/placeholder.svg"} alt={bid.bidder} />
                        <AvatarFallback className="text-xs">{bid.bidder.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{bid.bidder}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="font-semibold text-primary">${bid.amount.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{bid.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
