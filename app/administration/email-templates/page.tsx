"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Search, CheckCircle2, AlertCircle, Edit, Send } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface EmailTemplate {
  email_task: string
  template_id: string
  subject: string
  description: string
  required_fields: string[]
  optional_fields: string[]
  example_data: Record<string, any>
  is_active: boolean
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null)
  const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [testData, setTestData] = useState<Record<string, string>>({})
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/emails")
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditTemplate(template)
  }

  const handleTest = (template: EmailTemplate) => {
    setTestTemplate(template)
    setTestEmail("")
    // Initialize test data with required and optional fields
    const initialData: Record<string, string> = {}
    ;[...template.required_fields, ...template.optional_fields].forEach((field) => {
      initialData[field] = template.example_data[field] || ""
    })
    setTestData(initialData)
  }

  const sendTestEmail = async () => {
    if (!testTemplate || !testEmail) {
      toast({
        title: "Missing information",
        description: "Please enter a test email address",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailTask: testTemplate.email_task,
          to: testEmail,
          dynamicData: testData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Test email sent!",
          description: `Email queued successfully to ${testEmail}`,
        })
        setTestTemplate(null)
      } else {
        toast({
          title: "Failed to send test email",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const saveTemplate = async () => {
    if (!editTemplate) return

    try {
      const response = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTemplate),
      })

      if (response.ok) {
        toast({
          title: "Template updated",
          description: "Email template has been updated successfully",
        })
        setEditTemplate(null)
        fetchTemplates()
      } else {
        toast({
          title: "Failed to update template",
          description: "An error occurred while updating the template",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      })
    }
  }

  const filteredTemplates = templates.filter(
    (template) =>
      template.email_task.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground mt-2">Manage SendGrid email templates and their required data fields</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}
        </Badge>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {filteredTemplates.map((template) => (
          <AccordionItem key={template.email_task} value={template.email_task} className="border rounded-lg">
            <Card className="border-0">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-3 text-left">
                  <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{template.email_task}</h3>
                      {template.is_active ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">SendGrid Template ID</Label>
                      <code className="block mt-1 p-2 bg-muted rounded text-sm">{template.template_id}</code>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">API Endpoint</Label>
                      <code className="block mt-1 p-2 bg-muted rounded text-sm">POST /api/emails</code>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        Required Fields
                        <Badge variant="destructive" className="ml-1 text-xs">
                          {template.required_fields.length}
                        </Badge>
                      </Label>
                      <div className="mt-2 space-y-1">
                        {template.required_fields.map((field) => (
                          <Badge key={field} variant="outline" className="mr-1">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        Optional Fields
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {template.optional_fields.length}
                        </Badge>
                      </Label>
                      <div className="mt-2 space-y-1">
                        {template.optional_fields.map((field) => (
                          <Badge key={field} variant="secondary" className="mr-1">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Example Request</Label>
                    <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                      {`POST /api/emails
Content-Type: application/json

{
  "emailTask": "${template.email_task}",
  "to": "user@example.com",
  "dynamicData": ${JSON.stringify(template.example_data, null, 2)}
}`}
                    </pre>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleTest(template)}>
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </CardFooter>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates found matching your search</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Template Sheet */}
      <Sheet open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Email Template</SheetTitle>
            <SheetDescription>Update the SendGrid template configuration</SheetDescription>
          </SheetHeader>
          {editTemplate && (
            <div className="space-y-4 mt-6">
              <div>
                <Label>Email Task</Label>
                <Input
                  value={editTemplate.email_task}
                  onChange={(e) => setEditTemplate({ ...editTemplate, email_task: e.target.value })}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>SendGrid Template ID</Label>
                <Input
                  value={editTemplate.template_id}
                  onChange={(e) => setEditTemplate({ ...editTemplate, template_id: e.target.value })}
                  placeholder="d-xxxxxxxxxxxxx"
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={editTemplate.subject}
                  onChange={(e) => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editTemplate.description}
                  onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editTemplate.is_active}
                  onChange={(e) => setEditTemplate({ ...editTemplate, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={saveTemplate} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditTemplate(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Test Email Sheet */}
      <Sheet open={!!testTemplate} onOpenChange={() => setTestTemplate(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Test Email Template</SheetTitle>
            <SheetDescription>Send a test email with custom data</SheetDescription>
          </SheetHeader>
          {testTemplate && (
            <div className="space-y-4 mt-6">
              <div>
                <Label>Template</Label>
                <Input value={testTemplate.email_task} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Test Email Address *</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Required Fields</Label>
                {testTemplate.required_fields.map((field) => (
                  <div key={field}>
                    <Label className="text-xs">{field} *</Label>
                    <Input
                      value={testData[field] || ""}
                      onChange={(e) => setTestData({ ...testData, [field]: e.target.value })}
                      placeholder={`Enter ${field}`}
                    />
                  </div>
                ))}
              </div>
              {testTemplate.optional_fields.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Optional Fields</Label>
                  {testTemplate.optional_fields.map((field) => (
                    <div key={field}>
                      <Label className="text-xs">{field}</Label>
                      <Input
                        value={testData[field] || ""}
                        onChange={(e) => setTestData({ ...testData, [field]: e.target.value })}
                        placeholder={`Enter ${field} (optional)`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={sendTestEmail} disabled={isSending} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? "Sending..." : "Send Test Email"}
                </Button>
                <Button variant="outline" onClick={() => setTestTemplate(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
