"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles, Check, Building2, Calendar, Settings, CreditCard, Package, PartyPopper } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Image from "next/image"

const STEPS = [
  { id: 0, name: "License", icon: CreditCard }, // Add license step
  { id: 1, name: "Organization", icon: Building2 },
  { id: 2, name: "Auction", icon: Calendar },
  { id: 3, name: "Features", icon: Settings },
  { id: 4, name: "Payment", icon: CreditCard },
  { id: 5, name: "Items", icon: Package },
]

export default function CreateAuctionPage() {
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0) // Start at step 0
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Step 1: Organization
  const [orgName, setOrgName] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgEmail, setOrgEmail] = useState("")
  const [orgWebsite, setOrgWebsite] = useState("")
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null)
  const [orgLogoPreview, setOrgLogoPreview] = useState<string>("")
  const [orgLogoUrl, setOrgLogoUrl] = useState("")
  const [organizationId, setOrganizationId] = useState("")

  // Step 2: Auction
  const [auctionName, setAuctionName] = useState("")
  const [auctionDescription, setAuctionDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState("")
  const [auctionType, setAuctionType] = useState("silent")
  const [eventId, setEventId] = useState("")

  // Step 3: Features
  const [features, setFeatures] = useState({
    notifications: true,
    donorPortal: false,
    bidHistory: true,
    leaderboard: true,
    autoBid: false,
  })

  // Step 4: Payment
  const [paymentProvider, setPaymentProvider] = useState("stripe")

  // Step 5: Items
  const [items, setItems] = useState<any[]>([])
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [itemDonor, setItemDonor] = useState("")
  const [itemStartingBid, setItemStartingBid] = useState("")
  const [itemBuyNow, setItemBuyNow] = useState("")
  const [itemImageFile, setItemImageFile] = useState<File | null>(null)

  const [licenseCode, setLicenseCode] = useState("")
  const [licenseVerified, setLicenseVerified] = useState(false)
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([])
  const [selectedLicense, setSelectedLicense] = useState("")
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false)
  const [licenseError, setLicenseError] = useState("")
  const [verifiedLicenseId, setVerifiedLicenseId] = useState("")

  const [hasExistingOrg, setHasExistingOrg] = useState(false)
  const [orgValidationError, setOrgValidationError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const licenseParam = params.get("license")
    if (licenseParam) {
      setLicenseCode(licenseParam)
      setSelectedLicense(licenseParam)
    }
  }, [])

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login?redirect=/create-auction")
    }
  }, [user, isAuthLoading, router])

  useEffect(() => {
    if (user) {
      fetchAvailableLicenses()
    }
  }, [user])

  useEffect(() => {
    if (user && currentStep === 1) {
      fetchUserOrganization()
    }
  }, [user, currentStep])

  const handleGenerateOrgDescription = async () => {
    if (!orgName) {
      toast({ title: "Please enter an organization name first", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "organization", data: { name: orgName } }),
      })

      if (!response.ok) throw new Error("Failed to generate description")

      const { text } = await response.json()
      setOrgDescription(text)
      toast({ title: "Description generated!" })
    } catch (error) {
      toast({ title: "Failed to generate description", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateAuctionDescription = async () => {
    if (!auctionName) {
      toast({ title: "Please enter an auction name first", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auction",
          data: { name: auctionName, organizationName: orgName },
        }),
      })

      if (!response.ok) throw new Error("Failed to generate description")

      const { text } = await response.json()
      setAuctionDescription(text)
      toast({ title: "Description generated!" })
    } catch (error) {
      toast({ title: "Failed to generate description", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateItemDescription = async () => {
    if (!itemName || !itemDonor) {
      toast({ title: "Please enter item name and donor first", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "item",
          data: { name: itemName, donor: itemDonor },
        }),
      })

      if (!response.ok) throw new Error("Failed to generate description")

      const { text } = await response.json()
      setItemDescription(text)
      toast({ title: "Description generated!" })
    } catch (error) {
      toast({ title: "Failed to generate description", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const validateOrganizationName = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/organizations/check-name?name=${encodeURIComponent(name)}`)
      if (!response.ok) return true // If check fails, allow to proceed

      const data = await response.json()
      return !data.exists
    } catch (error) {
      console.error("[v0] Error checking organization name:", error)
      return true // Allow to proceed if check fails
    }
  }

  const handleStep1Next = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[v0] Step 1 Next button clicked!")
    console.log("[v0] Has existing org:", hasExistingOrg)
    console.log("[v0] Current orgName:", orgName)
    console.log("[v0] Organization ID:", organizationId)

    if (!orgName) {
      console.log("[v0] Validation failed: no org name")
      toast({ title: "Please enter an organization name", variant: "destructive" })
      return
    }

    if (hasExistingOrg && organizationId) {
      console.log("[v0] User has existing organization, skipping creation...")
      setCurrentStep(2)
      return
    }

    setIsLoading(true)
    setOrgValidationError("")

    const isUnique = await validateOrganizationName(orgName)
    if (!isUnique) {
      setOrgValidationError("An organization with this name already exists. Please choose a different name.")
      setIsLoading(false)
      toast({
        title: "Organization name already exists",
        description: "Please choose a different name for your organization",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Starting organization creation...")

    try {
      let logoUrl = orgLogoUrl
      if (orgLogoFile) {
        console.log("[v0] Uploading logo file...")
        try {
          const formData = new FormData()
          formData.append("file", orgLogoFile)

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          if (uploadResponse.ok) {
            const { url } = await uploadResponse.json()
            logoUrl = url
            console.log("[v0] Logo uploaded:", logoUrl)
          } else {
            // Silently skip logo upload if it fails
            console.log("[v0] Logo upload skipped - continuing without logo")
          }
        } catch (uploadError) {
          // Silently skip logo upload if it fails
          console.log("[v0] Logo upload skipped - continuing without logo")
        }
      }

      console.log("[v0] Calling /api/organizations...")
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName,
          description: orgDescription,
          email: orgEmail,
          website: orgWebsite,
          logo_url: logoUrl,
        }),
      })

      console.log("[v0] Organization API response status:", response.status)
      const responseData = await response.json()
      console.log("[v0] Organization API response data:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create organization")
      }

      const { organization } = responseData
      console.log("[v0] Organization created successfully:", organization.id)

      setOrganizationId(organization.id)
      setHasExistingOrg(true)
      console.log("[v0] Moving to step 2...")
      setCurrentStep(2)
      toast({ title: "Organization created!" })
    } catch (error) {
      console.error("[v0] Error in handleStep1Next:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      if (errorMessage.includes("already belong to an organization")) {
        toast({
          title: "You already have an organization",
          description: "Loading your existing organization details...",
          variant: "destructive",
        })
        // Reload organization data
        await fetchUserOrganization()
      } else {
        toast({
          title: "Failed to create organization",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
      console.log("[v0] handleStep1Next completed")
    }
  }

  const handleStep2Next = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[v0] Step 2 Next button clicked!")

    if (!auctionName || !startDate || !endDate) {
      console.log("[v0] Validation failed: missing required fields")
      toast({ title: "Please fill in all required fields", variant: "destructive" })
      return
    }

    setIsLoading(true)
    console.log("[v0] Starting auction creation...")

    try {
      console.log("[v0] Calling /api/events...")
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: auctionName,
          hero_description: auctionDescription,
          start_date: startDate,
          end_date: endDate,
          domain: `${auctionName.toLowerCase().replace(/\s+/g, "-")}.myschoolauction.com`,
          organization_id: organizationId,
          is_silent_auction: auctionType === "silent",
          license_id: verifiedLicenseId,
          license_code: licenseCode,
        }),
      })

      console.log("[v0] Event API response status:", response.status)
      const responseData = await response.json()
      console.log("[v0] Event API response data:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create auction")
      }

      const { event } = responseData
      console.log("[v0] Event created successfully:", event.id)

      setEventId(event.id)
      console.log("[v0] Moving to step 3...")
      setCurrentStep(3)
      toast({ title: "Auction created!" })
    } catch (error) {
      console.error("[v0] Error in handleStep2Next:", error)
      toast({
        title: "Failed to create auction",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log("[v0] handleStep2Next completed")
    }
  }

  const handleStep3Next = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[v0] Step 3 Next button clicked!")

    setIsLoading(true)
    console.log("[v0] Saving features...")

    try {
      console.log("[v0] Calling /api/events/${eventId}...")
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_bids: features.autoBid,
          allow_likes: features.leaderboard,
        }),
      })

      console.log("[v0] Features API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Features save failed:", errorData)
        throw new Error(errorData.error || "Failed to save features")
      }

      console.log("[v0] Moving to step 4...")
      setCurrentStep(4)
      toast({ title: "Features configured!" })
    } catch (error) {
      console.error("[v0] Error in handleStep3Next:", error)
      toast({
        title: "Failed to save features",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log("[v0] handleStep3Next completed")
    }
  }

  const handleStep4Next = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[v0] Step 4 Next button clicked!")
    console.log("[v0] Moving to step 5...")
    setCurrentStep(5)
    toast({ title: "Payment setup complete!" })
  }

  const handleAddItem = async () => {
    if (!itemName || !itemStartingBid) {
      toast({ title: "Please enter item name and starting bid", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      // Upload item image if provided
      let imageUrl = ""
      if (itemImageFile) {
        const formData = new FormData()
        formData.append("file", itemImageFile)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json()
          imageUrl = url
        }
      }

      const response = await fetch(`/api/events/${eventId}/auctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: itemName,
          description: itemDescription,
          donor: itemDonor,
          min_bid: Number.parseFloat(itemStartingBid),
          image_url: imageUrl,
          status: "active",
        }),
      })

      if (!response.ok) throw new Error("Failed to add item")

      const { auction } = await response.json()
      setItems([...items, auction])

      // Reset form
      setItemName("")
      setItemDescription("")
      setItemDonor("")
      setItemStartingBid("")
      setItemBuyNow("")
      setItemImageFile(null)

      toast({ title: "Item added!" })
    } catch (error) {
      toast({ title: "Failed to add item", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    toast({
      title: "Auction created successfully!",
      description: "Redirecting to your new auction dashboard...",
    })
    router.push(`/admin?event=${eventId}`)
  }

  const fetchAvailableLicenses = async () => {
    setIsLoadingLicenses(true)
    try {
      const response = await fetch("/api/users/me/licenses")
      if (!response.ok) throw new Error("Failed to fetch licenses")

      const data = await response.json()
      setAvailableLicenses(data.licenses || [])
      console.log("[v0] Available licenses:", data.licenses)
    } catch (error) {
      console.error("[v0] Error fetching licenses:", error)
    } finally {
      setIsLoadingLicenses(false)
    }
  }

  const fetchUserOrganization = async () => {
    try {
      console.log("[v0] Fetching user organization...")
      const response = await fetch("/api/organizations/me")
      if (!response.ok) {
        console.log("[v0] No organization found or error fetching")
        setHasExistingOrg(false)
        return
      }

      const data = await response.json()
      console.log("[v0] Organization data:", data)

      if (data.organization) {
        const org = data.organization
        console.log("[v0] User has existing organization, prefilling and marking as existing...")
        setHasExistingOrg(true)
        setOrgName(org.name || "")
        setOrgDescription(org.description || "")
        setOrgEmail(org.email || "")
        setOrgWebsite(org.website || "")
        setOrgLogoUrl(org.logo_url || "")
        setOrganizationId(org.id)
        toast({ title: "Using your existing organization" })
      } else {
        setHasExistingOrg(false)
      }
    } catch (error) {
      console.error("[v0] Error fetching organization:", error)
      setHasExistingOrg(false)
    }
  }

  const handleStep0Next = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[v0] Step 0 (License) Next button clicked!")

    const codeToVerify = selectedLicense || licenseCode

    if (!codeToVerify) {
      toast({ title: "Please select a license or enter a license code", variant: "destructive" })
      return
    }

    setIsLoading(true)
    setLicenseError("")
    try {
      const response = await fetch("/api/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToVerify, email: user?.email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Invalid license code")
      }

      const data = await response.json()
      console.log("[v0] License verified:", data)

      setVerifiedLicenseId(data.licenseId)
      setLicenseCode(codeToVerify)
      setLicenseVerified(true)
      setCurrentStep(1)
      toast({ title: "License verified!" })
    } catch (error) {
      console.error("[v0] License verification error:", error)
      const errorMessage = error instanceof Error ? error.message : "Invalid license code"
      setLicenseError(errorMessage)
      toast({
        title: "License verification failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (orgLogoFile) {
      const objectUrl = URL.createObjectURL(orgLogoFile)
      setOrgLogoPreview(objectUrl)

      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setOrgLogoPreview("")
    }
  }, [orgLogoFile])

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isComplete = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors ${
                        isComplete
                          ? "border-primary bg-primary text-primary-foreground"
                          : isActive
                            ? "border-primary bg-background text-primary"
                            : "border-muted bg-background text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${isComplete ? "bg-primary" : "bg-muted"}`}
                      style={{ marginTop: "-24px" }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select License</CardTitle>
              <CardDescription>
                {availableLicenses.length > 0
                  ? "Select one of your available licenses or enter a new license code"
                  : "Enter the license code you received after purchase"}{" "}
                Don't have one?{" "}
                <a href="/pricing" className="text-primary hover:underline">
                  Purchase a license
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingLicenses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading your licenses...</span>
                </div>
              ) : availableLicenses.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>Your Available Licenses</Label>
                    <RadioGroup value={selectedLicense} onValueChange={setSelectedLicense}>
                      {availableLicenses.map((license) => (
                        <div key={license.id} className="flex items-center space-x-2 rounded-lg border p-4">
                          <RadioGroupItem value={license.code} id={license.code} />
                          <Label htmlFor={license.code} className="flex-1 font-normal cursor-pointer">
                            <div className="font-mono font-semibold">{license.code}</div>
                            <p className="text-sm text-muted-foreground">
                              {license.eventCount} {license.eventCount === 1 ? "event" : "events"} • Purchased{" "}
                              {new Date(license.createdAt).toLocaleDateString()}
                            </p>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or enter a new code</span>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="licenseCode">
                  {availableLicenses.length > 0 ? "New License Code" : "License Code *"}
                </Label>
                <Input
                  id="licenseCode"
                  placeholder="XXXX-XXXX-XXXX"
                  value={licenseCode}
                  onChange={(e) => {
                    setLicenseCode(e.target.value.toUpperCase())
                    setSelectedLicense("") // Clear selection when typing
                  }}
                  className="font-mono text-lg tracking-wider"
                />
                <p className="text-sm text-muted-foreground">
                  Check your email for the license code sent after purchase
                </p>
              </div>

              {licenseError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm text-destructive font-medium">{licenseError}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/pricing")} disabled={isLoading} type="button">
                Buy License
              </Button>
              <Button
                onClick={handleStep0Next}
                disabled={isLoading || (!selectedLicense && !licenseCode)}
                type="button"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Continue
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{hasExistingOrg ? "Your Organization" : "Create Organization"}</CardTitle>
              <CardDescription>
                {hasExistingOrg ? "Review your organization details" : "Tell us about your school or PTA organization"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasExistingOrg && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                  <p className="text-sm font-medium">Using your existing organization</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can update these details later in your organization settings
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  placeholder="Lincoln Elementary PTA"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value)
                    setOrgValidationError("")
                  }}
                  disabled={hasExistingOrg}
                />
                {orgValidationError && <p className="text-sm text-destructive">{orgValidationError}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="orgDescription">Description</Label>
                  {!hasExistingOrg && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateOrgDescription}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate with AI
                    </Button>
                  )}
                </div>
                <Textarea
                  id="orgDescription"
                  placeholder="A brief description of your organization..."
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows={4}
                  disabled={hasExistingOrg}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    placeholder="contact@lincolnpta.org"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    disabled={hasExistingOrg}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgWebsite">Website</Label>
                  <Input
                    id="orgWebsite"
                    type="url"
                    placeholder="https://lincolnpta.org"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    disabled={hasExistingOrg}
                  />
                </div>
              </div>

              {!hasExistingOrg && (
                <div className="space-y-2">
                  <Label htmlFor="orgLogo">Logo</Label>
                  <Input
                    id="orgLogo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setOrgLogoFile(e.target.files?.[0] || null)}
                  />
                  {orgLogoPreview && (
                    <div className="mt-4 rounded-lg border p-4">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <div className="relative w-32 h-32">
                        <Image
                          src={orgLogoPreview || "/placeholder.svg"}
                          alt="Logo preview"
                          fill
                          className="object-contain rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasExistingOrg && orgLogoUrl && (
                <div className="space-y-2">
                  <Label>Current Logo</Label>
                  <div className="rounded-lg border p-4">
                    <div className="relative w-32 h-32">
                      <Image
                        src={orgLogoUrl || "/placeholder.svg"}
                        alt="Organization logo"
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)} disabled={isLoading} type="button">
                Back
              </Button>
              <Button onClick={handleStep1Next} disabled={isLoading} type="button">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {hasExistingOrg ? "Continue" : "Next"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Create Auction</CardTitle>
              <CardDescription>Set up your fundraising auction details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auctionName">Auction Name *</Label>
                <Input
                  id="auctionName"
                  placeholder="Spring Gala 2025"
                  value={auctionName}
                  onChange={(e) => setAuctionName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auctionDescription">Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAuctionDescription}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea
                  id="auctionDescription"
                  placeholder="A compelling description of your auction..."
                  value={auctionDescription}
                  onChange={(e) => setAuctionDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="School Gymnasium"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Auction Type</Label>
                <RadioGroup value={auctionType} onValueChange={setAuctionType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="silent" id="silent" />
                    <Label htmlFor="silent" className="font-normal">
                      Silent Auction
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="live" id="live" />
                    <Label htmlFor="live" className="font-normal">
                      Live Auction
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="font-normal">
                      Online Auction
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isLoading} type="button">
                Back
              </Button>
              <Button onClick={handleStep2Next} disabled={isLoading} type="button">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Add Features</CardTitle>
              <CardDescription>Choose which features to enable for your auction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifications"
                  checked={features.notifications}
                  onCheckedChange={(checked) => setFeatures({ ...features, notifications: checked as boolean })}
                />
                <Label htmlFor="notifications" className="font-normal">
                  Enable Bidding Notifications
                  <p className="text-sm text-muted-foreground">Send real-time notifications when users are outbid</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="donorPortal"
                  checked={features.donorPortal}
                  onCheckedChange={(checked) => setFeatures({ ...features, donorPortal: checked as boolean })}
                />
                <Label htmlFor="donorPortal" className="font-normal">
                  Donor Portal
                  <p className="text-sm text-muted-foreground">Allow donors to submit items directly</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bidHistory"
                  checked={features.bidHistory}
                  onCheckedChange={(checked) => setFeatures({ ...features, bidHistory: checked as boolean })}
                />
                <Label htmlFor="bidHistory" className="font-normal">
                  Bid History
                  <p className="text-sm text-muted-foreground">Show complete bidding history for each item</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="leaderboard"
                  checked={features.leaderboard}
                  onCheckedChange={(checked) => setFeatures({ ...features, leaderboard: checked as boolean })}
                />
                <Label htmlFor="leaderboard" className="font-normal">
                  Leaderboard
                  <p className="text-sm text-muted-foreground">Display top bidders and fundraising progress</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoBid"
                  checked={features.autoBid}
                  onCheckedChange={(checked) => setFeatures({ ...features, autoBid: checked as boolean })}
                />
                <Label htmlFor="autoBid" className="font-normal">
                  Auto-bid Limits
                  <p className="text-sm text-muted-foreground">Allow users to set maximum bid amounts</p>
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isLoading} type="button">
                Back
              </Button>
              <Button onClick={handleStep3Next} disabled={isLoading} type="button">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Setup</CardTitle>
              <CardDescription>Choose your payment provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentProvider} onValueChange={setPaymentProvider}>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe" className="flex-1 font-normal">
                    <div className="font-semibold">Stripe</div>
                    <p className="text-sm text-muted-foreground">Industry-leading payment processing</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex-1 font-normal">
                    <div className="font-semibold">PayPal</div>
                    <p className="text-sm text-muted-foreground">Trusted by millions worldwide</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="zeffy" id="zeffy" />
                  <Label htmlFor="zeffy" className="flex-1 font-normal">
                    <div className="font-semibold">Zeffy</div>
                    <p className="text-sm text-muted-foreground">Free donation-based platform</p>
                  </Label>
                </div>
              </RadioGroup>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  You can configure payment settings later in the admin dashboard
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)} type="button">
                Back
              </Button>
              <Button onClick={handleStep4Next} type="button">
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
              <CardDescription>Add auction items to your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
                  <Input
                    id="itemName"
                    placeholder="Weekend Getaway Package"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="itemDescription">Description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateItemDescription}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea
                    id="itemDescription"
                    placeholder="Describe the item..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemDonor">Donor</Label>
                  <Input
                    id="itemDonor"
                    placeholder="Local Business Name"
                    value={itemDonor}
                    onChange={(e) => setItemDonor(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="itemStartingBid">Starting Bid *</Label>
                    <Input
                      id="itemStartingBid"
                      type="number"
                      placeholder="100"
                      value={itemStartingBid}
                      onChange={(e) => setItemStartingBid(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemBuyNow">Buy Now Price</Label>
                    <Input
                      id="itemBuyNow"
                      type="number"
                      placeholder="500"
                      value={itemBuyNow}
                      onChange={(e) => setItemBuyNow(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemImage">Image</Label>
                  <Input
                    id="itemImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setItemImageFile(e.target.files?.[0] || null)}
                  />
                </div>

                <Button onClick={handleAddItem} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Item
                </Button>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Added Items ({items.length})</h3>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">Starting bid: ${item.min_bid}</p>
                        </div>
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(4)} type="button">
                Back
              </Button>
              <Button onClick={handleComplete} type="button">
                <PartyPopper className="mr-2 h-4 w-4" />
                Complete Setup
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
