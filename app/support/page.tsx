"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import type React from "react"

import { useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageSquare, Headset, Loader2, CheckCircle2, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const SUPPORT_CATEGORIES = [
  "Technical Issue",
  "Payment Problem",
  "Account Question",
  "Bidding Help",
  "General Inquiry",
  "Other",
]

export default function SupportPage() {
  const { event } = useEvent()
  const { user } = useAuth()
  const { toast } = useToast()

  const [showEventAdminDialog, setShowEventAdminDialog] = useState(false)
  const [showTechnicalDialog, setShowTechnicalDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [techForm, setTechForm] = useState({
    category: "",
    message: "",
    name: user?.name || "",
    email: user?.email || "",
  })

  const [eventAdminMessage, setEventAdminMessage] = useState("")
  const [eventAdminForm, setEventAdminForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    inquiries: [] as string[],
    message: "",
  })

  const INQUIRY_OPTIONS = [
    "General questions about the event",
    "Sponsorships",
    "I'm interested in donating",
    "I want to volunteer!",
    "Other",
  ]

  const handleTechnicalSupport = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event?.id,
          userId: user?.id,
          requesterName: techForm.name,
          requesterEmail: techForm.email,
          category: techForm.category,
          message: techForm.message,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit support ticket")
      }

      const data = await response.json()

      setSubmitSuccess(true)
      toast({
        title: "Support Ticket Created",
        description: `Ticket #${data.ticketNumber} has been created. We'll get back to you shortly.`,
      })

      // Reset form
      setTimeout(() => {
        setShowTechnicalDialog(false)
        setSubmitSuccess(false)
        setTechForm({ category: "", message: "", name: user?.name || "", email: user?.email || "" })
      }, 2000)
    } catch (error) {
      console.error("[v0] Error submitting support ticket:", error)
      toast({
        title: "Error",
        description: "Failed to submit support ticket. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEventAdminContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/support/contact-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event?.id,
          userId: user?.id,
          userName: eventAdminForm.fullName,
          userEmail: eventAdminForm.email,
          userPhone: eventAdminForm.phone,
          inquiries: eventAdminForm.inquiries,
          message: eventAdminForm.message,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the event admin.",
      })

      setShowEventAdminDialog(false)
      setEventAdminForm({ fullName: user?.name || "", email: user?.email || "", phone: "", inquiries: [], message: "" })
    } catch (error) {
      console.error("[v0] Error sending message to admin:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Support Center</h1>
        <p className="text-lg text-muted-foreground">How can we help you today?</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Message Event Admin Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Message Event Admin</CardTitle>
            </div>
            <CardDescription>Have a question about this event? Contact the event organizers directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowEventAdminDialog(true)} className="w-full" disabled={!user}>
              <Mail className="mr-2 h-4 w-4" />
              Contact Event Admin
            </Button>
            {!user && (
              <p className="text-xs text-muted-foreground mt-2 text-center">Please log in to message the event admin</p>
            )}
          </CardContent>
        </Card>

        {/* Technical Support Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Headset className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Get Technical Support</CardTitle>
            </div>
            <CardDescription>
              Having technical issues? Submit a support ticket and we'll help you resolve it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowTechnicalDialog(true)} className="w-full" variant="outline">
              <Headset className="mr-2 h-4 w-4" />
              Submit Support Ticket
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Event Admin Contact Dialog */}
      <Dialog open={showEventAdminDialog} onOpenChange={setShowEventAdminDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Event Admin</DialogTitle>
            <DialogDescription>Send a message to the event organizers. They'll get back to you soon.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEventAdminContact} className="space-y-6">
            <div className="text-sm text-muted-foreground">
              <span className="text-red-500">*</span> Fields marked with an asterisk are required
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-base font-semibold">
                FULL NAME <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full-name"
                value={eventAdminForm.fullName}
                onChange={(e) => setEventAdminForm({ ...eventAdminForm, fullName: e.target.value })}
                placeholder="Enter your full name"
                required
                className="h-12"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">
                E-MAIL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={eventAdminForm.email}
                onChange={(e) => setEventAdminForm({ ...eventAdminForm, email: e.target.value })}
                placeholder="Enter your email"
                required
                className="h-12"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base font-semibold">
                PHONE
              </Label>
              <Input
                id="phone"
                type="tel"
                value={eventAdminForm.phone}
                onChange={(e) => setEventAdminForm({ ...eventAdminForm, phone: e.target.value })}
                placeholder="Enter your phone number"
                className="h-12"
              />
            </div>

            {/* Inquiry Options */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                WHAT ARE YOU INQUIRING ABOUT? <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-3">
                {INQUIRY_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-3">
                    <Checkbox
                      id={option}
                      checked={eventAdminForm.inquiries.includes(option)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEventAdminForm({
                            ...eventAdminForm,
                            inquiries: [...eventAdminForm.inquiries, option],
                          })
                        } else {
                          setEventAdminForm({
                            ...eventAdminForm,
                            inquiries: eventAdminForm.inquiries.filter((item) => item !== option),
                          })
                        }
                      }}
                    />
                    <Label htmlFor={option} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-base font-semibold">
                YOUR MESSAGE <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                value={eventAdminForm.message}
                onChange={(e) => setEventAdminForm({ ...eventAdminForm, message: e.target.value })}
                placeholder="Type your message here..."
                className="min-h-[180px] resize-none"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEventAdminDialog(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !eventAdminForm.fullName.trim() ||
                  !eventAdminForm.email.trim() ||
                  eventAdminForm.inquiries.length === 0 ||
                  !eventAdminForm.message.trim()
                }
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Technical Support Dialog */}
      <Dialog open={showTechnicalDialog} onOpenChange={setShowTechnicalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Support Ticket</DialogTitle>
            <DialogDescription>Describe your issue and we'll get back to you as soon as possible.</DialogDescription>
          </DialogHeader>
          {submitSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-semibold">Support Ticket Created!</p>
              <p className="text-sm text-muted-foreground text-center">
                We've received your request and will respond via email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleTechnicalSupport} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tech-name">Your Name</Label>
                  <Input
                    id="tech-name"
                    value={techForm.name}
                    onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech-email">Your Email</Label>
                  <Input
                    id="tech-email"
                    type="email"
                    value={techForm.email}
                    onChange={(e) => setTechForm({ ...techForm, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tech-category">Category</Label>
                <Select
                  value={techForm.category}
                  onValueChange={(value) => setTechForm({ ...techForm, category: value })}
                  required
                >
                  <SelectTrigger id="tech-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tech-message">Describe Your Issue</Label>
                <Textarea
                  id="tech-message"
                  value={techForm.message}
                  onChange={(e) => setTechForm({ ...techForm, message: e.target.value })}
                  placeholder="Please provide details about your issue..."
                  className="min-h-[150px]"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTechnicalDialog(false)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !techForm.category || !techForm.message.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Ticket"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
