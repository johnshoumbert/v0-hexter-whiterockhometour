"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, Mail, Clock, Key, Copy, Check } from "lucide-react"
import { toast } from "sonner"

export default function EmailSettingsPage() {
  const { event } = useEvent()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState({
    abandonmentEnabled: true,
    firstReminderHours: 24,
    secondReminderDays: 3,
    finalReminderDays: 5,
    maxReminders: 3,
  })

  useEffect(() => {
    if (!event?.id) return

    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/events/${event.id}/email-settings/abandonment`)
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error("[v0] Error fetching email settings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [event?.id])

  const handleSave = async () => {
    if (!event?.id) return

    setSaving(true)
    try {
      const response = await fetch(`/api/events/${event.id}/email-settings/abandonment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast.success("Email settings saved successfully")
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      console.error("[v0] Error saving email settings:", error)
      toast.error("Failed to save email settings")
    } finally {
      setSaving(false)
    }
  }

  const handleCopySecret = async () => {
    if (!event?.recovery_secret) return

    try {
      await navigator.clipboard.writeText(event.recovery_secret)
      setCopied(true)
      toast.success("Recovery secret copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy secret")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-muted-foreground">Configure automated email reminders and notifications</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>Recovery API Configuration</CardTitle>
          </div>
          <CardDescription>
            Use this secret key to trigger abandoned invoice recovery from external systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recovery Secret</Label>
            <div className="flex items-center gap-2">
              <Input value={event?.recovery_secret || "Loading..."} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={handleCopySecret}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Keep this secret safe. Use it to authenticate API requests.</p>
          </div>

          <div className="space-y-2">
            <Label>API Endpoint</Label>
            <Input
              value={`POST /api/events/${event?.id}/abandoned-invoice-recovery`}
              readOnly
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Request Body</Label>
            <pre className="p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
              {JSON.stringify({ secret: event?.recovery_secret || "YOUR_SECRET" }, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Example cURL:</strong>
            </p>
            <pre className="mt-2 text-xs font-mono overflow-x-auto text-blue-800 dark:text-blue-200">
              {`curl -X POST https://yoursite.com/api/events/${event?.id}/abandoned-invoice-recovery \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"${event?.recovery_secret || "YOUR_SECRET"}"}'`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Abandoned Invoice Recovery</CardTitle>
          </div>
          <CardDescription>
            Automatically send reminder emails to winners who viewed their invoices but have not completed payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Abandonment Recovery</Label>
              <p className="text-sm text-muted-foreground">Send automated reminders for unpaid invoices</p>
            </div>
            <Switch
              id="enabled"
              checked={settings.abandonmentEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, abandonmentEnabled: checked })}
            />
          </div>

          {settings.abandonmentEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstReminder">First Reminder</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="firstReminder"
                    type="number"
                    min="1"
                    max="72"
                    value={settings.firstReminderHours}
                    onChange={(e) =>
                      setSettings({ ...settings, firstReminderHours: Number.parseInt(e.target.value) || 24 })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">hours after invoice viewed</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondReminder">Second Reminder</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="secondReminder"
                    type="number"
                    min="1"
                    max="14"
                    value={settings.secondReminderDays}
                    onChange={(e) =>
                      setSettings({ ...settings, secondReminderDays: Number.parseInt(e.target.value) || 3 })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days after first reminder</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finalReminder">Final Reminder</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="finalReminder"
                    type="number"
                    min="1"
                    max="14"
                    value={settings.finalReminderDays}
                    onChange={(e) =>
                      setSettings({ ...settings, finalReminderDays: Number.parseInt(e.target.value) || 5 })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days after second reminder</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
                <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Reminder Schedule</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• First reminder: {settings.firstReminderHours} hours after viewing invoice</li>
                    <li>• Second reminder: {settings.secondReminderDays} days after first</li>
                    <li>• Final reminder: {settings.finalReminderDays} days after second</li>
                    <li>• Maximum {settings.maxReminders} reminders per invoice</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
