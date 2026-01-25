"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2, FileText } from "lucide-react"

const pricingPlans = [
  {
    id: "single",
    name: "Single Event",
    price: 350,
    events: 1,
    description: "Perfect for one-time fundraising auctions",
    features: [
      "1 Event License",
      "Unlimited Auction Items",
      "Unlimited Bidders",
      "Payment Processing via Stripe",
      "Email Support",
      "Mobile Responsive Design",
      "Real-time Bid Updates",
      "Donor Management",
    ],
  },
  {
    id: "double",
    name: "Double Event",
    price: 550,
    events: 2,
    savings: 150,
    description: "Great value for schools planning multiple events",
    features: [
      "2 Event Licenses",
      "Everything in Single Event",
      "Save $100",
      "Priority Email Support",
      "Advanced Analytics",
      "Custom Branding Options",
    ],
    popular: true,
  },
  {
    id: "triple",
    name: "Triple Event",
    price: 700,
    events: 3,
    savings: 350,
    description: "Best deal for year-round fundraising",
    features: [
      "3 Event Licenses",
      "Everything in Double Event",
      "Save $250",
      "Dedicated Support Rep",
      "Premium Features",
      "Training & Onboarding",
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showPOModal, setShowPOModal] = useState(false)
  const [poForm, setPOForm] = useState({ name: "", phone: "", email: "" })
  const [discountCode, setDiscountCode] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountValidating, setDiscountValidating] = useState(false)
  const [discountMessage, setDiscountMessage] = useState("")
  const [discountValid, setDiscountValid] = useState(false)
  const [poLoading, setPOLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingUser, setFetchingUser] = useState(false)

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        setFetchingUser(true)
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const user = await response.json()
          if (user?.email) {
            setEmail(user.email)
          }
        }
      } catch (error) {
        console.error("[v0] Failed to fetch user email:", error)
      } finally {
        setFetchingUser(false)
      }
    }

    fetchUserEmail()
  }, [])

  const handleGetStarted = (planId: string) => {
    setSelectedPlan(planId)
    setShowCheckoutModal(true)
  }

  const handleCheckout = async () => {
    if (!email || !email.includes("@")) {
      return
    }

    if (!selectedPlan) return

    setLoading(true)
    try {
      console.log("[v0] Starting checkout for plan:", selectedPlan)

      const response = await fetch("/api/checkout/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan, email }),
      })

      console.log("[v0] Checkout response status:", response.status)

      if (!response.ok) {
        const text = await response.text()
        console.error("[v0] Checkout error response:", text)
        let errorMessage = "Checkout failed"
        try {
          const errorData = JSON.parse(text)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = text || errorMessage
        }
        alert(errorMessage)
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log("[v0] Checkout data:", data)

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[v0] No checkout URL returned")
        alert("Failed to create checkout session")
        setLoading(false)
      }
    } catch (error) {
      console.error("[v0] Checkout error:", error)
      alert("An error occurred during checkout")
      setLoading(false)
    }
  }

  const handleDiscountCodeChange = async (code: string) => {
    setDiscountCode(code)

    if (!code.trim()) {
      setDiscountAmount(0)
      setDiscountMessage("")
      setDiscountValid(false)
      return
    }

    setDiscountValidating(true)
    setDiscountMessage("")

    try {
      const response = await fetch("/api/po-requests/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (data.valid) {
        setDiscountAmount(data.discount)
        setDiscountMessage(data.message)
        setDiscountValid(true)
      } else {
        setDiscountAmount(0)
        setDiscountMessage(data.message)
        setDiscountValid(false)
      }
    } catch (error) {
      console.error("[v0] Error validating discount code:", error)
      setDiscountAmount(0)
      setDiscountMessage("Error validating code")
      setDiscountValid(false)
    } finally {
      setDiscountValidating(false)
    }
  }

  const handlePORequest = async () => {
    if (!poForm.name || !poForm.phone || !poForm.email) {
      alert("Please fill in all fields")
      return
    }

    if (discountCode && !discountValid) {
      alert("Please enter a valid discount code or remove it")
      return
    }

    setPOLoading(true)
    try {
      const response = await fetch("/api/po-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...poForm,
          discountCode: discountCode.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create PO request")
      }

      const data = await response.json()

      window.open(`/api/po-requests/${data.id}/pdf`, "_blank")

      setPOForm({ name: "", phone: "", email: "" })
      setDiscountCode("")
      setDiscountAmount(0)
      setDiscountMessage("")
      setDiscountValid(false)
      setShowPOModal(false)

      alert("Purchase Order invoice generated successfully! Check your new browser tab.")
    } catch (error: any) {
      console.error("[v0] PO request error:", error)
      alert(error.message || "Failed to generate purchase order. Please try again.")
    } finally {
      setPOLoading(false)
    }
  }

  const basePrice = 500
  const totalDue = basePrice - discountAmount

  const selectedPlanData = pricingPlans.find((p) => p.id === selectedPlan)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your school&apos;s fundraising needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 mb-12">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-fit">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="mb-4">{plan.description}</CardDescription>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">
                    / {plan.events} event{plan.events > 1 ? "s" : ""}
                  </span>
                </div>
                {plan.savings && <p className="text-sm text-green-600 font-semibold mt-2">Save ${plan.savings}!</p>}
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleGetStarted(plan.id)}
                  className="w-full"
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* PO Request Section */}
        <div className="max-w-3xl mx-auto mt-16 mb-12">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <FileText className="h-6 w-6" />
                Need a PO for Your School?
              </CardTitle>
              <CardDescription className="text-base">
                Get an official purchase order invoice to submit to your school's accounting department
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" variant="outline" onClick={() => setShowPOModal(true)}>
                Request Purchase Order
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What&apos;s included in an event license?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Each event license allows you to create one complete auction event with unlimited items, unlimited
                  bidders, payment processing, and full access to all platform features.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I upgrade later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can purchase additional event licenses at any time. Contact support for multi-event package
                  upgrades.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards, debit cards, and digital wallets through our secure Stripe payment
                  processor.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Existing Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>You&apos;ve selected the {selectedPlanData?.name} plan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPlanData && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{selectedPlanData.name}</span>
                    <span className="text-2xl font-bold">${selectedPlanData.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{selectedPlanData.description}</p>
                  {selectedPlanData.savings && (
                    <p className="text-sm text-green-600 font-semibold">Save ${selectedPlanData.savings}!</p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="modal-email">Email Address *</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || fetchingUser}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll send your receipt and license information to this email
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCheckoutModal(false)
                }}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCheckout} disabled={loading || !email || !email.includes("@")} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Request Modal */}
      <Dialog open={showPOModal} onOpenChange={setShowPOModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Purchase Order</DialogTitle>
            <DialogDescription>Enter your information to generate an official PO invoice</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="po-name">Name *</Label>
              <Input
                id="po-name"
                placeholder="Martha Turner Reilly Elementary School PTA"
                value={poForm.name}
                onChange={(e) => setPOForm({ ...poForm, name: e.target.value })}
                disabled={poLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-phone">Phone *</Label>
              <Input
                id="po-phone"
                type="tel"
                placeholder="(972) 749-7800"
                value={poForm.phone}
                onChange={(e) => setPOForm({ ...poForm, phone: e.target.value })}
                disabled={poLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-email">Email *</Label>
              <Input
                id="po-email"
                type="email"
                placeholder="reillyptavolunteering@gmail.com"
                value={poForm.email}
                onChange={(e) => setPOForm({ ...poForm, email: e.target.value })}
                disabled={poLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-discount">Discount Code (Optional)</Label>
              <Input
                id="po-discount"
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => handleDiscountCodeChange(e.target.value)}
                disabled={poLoading}
              />
              {discountValidating && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Validating code...
                </p>
              )}
              {!discountValidating && discountMessage && (
                <p className={`text-xs font-medium ${discountValid ? "text-green-600" : "text-destructive"}`}>
                  {discountValid ? "✓" : "✗"} {discountMessage}
                </p>
              )}
              {discountValid && discountAmount > 0 && (
                <p className="text-xs text-green-600 font-medium">Discount applied: ${discountAmount.toFixed(2)} off</p>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Invoice Details:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Software License: ${basePrice.toFixed(2)}</li>
                {discountAmount > 0 && <li className="text-green-600">• Discount: -${discountAmount.toFixed(2)}</li>}
                <li>
                  • <strong>Total Due: ${totalDue.toFixed(2)}</strong>
                </li>
                <li>• Payment Terms: 1 Payment (Due in 14 days)</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPOModal(false)} disabled={poLoading} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handlePORequest}
                disabled={poLoading || !poForm.name || !poForm.phone || !poForm.email}
                className="flex-1"
              >
                {poLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
