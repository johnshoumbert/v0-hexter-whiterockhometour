"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ContactFormSection() {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Message sent!",
          description: data.message,
        })
        setFormData({ name: "", email: "", subject: "", message: "" })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error submitting contact form:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Contact Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-semibold">Contact Us</h2>
        </div>
        <p className="text-muted-foreground mb-6">Send us a message and we'll get back to you as soon as possible.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </Card>

      {/* Quick Info */}
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Support Hours</h2>
          </div>
          <p className="text-muted-foreground mb-4">Our support team is available to help you:</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM EST
            </li>
            <li>
              <strong>Saturday:</strong> 10:00 AM - 4:00 PM EST
            </li>
            <li>
              <strong>Sunday:</strong> Closed
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">Response time: Usually within 24 hours</p>
        </Card>

        <Card className="p-6 bg-primary/5">
          <h3 className="font-semibold mb-2">Need immediate help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Check out our FAQ section below for quick answers to common questions.
          </p>
        </Card>
      </div>
    </div>
  )
}
