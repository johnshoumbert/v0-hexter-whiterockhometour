"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, TrendingUp, Mail, Eye, ShoppingCart, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function AdminTrackingPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30")
  const [filterInvoiceId, setFilterInvoiceId] = useState("all")
  const [invoices, setInvoices] = useState<any[]>([])

  const [funnelData, setFunnelData] = useState({
    email_sent: 0,
    invoice_viewed: 0,
    checkout_started: 0,
    payment_succeeded: 0,
  })

  const [recentEvents, setRecentEvents] = useState<any[]>([])

  useEffect(() => {
    if (event?.id) {
      fetchTrackingData()
      fetchInvoices()
    }
  }, [event?.id, dateRange, filterInvoiceId])

  const fetchInvoices = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/events/${event.id}/invoices`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching invoices:", error)
    }
  }

  const fetchTrackingData = async () => {
    if (!event?.id) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        dateRange,
        ...(filterInvoiceId !== "all" && { invoiceId: filterInvoiceId }),
      })

      const response = await fetch(`/api/admin/tracking?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFunnelData(data.funnel)
        setRecentEvents(data.recentEvents || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load tracking data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching tracking data:", error)
      toast({
        title: "Error",
        description: "Failed to load tracking data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateConversionRate = (current: number, previous: number) => {
    if (previous === 0) return "0%"
    return `${((current / previous) * 100).toFixed(1)}%`
  }

  const funnelChartData = [
    {
      name: "Emails Sent",
      value: funnelData.email_sent,
      fill: "#3b82f6",
      icon: Mail,
    },
    {
      name: "Invoices Viewed",
      value: funnelData.invoice_viewed,
      fill: "#8b5cf6",
      icon: Eye,
    },
    {
      name: "Checkout Started",
      value: funnelData.checkout_started,
      fill: "#f59e0b",
      icon: ShoppingCart,
    },
    {
      name: "Payments Completed",
      value: funnelData.payment_succeeded,
      fill: "#10b981",
      icon: CheckCircle2,
    },
  ]

  const overallConversionRate = calculateConversionRate(funnelData.payment_succeeded, funnelData.email_sent)

  if (isLoading && recentEvents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Tracking</h1>
          <p className="text-muted-foreground">Monitor invoice conversion funnel and payment performance</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchTrackingData()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterInvoiceId} onValueChange={setFilterInvoiceId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filter by invoice" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            {invoices.map((invoice) => (
              <SelectItem key={invoice.id} value={invoice.id}>
                {invoice.invoice_number} - ${invoice.amount}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {funnelChartData.map((stage, index) => {
          const Icon = stage.icon
          const previousValue = index > 0 ? funnelChartData[index - 1].value : stage.value
          const conversionRate = calculateConversionRate(stage.value, previousValue)

          return (
            <Card key={stage.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stage.value}</div>
                <p className="text-xs text-muted-foreground">
                  {index > 0 ? `${conversionRate} conversion` : "Total sent"}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Conversion Funnel Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversion Funnel</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Overall conversion rate: <span className="font-bold text-primary">{overallConversionRate}</span>
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={funnelChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  const index = funnelChartData.findIndex((d) => d.name === props.payload.name)
                  const previousValue = index > 0 ? funnelChartData[index - 1].value : value
                  const rate = calculateConversionRate(value as number, previousValue)
                  return [value, `${name} (${index > 0 ? rate : "Total"})`]
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnelChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Tracking Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tracking events found</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium">Event Type</th>
                    <th className="p-4 text-left text-sm font-medium">Invoice</th>
                    <th className="p-4 text-left text-sm font-medium">User</th>
                    <th className="p-4 text-left text-sm font-medium">Timestamp</th>
                    <th className="p-4 text-left text-sm font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {event.event_type === "EMAIL_SENT" && <Mail className="h-4 w-4 text-blue-500" />}
                          {event.event_type === "INVOICE_VIEWED" && <Eye className="h-4 w-4 text-purple-500" />}
                          {event.event_type === "CHECKOUT_STARTED" && (
                            <ShoppingCart className="h-4 w-4 text-orange-500" />
                          )}
                          {event.event_type === "PAYMENT_SUCCEEDED" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium">{event.event_type.replace(/_/g, " ")}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{event.invoice_number || "N/A"}</td>
                      <td className="p-4 text-sm">{event.user_email || "Unknown"}</td>
                      <td className="p-4 text-sm">{new Date(event.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-sm text-muted-foreground">{event.metadata || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
