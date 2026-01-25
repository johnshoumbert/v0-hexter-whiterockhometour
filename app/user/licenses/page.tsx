"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface License {
  id: string
  code: string | null
  event_count: number
  amount: string
  status: string
  used: boolean
  used_at: string | null
  created_at: string
}

export default function LicensesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchLicenses()
    }
  }, [user])

  const fetchLicenses = async () => {
    try {
      console.log("[v0] Fetching licenses for user...")
      const response = await fetch("/api/users/me/all-licenses")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Licenses fetched:", data.licenses)
        setLicenses(data.licenses)
      } else {
        console.error("[v0] Failed to fetch licenses, status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch licenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (license: License) => {
    if (license.status === "paid") {
      if (license.used) {
        return (
          <Badge variant="secondary" className="bg-gray-500">
            Used
          </Badge>
        )
      }
      return <Badge className="bg-green-500">Active</Badge>
    }
    if (license.status === "pending") {
      return <Badge variant="outline">Pending Payment</Badge>
    }
    return <Badge variant="destructive">Failed</Badge>
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Licenses</h1>
        <p className="text-muted-foreground">View and manage your auction hosting licenses</p>
      </div>

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No licenses yet</p>
            <p className="text-sm text-muted-foreground">Purchase a license to start hosting auctions</p>
            <Button className="mt-4" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Licenses</CardTitle>
            <CardDescription>All your purchased licenses including pending payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Used Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-mono font-medium">
                      {license.code || <span className="text-muted-foreground">Pending</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(license)}</TableCell>
                    <TableCell>
                      {license.event_count} {license.event_count === 1 ? "Event" : "Events"}
                    </TableCell>
                    <TableCell className="font-semibold">${(Number(license.amount) / 100).toFixed(2)}</TableCell>
                    <TableCell>{new Date(license.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {license.used_at ? (
                        new Date(license.used_at).toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {license.status === "paid" && !license.used && license.code ? (
                        <Button size="sm" asChild>
                          <Link href={`/create-auction?license=${license.code}`}>Start Auction</Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Need More Licenses?</CardTitle>
          <CardDescription>Purchase additional licenses to host more events</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/pricing">View Pricing Plans</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
