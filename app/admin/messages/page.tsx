"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEvent } from "@/contexts/event-context"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, MessageSquare, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  content: string
  created_at: string
  sender: {
    id: string
    name: string
    is_admin: boolean
  }
  receiver: {
    id: string
    name: string
  }
}

interface MessageThread {
  userId: string
  userName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export default function AdminMessagesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { event } = useEvent()
  const router = useRouter()
  const { toast } = useToast()
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoadingBids, setIsLoadingBids] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const [showNewConversation, setShowNewConversation] = useState(false)
  const [eventUsers, setEventUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user && !user.is_admin) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user?.is_admin && event?.id) {
      fetchAllMessages()
      const interval = setInterval(fetchAllMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [user, event?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (selectedUserId && messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }, [selectedUserId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchAllMessages = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        const messages = data.messages || []
        console.log("[v0] All messages fetched:", messages.length)

        const threadMap = new Map<string, MessageThread>()

        messages.forEach((msg: Message) => {
          const otherUserId = msg.sender.is_admin ? msg.receiver.id : msg.sender.id
          const otherUserName = msg.sender.is_admin ? msg.receiver.name : msg.sender.name

          if (!threadMap.has(otherUserId)) {
            threadMap.set(otherUserId, {
              userId: otherUserId,
              userName: otherUserName,
              lastMessage: msg.content,
              lastMessageTime: msg.created_at,
              unreadCount: 0,
            })
          } else {
            const existing = threadMap.get(otherUserId)!
            if (new Date(msg.created_at) > new Date(existing.lastMessageTime)) {
              existing.lastMessage = msg.content
              existing.lastMessageTime = msg.created_at
            }
          }
        })

        const threadList = Array.from(threadMap.values()).sort(
          (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
        )

        setThreads(threadList)

        if (selectedUserId) {
          fetchConversation(selectedUserId)
        }
      } else {
        console.error("[v0] Failed to fetch messages:", response.status, await response.text())
        setThreads([])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch messages:", error)
      setThreads([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConversation = async (userId: string) => {
    if (!event?.id) return

    setIsLoadingBids(true)
    try {
      console.log("[v0] Fetching conversation with user:", userId)
      const response = await fetch(`/api/events/${event.id}/messages?receiver_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        const messages = data.messages || []
        console.log("[v0] Conversation fetched:", messages.length)
        setMessages(messages)
      } else {
        console.error("[v0] Failed to fetch conversation:", response.status, await response.text())
        setMessages([])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch conversation:", error)
      setMessages([])
    } finally {
      setIsLoadingBids(false)
    }
  }

  const handleSelectThread = (userId: string) => {
    setSelectedUserId(userId)
    fetchConversation(userId)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUserId || !event?.id) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/events/${event.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
          receiver_id: selectedUserId,
        }),
      })

      if (response.ok) {
        setNewMessage("")
        fetchConversation(selectedUserId)
        fetchAllMessages()
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

  const fetchEventUsers = async () => {
    if (!event?.id) return

    setIsLoadingUsers(true)
    try {
      const response = await fetch(`/api/events/${event.id}/users`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Event users fetched:", data.users?.length)
        setEventUsers(data.users || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch event users:", error)
      setEventUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleStartConversation = (userId: string, userName: string) => {
    const existingThread = threads.find((t) => t.userId === userId)
    if (!existingThread) {
      const newThread: MessageThread = {
        userId,
        userName,
        lastMessage: "Start a conversation...",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      }
      setThreads([newThread, ...threads])
    }

    setSelectedUserId(userId)
    setShowNewConversation(false)
    setMessages([])

    setTimeout(() => {
      messageInputRef.current?.focus()
    }, 100)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.is_admin) {
    return null
  }

  const selectedThread = threads.find((t) => t.userId === selectedUserId)

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Manage conversations with users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-200px)]">
          <Card className="flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Conversations</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setShowNewConversation(true)
                  fetchEventUsers()
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm text-center">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {threads.map((thread) => (
                    <button
                      key={thread.userId}
                      onClick={() => handleSelectThread(thread.userId)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted transition-colors",
                        selectedUserId === thread.userId && "bg-muted",
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium">{thread.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(thread.lastMessageTime).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{thread.lastMessage}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            {selectedUserId ? (
              <>
                <div className="p-4 border-b">
                  <h2 className="font-semibold">{selectedThread?.userName}</h2>
                  <p className="text-sm text-muted-foreground">User conversation</p>
                </div>
                <CardContent className="flex-1 flex flex-col p-4">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender.is_admin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 overflow-hidden break-words ${
                              message.sender.is_admin ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{message.sender.name}</span>
                              {message.sender.is_admin && (
                                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">Admin</span>
                              )}
                            </div>
                            <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      ref={messageInputRef}
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
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                <p className="text-sm">Choose a conversation from the sidebar or start a new one</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>Select a user from the event to start messaging</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : eventUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found for this event</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventUsers.map((eventUser) => (
                  <button
                    key={eventUser.id}
                    onClick={() => handleStartConversation(eventUser.id, eventUser.name)}
                    className="w-full p-4 text-left hover:bg-muted rounded-lg transition-colors border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{eventUser.name}</p>
                        <p className="text-sm text-muted-foreground">{eventUser.email}</p>
                        {eventUser.phone && <p className="text-xs text-muted-foreground mt-1">{eventUser.phone}</p>}
                      </div>
                      {eventUser.bid_count > 0 && (
                        <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {eventUser.bid_count} bids
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
