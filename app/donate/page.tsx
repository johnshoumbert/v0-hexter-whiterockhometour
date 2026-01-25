"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, DollarSign, Package, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { Checkbox } from "@/components/ui/checkbox"

export default function DonatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { event, isLoading: eventLoading } = useEvent()
  const { user, isLoading: authLoading } = useAuth()

  const [moneyFormData, setMoneyFormData] = useState({
    amount: "",
    message: "",
  })

  const [itemFormData, setItemFormData] = useState({
    item_name: "",
    estimated_value: "",
    item_description: "",
    donor_organization: "",
    donor_address: "",
    delivery_method: [] as string[],
    donation_notes: "",
  })

  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const presetAmounts = [25, 50, 100, 250, 500, 1000]

  const deliveryOptions = [
    { id: "deliver", label: "I will deliver the donation item" },
    { id: "pickup", label: "I need someone to pick up the donation item" },
    { id: "certificate_email", label: "I will provide the necessary certificate via email" },
    { id: "certificate_create", label: "I need a committee member to create a certificate" },
  ]

  useEffect(() => {
    if (user?.phone && !itemFormData.phone_number) {
      setItemFormData((prev) => ({ ...prev, phone_number: user.phone }))
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = window.location.pathname
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
    }
  }, [user, authLoading, router])

  const handleMoneyDonate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!event?.id) {
        toast.error("Unable to process donation. Please refresh the page and try again.")
        setLoading(false)
        return
      }

      const amount = Number.parseFloat(moneyFormData.amount)
      if (isNaN(amount) || amount < 1) {
        toast.error("Please enter a valid donation amount")
        setLoading(false)
        return
      }

      router.push(
        `/checkout?type=donation&eventId=${event.id}&amount=${amount}&message=${encodeURIComponent(moneyFormData.message)}`,
      )
    } catch (error) {
      console.error("[v0] Error processing donation:", error)
      toast.error("Failed to process donation. Please try again.")
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log("[v0] Starting image upload, file count:", files.length)

    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        console.log("[v0] Uploading file:", file.name, "Size:", file.size, "Type:", file.type)

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] Upload failed:", errorData)
          throw new Error(errorData.error || errorData.details || "Failed to upload image")
        }

        const data = await response.json()
        console.log("[v0] Upload successful:", data.url)
        uploadedUrls.push(data.url)
      }

      setUploadedImages([...uploadedImages, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
    } catch (error) {
      console.error("[v0] Error uploading images:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload images"
      toast.error(errorMessage)
    }
  }

  const handleDeliveryMethodChange = (methodId: string, checked: boolean) => {
    setItemFormData((prev) => {
      const newMethods = checked
        ? [...prev.delivery_method, methodId]
        : prev.delivery_method.filter((m) => m !== methodId)
      return { ...prev, delivery_method: newMethods }
    })
  }

  const handleItemDonate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!event?.id) {
        toast.error("Unable to process donation. Please refresh the page and try again.")
        setLoading(false)
        return
      }

      if (!itemFormData.item_name || !itemFormData.estimated_value) {
        toast.error("Please fill in all required fields")
        setLoading(false)
        return
      }

      const response = await fetch(`/api/events/${event.id}/auctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: itemFormData.item_name,
          description: itemFormData.item_description,
          min_bid: Number.parseFloat(itemFormData.estimated_value),
          bid_increment: 25,
          image_url: uploadedImages[0] || null,
          status: "pending",
          category: "Donated Items",
          donor: user?.name,
          is_donation: true,
          donor_user_id: user?.id,
          donor_name: user?.name,
          donor_email: user?.email,
          donor_phone: user?.phone,
          donor_organization: itemFormData.donor_organization || null,
          donor_address: itemFormData.donor_address || null,
          delivery_method: itemFormData.delivery_method.join(", "),
          donation_notes: itemFormData.donation_notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit item donation")
      }

      toast.success("Item donation submitted successfully! We'll review it shortly.")

      const donationReceipt = {
        type: "item",
        donationId: data.id || data.auction?.id,
        itemName: itemFormData.item_name,
        itemDescription: itemFormData.item_description,
        estimatedValue: itemFormData.estimated_value,
        donorName: user?.name,
        donorEmail: user?.email,
        donorPhone: user?.phone,
        donorOrganization: itemFormData.donor_organization,
        donorAddress: itemFormData.donor_address,
        deliveryMethod: itemFormData.delivery_method,
        donationNotes: itemFormData.donation_notes,
        images: uploadedImages,
        eventName: event?.event_name,
        eventId: event?.id,
        submittedAt: new Date().toISOString(),
      }
      sessionStorage.setItem("donation_receipt", JSON.stringify(donationReceipt))

      setItemFormData({
        item_name: "",
        estimated_value: "",
        item_description: "",
        donor_organization: "",
        donor_address: "",
        delivery_method: [],
        donation_notes: "",
      })
      setUploadedImages([])

      router.push("/donate/success?type=item")
    } catch (error) {
      console.error("[v0] Error submitting item donation:", error)
      toast.error("Failed to submit item donation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || eventLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!event) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Event not found. Please check the URL and try again.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <Heart className="mx-auto mb-4 h-16 w-16 text-primary" />
        <h1 className="text-4xl font-bold">Support Our Community</h1>
        <p className="mt-4 text-lg text-muted-foreground">Donate money or items to help make our event a success</p>
      </div>

      <Tabs defaultValue="money" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="money" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Donate Money
          </TabsTrigger>
          <TabsTrigger value="item" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Donate an Item
          </TabsTrigger>
        </TabsList>

        {/* Money Donation Tab */}
        <TabsContent value="money">
          <Card>
            <CardHeader>
              <CardTitle>Monetary Donation</CardTitle>
              <CardDescription>Choose an amount or enter a custom donation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMoneyDonate} className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Amount</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {presetAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={moneyFormData.amount === amount.toString() ? "default" : "outline"}
                        onClick={() => setMoneyFormData({ ...moneyFormData, amount: amount.toString() })}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Custom Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Enter amount"
                      value={moneyFormData.amount}
                      onChange={(e) => setMoneyFormData({ ...moneyFormData, amount: e.target.value })}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">Donating as:</p>
                  <p className="text-muted-foreground">{user.name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Leave a message of support..."
                    value={moneyFormData.message}
                    onChange={(e) => setMoneyFormData({ ...moneyFormData, message: e.target.value })}
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Processing..." : "Proceed to Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Donation Tab */}
        <TabsContent value="item">
          <Card>
            <CardHeader>
              <CardTitle>Item Donation Form</CardTitle>
              <CardDescription>
                Please provide details about the item you'd like to donate to our auction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleItemDonate} className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Donor Information</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Name:</span> {user.name}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Email:</span> {user.email}
                    </p>
                    {user.phone && (
                      <p>
                        <span className="font-medium text-foreground">Phone:</span> {user.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="donor_organization">Organization (Optional)</Label>
                    <Input
                      id="donor_organization"
                      placeholder="e.g., ABC Company"
                      value={itemFormData.donor_organization}
                      onChange={(e) => setItemFormData({ ...itemFormData, donor_organization: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donor_address">Address (Optional)</Label>
                    <Input
                      id="donor_address"
                      placeholder="Street address or pickup location"
                      value={itemFormData.donor_address}
                      onChange={(e) => setItemFormData({ ...itemFormData, donor_address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="item_name">Name of Item Donated *</Label>
                    <Input
                      id="item_name"
                      placeholder="e.g., Signed Baseball, Spa Package"
                      value={itemFormData.item_name}
                      onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_value">Estimated Dollar Value *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="estimated_value"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={itemFormData.estimated_value}
                        onChange={(e) => setItemFormData({ ...itemFormData, estimated_value: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_description">Brief Description of the Item *</Label>
                  <Textarea
                    id="item_description"
                    placeholder="Please provide details about the item, its condition, any special features, etc."
                    value={itemFormData.item_description}
                    onChange={(e) => setItemFormData({ ...itemFormData, item_description: e.target.value })}
                    rows={5}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Delivery Method</Label>
                  <div className="space-y-2">
                    {deliveryOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={itemFormData.delivery_method.includes(option.id)}
                          onCheckedChange={(checked) => handleDeliveryMethodChange(option.id, checked as boolean)}
                        />
                        <Label htmlFor={option.id} className="font-normal cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="donation_notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="donation_notes"
                    placeholder="Any special instructions or information about the donation..."
                    value={itemFormData.donation_notes}
                    onChange={(e) => setItemFormData({ ...itemFormData, donation_notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_images">Item Images (Optional)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="item_images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {uploadedImages.map((url, index) => (
                        <img
                          key={index}
                          src={url || "/placeholder.svg"}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <p className="font-semibold">What happens next?</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Your donation will be reviewed by our team</li>
                    <li>• We'll contact you within 2-3 business days</li>
                    <li>• Once approved, your item will be added to the auction</li>
                    <li>• We'll coordinate pickup or delivery arrangements with you</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Item Donation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
