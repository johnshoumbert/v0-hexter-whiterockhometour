import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CountdownTimer } from "@/components/countdown-timer"

interface AuctionCardProps {
  auction: {
    id: number
    slug?: string
    title: string
    description?: string
    image: string
    currentBid: number | string | null
    bidderInitials?: string
    bidderName?: string
    bidderAvatar?: string | null
    isSilent?: boolean
    endTime: Date | string | null
    category?: string
  }
}

export function AuctionCard({ auction }: AuctionCardProps) {
  let imageUrl = auction.image
  try {
    const parsed = JSON.parse(auction.image)
    imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : auction.image
  } catch {
    // If parsing fails, use the original value
  }

  const auctionUrl = `/auctions/${auction.id}`

  const currentBidValue = auction.currentBid
    ? typeof auction.currentBid === "string"
      ? Number.parseFloat(auction.currentBid)
      : auction.currentBid
    : 0

  return (
    <Link
      href={auctionUrl}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card dark:bg-[#1a1a1a] shadow-sm transition-all hover:scale-105 hover:shadow-lg hover:border-primary/50 dark:border-gray-800"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={imageUrl || "/placeholder.svg?height=400&width=600"}
          alt={auction.title}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
        />
        {auction.category && <Badge className="absolute right-2 top-2">{auction.category}</Badge>}
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex-1 space-y-2">
          <h3 className="line-clamp-2 text-balance font-semibold leading-relaxed dark:text-white">{auction.title}</h3>
          {auction.description && (
            <p className="line-clamp-1 text-sm text-muted-foreground dark:text-gray-300">{auction.description}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">Current Bid</p>
              <p className="text-lg font-bold text-primary">${currentBidValue.toLocaleString()}</p>
              {auction.bidderName && auction.bidderName !== "--" && (
                <div className="flex items-center gap-1.5 mt-1">
                  {!auction.isSilent && auction.bidderAvatar && (
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={auction.bidderAvatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-[8px]">{auction.bidderInitials}</AvatarFallback>
                    </Avatar>
                  )}
                  <p className="text-xs text-muted-foreground dark:text-gray-400">by {auction.bidderName}</p>
                </div>
              )}
            </div>
            {auction.endTime && <CountdownTimer endTime={auction.endTime} compact />}
          </div>

          <Button className="w-full" size="sm">
            Bid Now
          </Button>
        </div>
      </div>
    </Link>
  )
}
