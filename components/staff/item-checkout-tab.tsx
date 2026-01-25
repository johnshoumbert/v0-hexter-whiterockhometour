"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState } from "react"

export function ItemCheckoutTab() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Checkout / Release</CardTitle>
        <CardDescription>Manage auction item inventory and releases</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search item by name or ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button>Scan</Button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Your Items</h4>
          <div className="text-sm text-muted-foreground text-center p-6 border rounded-lg">
            No items assigned to you yet
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Pending Checkouts</h4>
          <div className="text-sm text-muted-foreground text-center p-6 border rounded-lg">No pending items</div>
        </div>
      </CardContent>
    </Card>
  )
}
