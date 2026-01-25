"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { LoginModal } from "@/components/login-modal"
import { Loader2, Clock, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface SponsorLevel {
  level: string
  amount: number
  benefits: string[]
  sponsor_limit?: number | null
  sponsor_count?: number
}

interface SponsorRegistrationFormProps {
  eventId: string
  sponsorLevels: SponsorLevel[]
  selectedLevel?: SponsorLevel
  isCustomSponsor?: boolean
  onSubmitSuccess?: () => void
}

export function SponsorRegistrationForm({ eventId, sponsorLevels, selectedLevel: preSelectedLevel, isCustomSponsor = false, onSubmitSuccess }: SponsorRegistrationFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(preSelectedLevel?.level || (sponsorLevels.length > 0 ? sponsorLevels[0].level : ""))
  const [showPayLaterDialog, setShowPayLaterDialog] = useState(false)
  const [eventAdminEmail, setEventAdminEmail] = useState("")
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null)
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    company_name: "",
    company_address: "",
    company_website: "",
    sponsorship_level: preSelectedLevel?.level || (sponsorLevels.length > 0 ? sponsorLevels[0].level : ""),
    custom_amount: preSelectedLevel?.level === "custom" ? preSelectedLevel.amount.toString() : "",
    payment_method: "pay_now",
    logo_url: "",
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      setFormData((prev) => ({ ...prev, logo_url: data.url }))
      toast({ title: "Logo uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading logo", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setPendingSubmissionData(formData)
      setLoginModalOpen(true)
      return
    }

    if (!formData.contact_name || !formData.company_name || !formData.contact_email) {
      toast({ title: "Please fill in all required fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/sponsor-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to submit sponsorship request")

      const data = await response.json()
      const requestId = data.id
      const adminEmail = data.event_admin_email

      if (formData.payment_method === "pay_now") {
        // Get the sponsorship amount
        const amount = selectedLevel === "custom" 
          ? formData.custom_amount 
          : selectedLevelData?.amount || 0
        
        // Redirect to checkout page with proper query parameters
        router.push(`/checkout?type=sponsor&eventId=${eventId}&requestId=${requestId}&amount=${amount}`)
      } else if (formData.payment_method === "invoice") {
        router.push(`/sponsor/invoice/${requestId}`)
      } else if (formData.payment_method === "pay_later") {
        setEventAdminEmail(adminEmail)
        setShowPayLaterDialog(true)
      }

      toast({ title: "Sponsorship request submitted successfully!" })

      if (onSubmitSuccess) onSubmitSuccess()
    } catch (error) {
      toast({ title: "Error submitting request", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginSuccess = () => {
    toast({
      title: "Logged in successfully",
      description: "Submitting your sponsorship request...",
    })

    if (pendingSubmissionData) {
      setFormData(pendingSubmissionData)
      setPendingSubmissionData(null)

      setTimeout(() => {
        const form = document.querySelector("form")
        if (form) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
        }
      }, 100)
    }
  }

  const selectedLevelData = sponsorLevels.find((l) => l.level === selectedLevel)
  
  // Check if the selected level is sold out
  const isSoldOut = () => {
    if (!selectedLevelData || !selectedLevelData.sponsor_limit) return false
    return (selectedLevelData.sponsor_count || 0) >= selectedLevelData.sponsor_limit
  }

  const isLevelSoldOut = isSoldOut()

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name *</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email *</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Phone</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_website">Company Website</Label>
          <Input
            id="company_website"
            type="url"
            placeholder="https://example.com"
            value={formData.company_website}
            onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_address">Company Address</Label>
          <Textarea
            id="company_address"
            value={formData.company_address}
            onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Company Logo</Label>
          <Input id="logo" type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
          {formData.logo_url && (
            <img
              src={formData.logo_url || "/placeholder.svg"}
              alt="Logo preview"
              className="mt-2 h-12 w-auto rounded border"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sponsorship_level">Sponsorship Level *</Label>
          <Select
            value={selectedLevel}
            onValueChange={(val) => {
              setSelectedLevel(val)
              setFormData({ ...formData, sponsorship_level: val })
            }}
            disabled={true}
          >
            <SelectTrigger id="sponsorship_level" disabled={true}>
              <SelectValue placeholder="Select a sponsorship level" />
            </SelectTrigger>
            <SelectContent>
              {sponsorLevels.map((level) => (
                <SelectItem key={level.level} value={level.level}>
                  {level.level.charAt(0).toUpperCase() + level.level.slice(1)} - ${level.amount}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedLevel === "custom" && (
          <div className="space-y-2">
            <Label htmlFor="custom_amount">Custom Amount *</Label>
            <Input
              id="custom_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter sponsorship amount"
              value={formData.custom_amount}
              onChange={(e) => setFormData({ ...formData, custom_amount: e.target.value })}
            />
          </div>
        )}

        {selectedLevelData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sponsorship Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selectedLevelData.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-primary">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label htmlFor="payment_method">Payment Method *</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
          >
            <SelectTrigger id="payment_method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pay_now">Pay Now</SelectItem>
              <SelectItem value="pay_later">Pay Later</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || isUploading || isLevelSoldOut}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLevelSoldOut ? "Already Sponsored" : "Submit Sponsorship Request"}
        </Button>
      </form>

      <Dialog open={showPayLaterDialog} onOpenChange={setShowPayLaterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Payment Promise Required
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <p className="font-medium text-foreground">Thank you for your sponsorship commitment!</p>
                <p className="text-sm">
                  You have <span className="font-bold text-primary">72 hours</span> to complete your payment.
                </p>
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium">Please reach out to the event administrator:</p>
                    <a href={`mailto:${eventAdminEmail}`} className="text-primary hover:underline break-all">
                      {eventAdminEmail}
                    </a>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  A confirmation email has been sent to you with payment details and instructions.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowPayLaterDialog(false)
                router.push("/")
              }}
              className="w-full"
            >
              I Promise to Pay Within 72 Hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onSuccess={handleLoginSuccess} />
    </>
  )
}
