"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  ChevronDown,
  AlertCircle,
  LinkIcon,
  Edit,
  Unlink,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEvent } from "@/contexts/event-context"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"

type PaymentProvider = {
  id: string
  name: string
  icon: string
  description: string
  category: "PAYMENTS" | "MATCHING"
  isNative: boolean
  enabled: boolean
  configured: boolean
  requiresOAuth?: boolean
  requiresKeys?: boolean
  comingSoon?: boolean
}

const paymentProviders: PaymentProvider[] = [
  {
    id: "apple-pay",
    name: "Apple Pay",
    icon: "🍎",
    description: "Delight iPhone users with a quick, touch-free way to give using Apple Pay.",
    category: "PAYMENTS",
    isNative: true,
    enabled: false,
    configured: false,
    comingSoon: true,
  },
  {
    id: "cash-app",
    name: "Cash App",
    icon: "💵",
    description:
      "Cash App is now built into every campaign, offering supporters a fast, familiar way to give from their phones.",
    category: "PAYMENTS",
    isNative: true,
    enabled: false,
    configured: false,
    comingSoon: true,
  },
  {
    id: "google-pay",
    name: "Google Pay",
    icon: "🔷",
    description: "Empower Android users to give securely in just a few taps with Google Pay.",
    category: "PAYMENTS",
    isNative: true,
    enabled: false,
    configured: false,
    comingSoon: true,
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: "🅿️",
    description: "Let donors give with PayPal, a familiar and trusted platform used by millions, on any campaign.",
    category: "PAYMENTS",
    isNative: true,
    enabled: false,
    configured: false,
    requiresOAuth: true,
    comingSoon: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "💳",
    description: "Accept all major credit cards and receive daily bank deposits via Stripe.",
    category: "PAYMENTS",
    isNative: true,
    enabled: true,
    configured: false,
    requiresOAuth: true,
    requiresKeys: true,
  },
  {
    id: "venmo",
    name: "Venmo",
    icon: "📱",
    description: "Tap into the popularity of Venmo and make donating as easy as sending money to a friend.",
    category: "PAYMENTS",
    isNative: true,
    enabled: false,
    configured: false,
    comingSoon: true,
  },
  {
    id: "double-donation",
    name: "Double the Donation",
    icon: "🔄",
    description:
      "Automate your matching gift fundraising with 360MatchPro, the industry-leading solution by Double the Donation.",
    category: "MATCHING",
    isNative: true,
    enabled: false,
    configured: false,
    comingSoon: true,
  },
]

export default function PaymentMethodsPage() {
  const { event } = useEvent()
  const searchParams = useSearchParams()

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [providers, setProviders] = useState<PaymentProvider[]>(paymentProviders)

  const [stripeConnected, setStripeConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [isRestrictedKeyInfoOpen, setIsRestrictedKeyInfoOpen] = useState(false)
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false)
  const [stripeKeys, setStripeKeys] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    accountId: "",
  })
  const { toast } = useToast()
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [hasExistingKeys, setHasExistingKeys] = useState({
    secretKey: false,
    webhookSecret: false,
  })
  const [isOAuthConnected, setIsOAuthConnected] = useState(false)
  const [useClientSide, setUseClientSide] = useState(false)

  useEffect(() => {
    // Check for OAuth callback success/error
    const connected = searchParams.get("connected")
    const accountId = searchParams.get("account_id")
    const error = searchParams.get("error")

    if (connected === "success" && accountId) {
      toast({
        title: "Stripe Connected",
        description: `Successfully connected Stripe account: ${accountId}`,
      })
      // Remove query params
      window.history.replaceState({}, "", "/admin/payment-methods")
    } else if (error) {
      toast({
        title: "Connection Failed",
        description: error,
        variant: "destructive",
      })
      // Remove query params
      window.history.replaceState({}, "", "/admin/payment-methods")
    }
  }, [searchParams, toast])

  useEffect(() => {
    checkStripeConnection()
  }, [event])

  const checkStripeConnection = async () => {
    try {
      const url = event?.id ? `/api/admin/stripe-config?event_id=${event.id}` : "/api/admin/stripe-config"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()

        setStripeKeys({
          publishableKey: data.publishableKey || "",
          secretKey: data.secretKey || "",
          webhookSecret: data.webhookSecret || "",
          accountId: data.accountId || "",
        })

        setHasExistingKeys({
          secretKey: data.hasSecretKey,
          webhookSecret: data.hasWebhookSecret,
        })

        setIsOAuthConnected(data.connectedViaOAuth || false)
        const isConfigured = data.hasSecretKey && data.publishableKey
        setStripeConnected(isConfigured)

        setProviders((prev) => prev.map((p) => (p.id === "stripe" ? { ...p, configured: isConfigured } : p)))

        setUseClientSide(data.useClientSide || false)
      }
    } catch (error) {
      console.error("[v0] Error checking Stripe connection:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectWithStripe = async () => {
    if (!event?.id) {
      toast({
        title: "Error",
        description: "No event selected",
        variant: "destructive",
      })
      return
    }

    setIsConnectingOAuth(true)

    try {
      const response = await fetch("/api/stripe/connect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsSetup) {
          toast({
            title: "Setup Required",
            description: data.error,
            variant: "destructive",
          })
        } else {
          throw new Error(data.error || "Failed to get connect URL")
        }
        setIsConnectingOAuth(false)
        return
      }

      if (data.url) {
        // Redirect to Stripe OAuth
        window.location.href = data.url
      } else {
        throw new Error("Failed to get connect URL")
      }
    } catch (error) {
      console.error("[v0] Error connecting to Stripe:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Stripe. Please try again.",
        variant: "destructive",
      })
      setIsConnectingOAuth(false)
    }
  }

  const handleSaveStripeConfig = async () => {
    if (!stripeKeys.publishableKey) {
      toast({
        title: "Publishable Key Required",
        description: "Please provide a publishable key (starts with pk_)",
        variant: "destructive",
      })
      return
    }

    const isMaskedKey = stripeKeys.secretKey.includes("•")
    const isProvidingNewSecretKey = stripeKeys.secretKey && stripeKeys.secretKey.length > 0 && !isMaskedKey

    if (!hasExistingKeys.secretKey && !isProvidingNewSecretKey) {
      toast({
        title: "Secret Key Required",
        description: "Please provide a secret, restricted, or merchant key (starts with sk_, rk_, or mk_)",
        variant: "destructive",
      })
      return
    }

    if (isProvidingNewSecretKey) {
      if (
        !stripeKeys.secretKey.startsWith("sk_") &&
        !stripeKeys.secretKey.startsWith("rk_") &&
        !stripeKeys.secretKey.startsWith("mk_")
      ) {
        toast({
          title: "Invalid Key Format",
          description: "Secret key must start with sk_, rk_, or mk_",
          variant: "destructive",
        })
        return
      }

      if (stripeKeys.secretKey.startsWith("mk_") && !stripeKeys.accountId) {
        toast({
          title: "Account ID Required",
          description: "Merchant keys (mk_) require a Stripe Account ID (acct_)",
          variant: "destructive",
        })
        return
      }
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/stripe-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishableKey: stripeKeys.publishableKey,
          secretKey: isProvidingNewSecretKey ? stripeKeys.secretKey : undefined,
          webhookSecret:
            stripeKeys.webhookSecret && !stripeKeys.webhookSecret.includes("•") ? stripeKeys.webhookSecret : undefined,
          accountId: stripeKeys.accountId || undefined,
          useClientSide,
          eventId: event?.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Saved",
          description: "Stripe configuration saved successfully",
        })
        await checkStripeConnection()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to save configuration",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Stripe configuration",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnectStripe = async () => {
    if (!confirm("Are you sure you want to disconnect Stripe? This will remove all saved credentials.")) {
      return
    }

    setIsSaving(true)
    try {
      const url = event?.id ? `/api/admin/stripe-config?event_id=${event.id}` : "/api/admin/stripe-config"

      const response = await fetch(url, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Stripe Disconnected",
          description: "Your Stripe configuration has been removed successfully.",
        })
        setStripeConnected(false)
        setIsOAuthConnected(false)
        setStripeKeys({
          publishableKey: "",
          secretKey: "",
          webhookSecret: "",
          accountId: "",
        })
        setIsEditing(false)
        setProviders((prev) => prev.map((p) => (p.id === "stripe" ? { ...p, configured: false } : p)))
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to disconnect Stripe")
      }
    } catch (error) {
      console.error("[v0] Disconnect error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Stripe",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!selectedProvider) {
    return (
      <div className="container mx-auto space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-muted-foreground">
            Connect payment providers to accept donations and payments
            {event && <span className="ml-1">for {event.event_name}</span>}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Payment Processors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers
                .filter((p) => p.category === "PAYMENTS")
                .map((provider) => (
                  <Card
                    key={provider.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      provider.comingSoon ? "opacity-60" : ""
                    }`}
                    onClick={() => !provider.comingSoon && setSelectedProvider(provider.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{provider.icon}</span>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {provider.category}
                        </Badge>
                        {provider.isNative && (
                          <Badge variant="default" className="text-xs gap-1">
                            NATIVE 🔌
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{provider.description}</p>
                      {provider.configured ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : provider.comingSoon ? (
                        <Badge variant="outline">Coming Soon</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Matching & Fundraising Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers
                .filter((p) => p.category === "MATCHING")
                .map((provider) => (
                  <Card
                    key={provider.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      provider.comingSoon ? "opacity-60" : ""
                    }`}
                    onClick={() => !provider.comingSoon && setSelectedProvider(provider.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{provider.icon}</span>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {provider.category}
                        </Badge>
                        {provider.isNative && (
                          <Badge variant="default" className="text-xs gap-1">
                            NATIVE 🔌
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{provider.description}</p>
                      {provider.configured ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : provider.comingSoon ? (
                        <Badge variant="outline">Coming Soon</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 p-8">
      <div>
        <Button variant="ghost" onClick={() => setSelectedProvider(null)} className="mb-4">
          ← Back to Payment Methods
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Configure Stripe</h1>
        <p className="text-muted-foreground">
          Set up Stripe to accept credit cards, debit cards, and more
          {event && <span className="ml-1">for {event.event_name}</span>}
        </p>
      </div>

      <div className="space-y-6">
        {/* Stripe Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stripe</CardTitle>
                <CardDescription>Accept payments via credit card, debit card, and more</CardDescription>
              </div>
              {stripeConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {isOAuthConnected ? "Connected via OAuth" : "Connected"}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!stripeConnected && !isEditing && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <strong>Recommended:</strong> Connect your Stripe account with one click using Stripe Connect OAuth.
                    This automatically configures all necessary credentials securely.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleConnectWithStripe}
                    disabled={isConnectingOAuth || !event?.id}
                    className="flex-1"
                    size="lg"
                  >
                    {isConnectingOAuth ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Connect with Stripe
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">or</span>
                  </div>

                  <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1" size="lg">
                    Enter API Keys Manually
                  </Button>
                </div>
              </div>
            )}

            {!isEditing && stripeConnected && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Your Stripe integration is active and ready to process payments. All auction payments will be
                  processed through Stripe.
                </p>
              </div>
            )}

            {(isEditing || (!stripeConnected && isEditing)) && (
              <>
                <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                  <p className="text-sm font-medium">
                    {stripeConnected
                      ? "Update your Stripe API keys below:"
                      : "Enter your Stripe API keys to connect your account:"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Find your API keys in your{" "}
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Stripe Dashboard
                    </a>
                  </p>
                </div>

                <Collapsible
                  open={isRestrictedKeyInfoOpen}
                  onOpenChange={setIsRestrictedKeyInfoOpen}
                  className="rounded-lg border bg-blue-50 dark:bg-blue-950/20"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 text-left">
                        Use a Restricted API Key for Better Security
                      </h4>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform ${isRestrictedKeyInfoOpen ? "rotate-180" : ""}`}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-4 pb-4 space-y-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Stripe lets you create <strong>Restricted API Keys</strong> that can be limited to:
                    </p>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                      <li>Read-only access</li>
                      <li>Only specific API objects (Payments, Customers, Checkout Sessions, etc.)</li>
                      <li>Specific environments (live/test)</li>
                    </ul>

                    <div className="border-t border-blue-200 dark:border-blue-800 pt-3 space-y-2">
                      <h5 className="font-semibold text-xs text-blue-900 dark:text-blue-100">
                        How to Create a Restricted Key:
                      </h5>
                      <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5 ml-4 list-decimal">
                        <li>
                          Go to{" "}
                          <a
                            href="https://dashboard.stripe.com/apikeys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Stripe Dashboard → Developers → API Keys
                          </a>
                        </li>
                        <li>
                          Click <strong>+ Create Restricted Key</strong>
                        </li>
                        <li>
                          Choose permissions (recommended for this app):
                          <div className="mt-2 rounded border border-blue-200 dark:border-blue-800 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-blue-100 dark:bg-blue-900">
                                <tr>
                                  <th className="text-left py-1.5 px-2 font-medium text-blue-900 dark:text-blue-100">
                                    Permission
                                  </th>
                                  <th className="text-left py-1.5 px-2 font-medium text-blue-900 dark:text-blue-100">
                                    Recommended
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-blue-900/30">
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Payment Intents</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Write</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Setup Intents</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Write</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Customers</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Read only</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Payment Methods</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Write</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Charges</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Read only</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Disputes / Chargebacks</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Read only</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Checkout Sessions</strong>
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    <strong>Write</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">Refunds</td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    No access{" "}
                                    <span className="text-blue-600 dark:text-blue-400 italic">
                                      (webhooks use separate signing secrets)
                                    </span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">Payouts</td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    No access
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    Webhooks
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    No access{" "}
                                    <span className="text-blue-600 dark:text-blue-400 italic">
                                      (webhooks use separate signing secrets)
                                    </span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    Balance Transactions
                                  </td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    Optional (Read only){" "}
                                    <span className="text-blue-600 dark:text-blue-400 italic">
                                      (only enable if schools want payout summaries)
                                    </span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">Events</td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    Optional (Read only)
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">Files</td>
                                  <td className="py-1.5 px-2 border-t border-blue-100 dark:border-blue-900">
                                    Optional (Read only){" "}
                                    <span className="text-blue-600 dark:text-blue-400 italic">
                                      (needed only if you want to view dispute evidence)
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </li>
                      </ol>
                      <p className="text-xs text-blue-700 dark:text-blue-300 italic mt-2">
                        💡 This functions like a Secret Key but only with the allowed permissions, providing better
                        security.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-2">
                  <Label htmlFor="publishable_key">Publishable Key *</Label>
                  <Input
                    id="publishable_key"
                    value={stripeKeys.publishableKey}
                    onChange={(e) => setStripeKeys({ ...stripeKeys, publishableKey: e.target.value })}
                    placeholder="pk_test_..."
                    disabled={!isEditing && stripeConnected}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">Your publishable API key (starts with pk_)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret_key">Secret Key or Restricted Key *</Label>
                  <div className="relative">
                    <Input
                      id="secret_key"
                      type={showSecretKey ? "text" : "password"}
                      value={stripeKeys.secretKey}
                      onChange={(e) => setStripeKeys({ ...stripeKeys, secretKey: e.target.value })}
                      placeholder={isEditing ? "sk_test_... or rk_test_... or mk_..." : "sk_••••••••••••••••"}
                      disabled={!isEditing && stripeConnected}
                      className="font-mono text-xs pr-10"
                    />
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                      >
                        {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your secret API key (starts with sk_), restricted key (starts with rk_), or merchant key (starts
                    with mk_) - stored securely and encrypted
                  </p>
                </div>

                {stripeKeys.secretKey && stripeKeys.secretKey.startsWith("mk_") && (
                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-900 dark:text-amber-100">
                      <strong>Merchant Key Detected:</strong> You must provide a Stripe Account ID (acct_) below for
                      merchant keys to work properly.
                    </AlertDescription>
                  </Alert>
                )}

                {stripeKeys.secretKey && stripeKeys.secretKey.startsWith("mk_") && (
                  <div className="space-y-2">
                    <Label htmlFor="account_id">Stripe Account ID *</Label>
                    <Input
                      id="account_id"
                      value={stripeKeys.accountId}
                      onChange={(e) => setStripeKeys({ ...stripeKeys, accountId: e.target.value })}
                      placeholder="acct_..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for merchant keys - the connected Stripe account ID (starts with acct_)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="webhook_secret"
                      type={showWebhookSecret ? "text" : "password"}
                      value={stripeKeys.webhookSecret}
                      onChange={(e) => setStripeKeys({ ...stripeKeys, webhookSecret: e.target.value })}
                      placeholder={
                        isEditing
                          ? hasExistingKeys.webhookSecret
                            ? "whsec_••••••••••••••••"
                            : "whsec_..."
                          : "whsec_••••••••••••••••"
                      }
                      disabled={!isEditing && stripeConnected}
                      className="font-mono text-xs pr-10"
                    />
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      >
                        {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Webhook signing secret for secure webhook verification (starts with whsec_)
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <label htmlFor="use-client-side" className="text-sm font-medium">
                        Payment Processing Method
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Choose how payments are processed for donations and shop items
                      </p>
                    </div>
                    <Switch id="use-client-side" checked={useClientSide} onCheckedChange={setUseClientSide} />
                  </div>

                  {useClientSide ? (
                    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Client-Side Mode:</strong> Payments will be processed using Stripe Elements on the
                        client with your publishable key. This provides more customization options but requires
                        additional setup.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Server-Side Mode (Recommended):</strong> Payments are securely processed through Stripe
                        Checkout Sessions on the server. This is the most secure and easiest method to implement.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-2">
                  {isEditing && (
                    <>
                      <Button onClick={handleSaveStripeConfig} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Configuration
                          </>
                        )}
                      </Button>
                      {stripeConnected && (
                        <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Configure how payments are processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value="USD" disabled />
              <p className="text-xs text-muted-foreground">Currency is currently set to USD</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_deadline">Payment Deadline (hours after auction ends)</Label>
              <Input id="payment_deadline" type="number" defaultValue="48" />
              <p className="text-xs text-muted-foreground">Winners must complete payment within this timeframe</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isEditing && stripeConnected && (
        <div className="flex gap-2">
          <Button onClick={() => setIsEditing(true)} variant="default" size="lg">
            <Edit className="h-4 w-4 mr-2" />
            Edit Configuration
          </Button>
          <Button
            variant="outline"
            onClick={handleDisconnectStripe}
            disabled={isSaving}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Dashboard
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://docs.stripe.com" target="_blank" rel="noopener noreferrer">
              View Documentation
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
