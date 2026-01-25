"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Send, MessageCircle, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEvent } from "@/contexts/event-context"

interface Message {
  id: number
  content: string
  created_at: string
  event_id: string
  sender: {
    id: number
    name: string
    is_admin: boolean
  }
}

interface EventMessages {
  eventId: string
  eventName: string
  messages: Message[]
}

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event } = useEvent()
  const router = useRouter()
  const { toast } = useToast()
  const [eventMessages, setEventMessages] = useState<EventMessages[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // Separate messages by event
  const currentEventMessages = eventMessages.find((em) => em.eventId === event?.id)
  const otherEventMessages = eventMessages.filter((em) => em.eventId !== event?.id)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && event?.id) {
      fetchMessages()
      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [user, event?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setEventMessages([
          {
            eventId: event.id,
            eventName: event.event_name,
            messages: data.messages,
          },
        ])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !event?.id) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/events/${event.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
        }),
      })

      if (response.ok) {
        setNewMessage("")
        fetchMessages()
      } else {
        throw new Error("Failed to send message")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (authLoading || isLoading || !event) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const renderChatMessages = (messages: Message[]) => (
    <Card className="h-[600px] flex flex-col">
      <CardContent className="flex-1 flex flex-col overflow-hidden pt-6">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender.id === user.id ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-lg p-3 overflow-hidden ${
                    message.sender.id === user.id
                      ? "bg-primary text-primary-foreground"
                      : message.sender.is_admin
                        ? "bg-blue-500 text-white"
                        : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold break-words">{message.sender.name}</span>
                    {message.sender.is_admin && (
                      <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded flex-shrink-0">Admin</span>
                    )}
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">{new Date(message.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Chat with administrators</p>
      </div>

      {/* Current Event Messages */}
      {currentEventMessages && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <CardTitle>Messages - {currentEventMessages.eventName}</CardTitle>
            </div>
            <CardDescription>Chat with administrators for this event</CardDescription>
          </CardHeader>
          <CardContent>{renderChatMessages(currentEventMessages.messages)}</CardContent>
        </Card>
      )}

      {/* Other Events Messages (Accordion for future) */}
      {otherEventMessages.length > 0 &&
        otherEventMessages.map((em) => (
          <Collapsible key={em.eventId}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      <div>
                        <CardTitle>Messages - {em.eventName}</CardTitle>
                        <CardDescription>{em.messages.length} messages</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>{renderChatMessages(em.messages)}</CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

      {/* No Messages */}
      {!currentEventMessages && otherEventMessages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No messages available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
