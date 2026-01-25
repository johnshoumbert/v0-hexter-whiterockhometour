"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Loader2, Mail, Ticket } from "lucide-react"
import { useEvent } from "@/contexts/event-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TicketType {
  id: string
  name: string
  description: string | null
  price: number
  quantity_available: number | null
  quantity_sold: number
  is_active: boolean
}

export default function KioskRegister() {
  const { event } = useEvent()
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" })
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTickets, setIsLoadingTickets] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState("")
  const [error, setError] = useState("")
  const [showExistingUserModal, setShowExistingUserModal] = useState(false)
  const [existingUserData, setExistingUserData] = useState<{ userId: string; name: string } | null>(null)
  const [activeTicketTab, setActiveTicketTab] = useState<string>("")
  const [formErrors, setFormErrors] = useState({ tickets: "" })

  useEffect(() => {
    const fetchTickets = async () => {
      if (!event?.id) return

      try {
        const response = await fetch(`/api/events/${event.id}/tickets`)
        const data = await response.json()

        if (response.ok) {
          const activeTickets = (data.tickets || []).filter((t: TicketType) => t.is_active)
          setTickets(activeTickets)
          if (activeTickets.length > 0) {
            setActiveTicketTab(activeTickets[0].id)
          }
        }
      } catch (err) {
        console.error("[v0] Error fetching tickets:", err)
      } finally {
        setIsLoadingTickets(false)
      }
    }

    fetchTickets()
  }, [event?.id])

  const totalTicketsSelected = Object.values(ticketQuantities).reduce((sum, qty) => sum + qty, 0)

  const totalCost = tickets.reduce((sum, ticket) => {
    const qty = ticketQuantities[ticket.id] || 0
    return sum + qty * Number(ticket.price)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (totalTicketsSelected === 0) {
      setFormErrors({ tickets: "Please select at least one ticket" })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/kiosk/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          eventId: event?.id,
          ticketQuantities,
        }),
      })

      if (response.status === 409) {
        const data = await response.json()
        setExistingUserData({ userId: data.userId, name: data.userName })
        setShowExistingUserModal(true)
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Registration failed" }))
        throw new Error(errorData.error || errorData.message || "Registration failed")
      }

      const data = await response.json()
      setTemporaryPassword(data.temporaryPassword)
      setIsSuccess(true)
    } catch (err: any) {
      console.error("[v0] Registration error:", err)
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueWithExistingUser = async () => {
    if (!existingUserData) return

    setShowExistingUserModal(false)
    setIsLoading(true)

    try {
      const response = await fetch("/api/kiosk/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          eventId: event?.id,
          ticketQuantities,
          continueWithExisting: true,
          existingUserId: existingUserData.userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Registration failed" }))
        throw new Error(errorData.error || errorData.message || "Registration failed")
      }

      const data = await response.json()
      setTemporaryPassword(data.temporaryPassword)
      setIsSuccess(true)
    } catch (err: any) {
      console.error("[v0] Registration error:", err)
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-0 md:p-4 md:bg-gradient-to-br md:from-blue-50 md:to-green-50 bg-background">
        <Card className="w-full h-full md:h-auto md:max-w-xl md:shadow-2xl rounded-none md:rounded-lg border-0 md:border overflow-y-auto">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">Thank you for registering!</CardTitle>
              <CardDescription className="text-base">Check your email to continue</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
              <Mail className="w-12 h-12 mx-auto text-blue-600" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">
                  We've sent a magic link to your email with a temporary password.
                </p>
                <p className="text-sm text-gray-600">
                  Click the link in the email to set your password and complete your registration.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-left">
              <p className="font-semibold text-amber-900 mb-1 text-sm">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-amber-800">
                <li>Check your email inbox for our welcome message</li>
                <li>Click the magic link in the email</li>
                <li>Use the temporary password from the email to set a new password</li>
                <li>You'll be automatically logged in!</li>
              </ol>
            </div>

            <p className="text-xs text-gray-500">
              The magic link expires in 24 hours. If you don't receive the email within a few minutes, please check your
              spam folder.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="h-screen flex flex-col md:p-6 pb-24 md:pb-6">
        <Card className="flex-1 flex flex-col overflow-hidden md:rounded-2xl md:shadow-2xl border-0 md:border">
          <div className="bg-gradient-to-r from-primary to-primary/80 px-4 md:px-6 py-4 md:py-5 flex-shrink-0">
            <h1 className="text-base font-bold text-center">{event?.name || "Event Registration"}</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
                <div className="flex-none md:w-[45%] lg:w-[40%] space-y-3">
                  <h3 className="text-sm font-semibold pb-2 border-b">Contact Information</h3>

                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder=" "
                      required
                      className="h-11 text-sm peer pt-4 pb-2"
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="name"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[10px]"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                  </div>

                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder=" "
                      required
                      className="h-11 text-sm peer pt-4 pb-2"
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="email"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[10px]"
                    >
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                  </div>

                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder=" "
                      required
                      className="h-11 text-sm peer pt-4 pb-2"
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="phone"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[10px]"
                    >
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                  </div>

                  <div className="space-y-3">
                    {error && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-1.5 rounded">
                        <p className="text-red-800 text-[9px] font-medium">{error}</p>
                      </div>
                    )}

                    {formErrors.tickets && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-xs">{formErrors.tickets}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[400px] md:min-h-0">
                  {isLoadingTickets ? (
                    <div className="flex justify-center items-center flex-1">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <Alert>
                      <AlertDescription className="text-xs">
                        No tickets are currently available for this event.
                      </AlertDescription>
                    </Alert>
                  ) : tickets.length === 1 ? (
                    <div className="space-y-3 flex flex-col h-full">
                      <h3 className="text-sm font-semibold pb-2 border-b shrink-0">Select Tickets</h3>
                      <div className="flex-1 flex flex-col items-center justify-center">
                        {tickets.map((ticket) => {
                          const remainingQty = ticket.quantity_available
                            ? ticket.quantity_available - ticket.quantity_sold
                            : null
                          const selectedQty = ticketQuantities[ticket.id] || 0

                          return (
                            <Card key={ticket.id} className="border-2 w-full max-w-xs">
                              <CardContent className="p-3 flex flex-col items-center text-center space-y-2">
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Ticket className="h-5 w-5 text-primary" />
                                </div>
                                <h4 className="text-sm font-bold leading-tight">{ticket.name}</h4>
                                {ticket.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                                )}
                                <p className="text-lg font-bold text-primary">
                                  {ticket.price === 0 ? "Free" : `$${Number(ticket.price).toFixed(2)}`}
                                </p>
                                {remainingQty !== null && (
                                  <p className="text-[10px] text-muted-foreground">{remainingQty} remaining</p>
                                )}
                                <div className="flex items-center gap-2.5 pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 text-base bg-transparent"
                                    onClick={() => {
                                      const newQty = Math.max(0, selectedQty - 1)
                                      setTicketQuantities({ ...ticketQuantities, [ticket.id]: newQty })
                                    }}
                                    disabled={selectedQty === 0 || isLoading}
                                  >
                                    -
                                  </Button>
                                  <span className="w-8 text-center text-lg font-bold">{selectedQty}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 text-base bg-transparent"
                                    onClick={() => {
                                      const newQty = selectedQty + 1
                                      setTicketQuantities({ ...ticketQuantities, [ticket.id]: newQty })
                                    }}
                                    disabled={(remainingQty !== null && selectedQty >= remainingQty) || isLoading}
                                  >
                                    +
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                        {totalTicketsSelected > 0 && (
                          <div className="bg-muted rounded-lg p-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold">Total:</span>
                              <span className="text-base font-bold text-primary">
                                {totalCost === 0 ? "Free" : `$${totalCost.toFixed(2)}`}
                              </span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {totalTicketsSelected} ticket{totalTicketsSelected !== 1 ? "s" : ""} selected
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Tabs
                      value={activeTicketTab}
                      onValueChange={setActiveTicketTab}
                      className="flex flex-col flex-1 min-h-0"
                      orientation="vertical"
                    >
                      <div className="flex items-center justify-between pb-2 border-b mb-3 shrink-0">
                        <h3 className="text-sm font-semibold">Select Tickets</h3>
                        {totalTicketsSelected > 0 && (
                          <span className="text-xs text-muted-foreground">{totalTicketsSelected} selected</span>
                        )}
                      </div>
                      <div className="flex gap-3 flex-1 min-h-0">
                        <TabsList className="flex flex-col h-auto space-y-1.5 bg-transparent p-0 w-32 shrink-0">
                          {tickets.map((ticket) => (
                            <TabsTrigger
                              key={ticket.id}
                              value={ticket.id}
                              className="w-full text-[10px] justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-auto py-1.5 px-1.5"
                            >
                              <span className="truncate">{ticket.name}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          {tickets.map((ticket) => {
                            const remainingQty = ticket.quantity_available
                              ? ticket.quantity_available - ticket.quantity_sold
                              : null
                            const selectedQty = ticketQuantities[ticket.id] || 0

                            return (
                              <TabsContent
                                key={ticket.id}
                                value={ticket.id}
                                className="mt-0 h-full flex items-center justify-center md:items-start md:justify-start"
                              >
                                <Card className="border-2 w-full max-w-xs">
                                  <CardContent className="p-3 flex flex-col items-center text-center space-y-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                      <Ticket className="h-5 w-5 text-primary" />
                                    </div>
                                    <h4 className="text-sm font-bold leading-tight">{ticket.name}</h4>
                                    {ticket.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                                    )}
                                    <p className="text-lg font-bold text-primary">
                                      {ticket.price === 0 ? "Free" : `$${Number(ticket.price).toFixed(2)}`}
                                    </p>
                                    {remainingQty !== null && (
                                      <p className="text-[10px] text-muted-foreground">{remainingQty} remaining</p>
                                    )}
                                    <div className="flex items-center gap-2.5 pt-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 w-9 text-base bg-transparent"
                                        onClick={() => {
                                          const newQty = Math.max(0, selectedQty - 1)
                                          setTicketQuantities({ ...ticketQuantities, [ticket.id]: newQty })
                                        }}
                                        disabled={selectedQty === 0 || isLoading}
                                      >
                                        -
                                      </Button>
                                      <span className="w-8 text-center text-lg font-bold">{selectedQty}</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 w-9 text-base bg-transparent"
                                        onClick={() => {
                                          const newQty = selectedQty + 1
                                          setTicketQuantities({ ...ticketQuantities, [ticket.id]: newQty })
                                        }}
                                        disabled={(remainingQty !== null && selectedQty >= remainingQty) || isLoading}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                            )
                          })}
                        </div>
                      </div>
                    </Tabs>
                  )}
                </div>
              </form>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
        <Button
          onClick={() => {
            const form = document.querySelector("form") as HTMLFormElement
            if (form) {
              form.requestSubmit()
            }
          }}
          className="w-full h-12 text-base font-semibold"
          disabled={isLoading || totalTicketsSelected === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            "Complete Registration"
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          You'll receive an email with a magic link to access your tickets
        </p>
      </div>
    </div>
  )
}
