"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface EmailType {
  type: string
  name: string
  description: string
  envVar: string
}

interface GlobalTemplate {
  type: string
  name: string
  description: string
  envVar: string
  templateId: string | null
}

interface Event {
  id: string
  event_name: string
  settings: Array<{
    email_type: string
    enabled: boolean
    template_id: string | null
  }>
}

export default function EmailSettingsPage() {
  const [emailTypes, setEmailTypes] = useState<EmailType[]>([])
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/email-settings")
      if (!res.ok) throw new Error("Failed to fetch email settings")
      const data = await res.json()
      setEmailTypes(data.emailTypes)
      setGlobalTemplates(data.globalTemplates)
      setEvents(data.events)
    } catch (error) {
      console.error("[v0] Error fetching email settings:", error)
      toast({
        title: "Error",
        description: "Failed to load email settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground">
          Manage SendGrid templates and email notification settings across all events
        </p>
      </div>

      {/* Global Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Global SendGrid Templates</CardTitle>
          <CardDescription>
            Configure SendGrid template IDs in environment variables. These templates apply to all events unless
            overridden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {globalTemplates.map((template) => (
              <div key={template.type} className="flex items-start justify-between gap-4 pb-4 border-b last:border-0">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{template.name}</Label>
                    {template.templateId ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{template.envVar}</code>
                    {template.templateId && (
                      <Badge variant="outline" className="text-xs">
                        {template.templateId}
                      </Badge>
                    )}
                  </div>
                </div>
                {!template.templateId && (
                  <Badge variant="secondary">Not Configured</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Email Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Email Types</CardTitle>
          <CardDescription>All email notification types in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailTypes.map((emailType) => {
                const template = globalTemplates.find((t) => t.type === emailType.type)
                return (
                  <TableRow key={emailType.type}>
                    <TableCell className="font-medium">{emailType.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emailType.description}</TableCell>
                    <TableCell>
                      {template?.templateId ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Missing Template
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Events Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Event Email Settings</CardTitle>
          <CardDescription>
            Overview of email notification settings for each event. Configure individual settings in each event's admin
            panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No events found</p>
            ) : (
              events.map((event) => {
                const enabledCount = event.settings?.filter((s) => s.enabled).length || 0
                const totalCount = event.settings?.length || 0

                return (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{event.event_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {enabledCount} of {totalCount} email types enabled
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/event?eventId=${event.id}`}>Configure</a>
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Configure SendGrid Templates:</strong>
            <p className="text-muted-foreground mt-1">
              Add template IDs to your environment variables in Vercel. Each template should be created in SendGrid with
              appropriate dynamic data fields.
            </p>
          </div>
          <div>
            <strong>2. Enable/Disable Per Event:</strong>
            <p className="text-muted-foreground mt-1">
              Go to each event's settings page (/admin/event) to enable or disable specific email types for that event.
            </p>
          </div>
          <div>
            <strong>3. Test Emails:</strong>
            <p className="text-muted-foreground mt-1">
              Use the email API endpoints or trigger events (bids, auction end) to test that emails are sent correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
