import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function AuctioneerTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auctioneer Information</CardTitle>
        <CardDescription>Live auction details and current lot information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium">Current Lot</h4>
          <div className="p-4 rounded-lg border space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-semibold">Waiting for auction to start</p>
                <p className="text-sm text-muted-foreground">No lot is currently being auctioned</p>
              </div>
              <Badge>Inactive</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Auction Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Bids</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">Items Sold</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold">$0</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
