"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Copy, CheckCircle2, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

interface License {
  id: string
  code: string
  email: string
  event_count: number
  amount: number
  status: string
  used: boolean
  used_at: string | null
  used_by_email: string | null
  created_at: string
}

export default function AdministrationPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [licenses, setLicenses] = useState<License[]>([])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/login?redirect=/administration")
      return
    }

    // Check if user is authorized
    if (user.email !== "john.shoumbert@gmail.com" && !user.is_admin) {
      toast({
        title: "Unauthorized",
        description: "You don't have permission to access this page",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    // Fetch licenses
    fetch("/api/administration/licenses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch licenses")
        return res.json()
      })
      .then((data) => {
        setLicenses(data.licenses)
        setLoading(false)
      })
      .catch((error) => {
        console.error("[v0] Failed to fetch licenses:", error)
        toast({ title: "Failed to load licenses", variant: "destructive" })
        setLoading(false)
      })
  }, [user, router, toast, authLoading])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({ title: "Code copied to clipboard" })
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">License Administration</CardTitle>
            <CardDescription>Manage all MySchoolAuction licenses</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No licenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    licenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-mono">{license.code}</TableCell>
                        <TableCell>{license.email}</TableCell>
                        <TableCell>{license.event_count}</TableCell>
                        <TableCell>${license.amount}</TableCell>
                        <TableCell>
                          <Badge variant={license.status === "paid" ? "default" : "secondary"}>{license.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {license.used ? (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <div>
                                <div>{license.used_by_email}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(license.used_at!).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <XCircle className="h-4 w-4" />
                              <span>Not used</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(license.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => copyCode(license.code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{licenses.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active (Used)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{licenses.filter((l) => l.used).length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {licenses
                      .filter((l) => l.status === "paid")
                      .reduce((sum, l) => sum + Number(l.amount), 0)
                      .toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
