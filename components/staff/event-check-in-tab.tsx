import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin } from "lucide-react"

export function EventCheckInTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Check-In</CardTitle>
        <CardDescription>Mark your attendance and check in to your shift</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 rounded-lg border space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">Event Check-In</h3>
                <p className="text-sm text-muted-foreground">Mark your arrival at the event</p>
              </div>
              <Badge>Pending</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expected: 10:00 AM</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Location: Main Entrance</span>
            </div>
            <Button className="w-full">Check In Now</Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Check-In History</h4>
          <div className="text-sm text-muted-foreground text-center p-6 border rounded-lg">No check-ins yet</div>
        </div>
      </CardContent>
    </Card>
  )
}
