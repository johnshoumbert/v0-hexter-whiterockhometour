"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Package, Gavel, ClipboardList, Clock, Users, AlertCircle, LogIn } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { EventCheckInTab } from "@/components/staff/event-check-in-tab"
import { ItemCheckoutTab } from "@/components/staff/item-checkout-tab"
import { AuctioneerTab } from "@/components/staff/auctioneer-tab"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import AdminStaffPage from "@/app/admin/staff/page"

export default function StaffPortalPage() {
  const { event } = useEvent()
  const { user } = useAuth()
  const { toast } = useToast()
  const [staffRole, setStaffRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [manageStaffOpen, setManageStaffOpen] = useState(false)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)

  useEffect(() => {
    if (event?.id && user?.id) {
      // Fetch staff assignment details
      fetch(`/api/events/${event.id}/staff/assignments/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.assignment?.staff_role?.role_name) {
            setStaffRole(data.assignment.staff_role.role_name)
          }
        })
        .catch((err) => console.error("[v0] Failed to fetch staff role:", err))
        .finally(() => setIsLoading(false))
    }
  }, [event?.id, user?.id])

  const handleCheckIn = () => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setIsCheckedIn(true)
    setCheckInTime(now)
    toast({ title: "Checked in successfully", description: `You're checked in at ${now}` })
  }

  const isAdmin = user?.is_admin || user?.isEventAdmin

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading staff portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">Staff Portal</h1>
          <p className="text-muted-foreground">Event staff management and shift tracking</p>
          {staffRole && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-muted-foreground">Your Role:</span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {staffRole}
              </Badge>
              {isCheckedIn && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Checked In
                </Badge>
              )}
            </div>
          )}
        </div>
        {isAdmin && (
          <Button onClick={() => setManageStaffOpen(true)} className="gap-2 w-full sm:w-auto">
            <Users className="h-4 w-4" />
            Manage Staff
          </Button>
        )}
      </div>

      {isAdmin && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle>Broadcast Message (Admin Only)</AlertTitle>
          <AlertDescription className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Send urgent message to all active staff..."
              className="flex-1 px-3 py-2 rounded border border-orange-200 dark:border-orange-800 text-sm"
            />
            <Button size="sm" variant="outline">
              Send
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogIn className="h-6 w-6 text-green-600" />
              Check In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Mark your arrival and start your shift</p>
            <Button onClick={handleCheckIn} className="w-full h-10 text-base" disabled={isCheckedIn}>
              {isCheckedIn ? `Checked in at ${checkInTime}` : "Check In Now"}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Item Checkout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Release or receive auction items</p>
            <Button variant="outline" size="lg" className="w-full h-10 text-base bg-transparent">
              Manage Items
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-6 w-6 text-purple-600" />
              Auctioneer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">View live auction information</p>
            <Button variant="outline" size="lg" className="w-full h-10 text-base bg-transparent">
              Live Feed
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-6 w-6 text-orange-600" />
              My Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">View your assigned shifts</p>
            <Button variant="outline" size="lg" className="w-full h-10 text-base bg-transparent">
              View Shifts
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Live Coverage Status
          </CardTitle>
          <CardDescription>Current staff assignments and coverage gaps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <p className="text-sm text-muted-foreground mb-1">Working Now</p>
              <p className="text-3xl font-bold text-green-600">8</p>
              <p className="text-xs text-muted-foreground mt-2">Staff members checked in</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-muted-foreground mb-1">Assigned Today</p>
              <p className="text-3xl font-bold text-blue-600">12</p>
              <p className="text-xs text-muted-foreground mt-2">Total shifts scheduled</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-muted-foreground mb-1">Coverage Gaps</p>
              <p className="text-3xl font-bold text-orange-600">2</p>
              <p className="text-xs text-muted-foreground mt-2">Shifts needing coverage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Role & Responsibilities</CardTitle>
          <CardDescription>Clear guidance on what you should do and who to contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div>
              <h4 className="font-semibold mb-2">{staffRole || "Staff Member"}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Door Greeter: Welcome guests, direct them to registration and auction areas, answer basic event
                questions
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">What You Do:</p>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Greet all arriving guests with a smile</li>
                  <li>Direct guests to registration table</li>
                  <li>Hand out auction catalogs & bid sheets</li>
                </ul>
              </div>
              <div className="space-y-2 mt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">If You Need Help:</p>
                <p className="text-sm text-muted-foreground">
                  Contact <strong>Sarah (Event Chair)</strong> or any staff with a blue badge
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full bg-transparent">
            View Full Role Guide
          </Button>
        </CardContent>
      </Card>

      {/* Tabs for Detailed Views */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="check-in" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Check In</span>
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Checkout</span>
          </TabsTrigger>
          <TabsTrigger value="auctioneer" className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            <span className="hidden sm:inline">Auctioneer</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>Overview of your event duties and assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge>{isCheckedIn ? "Checked In" : "Not Checked In"}</Badge>
                </div>
                <div className="p-4 rounded-lg bg-muted space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Your Role</p>
                  <p className="text-lg font-semibold">{staffRole || "Unassigned"}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Items Managed</p>
                  <p className="text-lg font-semibold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="check-in">
          <EventCheckInTab />
        </TabsContent>

        <TabsContent value="checkout">
          <ItemCheckoutTab />
        </TabsContent>

        <TabsContent value="auctioneer">
          <AuctioneerTab />
        </TabsContent>
      </Tabs>

      {/* Sheet for managing staff - only visible to admins */}
      <Sheet open={manageStaffOpen} onOpenChange={setManageStaffOpen}>
        <SheetContent side="right" className="w-full sm:max-w-none p-0">
          <SheetHeader className="border-b p-6">
            <SheetTitle>Manage Staff</SheetTitle>
            <SheetDescription>Manage staff roles, assignments, and availability</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100vh-80px)]">
            <AdminStaffPage />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
