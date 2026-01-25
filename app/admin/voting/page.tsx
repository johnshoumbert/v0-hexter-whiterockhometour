"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Vote, ImageIcon, Loader2, Pencil, Upload, X, Eye, EyeOff, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export default function AdminVotingPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [polls, setPolls] = useState<any[]>([])
  const [selectedPoll, setSelectedPoll] = useState<any>(null)
  const [pollItems, setPollItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const [showPollDialog, setShowPollDialog] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showEditPollSheet, setShowEditPollSheet] = useState(false)
  const [editingPoll, setEditingPoll] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [pollForm, setPollForm] = useState({ title: "", description: "", is_active: false, blind_voting: false })
  const [itemForm, setItemForm] = useState({ title: "", description: "", image_url: "" })
  const [editForm, setEditForm] = useState({ title: "", description: "", image_url: "" })
  const [editPollForm, setEditPollForm] = useState({
    title: "",
    description: "",
    is_active: false,
    blind_voting: false,
  })
  const [isUploadingCreate, setIsUploadingCreate] = useState(false)
  const [isUploadingEdit, setIsUploadingEdit] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "detail">("list")

  useEffect(() => {
    if (event?.id) {
      fetchPolls()
    }
  }, [event?.id])

  const fetchPolls = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls`)
      const data = await response.json()
      setPolls(data.polls || [])
    } catch (error) {
      console.error("[v0] Error fetching polls:", error)
      toast({ title: "Error", description: "Failed to load polls", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPollDetails = async (pollId: string) => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls/${pollId}`)
      const data = await response.json()
      setSelectedPoll(data.poll)
      setPollItems(data.items || [])
      setViewMode("detail")
    } catch (error) {
      console.error("[v0] Error fetching poll details:", error)
      toast({ title: "Error", description: "Failed to load poll details", variant: "destructive" })
    }
  }

  const createPoll = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pollForm),
      })

      if (!response.ok) throw new Error("Failed to create poll")

      toast({ title: "Success", description: "Poll created successfully" })
      setShowPollDialog(false)
      setPollForm({ title: "", description: "", is_active: false, blind_voting: false })
      fetchPolls()
    } catch (error) {
      toast({ title: "Error", description: "Failed to create poll", variant: "destructive" })
    }
  }

  const togglePollActive = async (pollId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) throw new Error("Failed to update poll")

      toast({ title: "Success", description: `Poll ${!currentStatus ? "activated" : "deactivated"}` })
      fetchPolls()
      if (selectedPoll?.id === pollId) {
        setSelectedPoll({ ...selectedPoll, is_active: !currentStatus })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update poll", variant: "destructive" })
    }
  }

  const toggleBlindVoting = async (pollId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blind_voting: !currentStatus }),
      })

      if (!response.ok) throw new Error("Failed to update poll")

      toast({
        title: "Success",
        description: `Vote counts are now ${!currentStatus ? "hidden" : "visible"} to users`,
      })
      fetchPolls()
      if (selectedPoll?.id === pollId) {
        setSelectedPoll({ ...selectedPoll, blind_voting: !currentStatus })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update poll visibility", variant: "destructive" })
    }
  }

  const createItem = async () => {
    if (!selectedPoll) return

    try {
      const response = await fetch(`/api/events/${event.id}/voting/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...itemForm, poll_id: selectedPoll.id }),
      })

      if (!response.ok) throw new Error("Failed to create item")

      toast({ title: "Success", description: "Item created successfully" })
      setShowItemDialog(false)
      setItemForm({ title: "", description: "", image_url: "" })
      fetchPollDetails(selectedPoll.id)
    } catch (error) {
      toast({ title: "Error", description: "Failed to create item", variant: "destructive" })
    }
  }

  const openEditSheet = (item: any) => {
    setEditingItem(item)
    setEditForm({
      title: item.title || "",
      description: item.description || "",
      image_url: item.image_url || "",
    })
    setShowEditSheet(true)
  }

  const updateItem = async () => {
    if (!editingItem) return

    try {
      const response = await fetch(`/api/events/${event.id}/voting/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) throw new Error("Failed to update item")

      toast({ title: "Success", description: "Item updated successfully" })
      setShowEditSheet(false)
      setEditingItem(null)
      fetchPollDetails(selectedPoll.id)
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" })
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/events/${event.id}/voting/items/${itemId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete item")

      toast({ title: "Success", description: "Item deleted successfully" })
      fetchPollDetails(selectedPoll.id)
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" })
    }
  }

  const openEditPollSheet = (poll: any) => {
    setEditingPoll(poll)
    setEditPollForm({
      title: poll.title || "",
      description: poll.description || "",
      is_active: poll.is_active || false,
      blind_voting: poll.blind_voting || false,
    })
    setShowEditPollSheet(true)
  }

  const updatePoll = async () => {
    if (!editingPoll) return

    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls/${editingPoll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPollForm),
      })

      if (!response.ok) throw new Error("Failed to update poll")

      toast({ title: "Success", description: "Poll updated successfully" })
      setShowEditPollSheet(false)
      setEditingPoll(null)
      fetchPolls()
      if (selectedPoll?.id === editingPoll.id) {
        setSelectedPoll({ ...selectedPoll, ...editPollForm })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update poll", variant: "destructive" })
    }
  }

  const handleImageUploadCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingCreate(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to upload image")

      const data = await response.json()
      setItemForm({ ...itemForm, image_url: data.url })
      toast({ title: "Success", description: "Image uploaded successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" })
    } finally {
      setIsUploadingCreate(false)
    }
  }

  const handleImageUploadEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingEdit(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to upload image")

      const data = await response.json()
      setEditForm({ ...editForm, image_url: data.url })
      toast({ title: "Success", description: "Image uploaded successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" })
    } finally {
      setIsUploadingEdit(false)
    }
  }

  const sendVoteReminders = async () => {
    if (!selectedPoll) return

    if (!confirm(`Send vote reminder emails to all users who haven't voted yet?`)) {
      return
    }

    setIsSendingReminders(true)
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls/${selectedPoll.id}/send-reminders`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reminders")
      }

      if (data.count === 0) {
        toast({
          title: "No Reminders Needed",
          description: "All users have already voted!",
        })
      } else {
        toast({
          title: "Success",
          description: `Vote reminder emails queued for ${data.count} users`,
        })
      }
    } catch (error: any) {
      console.error("[v0] Error sending reminders:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send vote reminders",
        variant: "destructive",
      })
    } finally {
      setIsSendingReminders(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (viewMode === "detail" && selectedPoll) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setViewMode("list")}>
              ← Back to Polls
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedPoll.title}</h1>
              <p className="text-muted-foreground">{selectedPoll.description || "Manage items and view results"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {pollItems.length > 0 && (
              <Button variant="outline" onClick={sendVoteReminders} disabled={isSendingReminders}>
                {isSendingReminders ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Vote Reminders
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setShowItemDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {pollItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No items added yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pollItems.map((item) => (
              <Card key={item.id}>
                <CardHeader className="p-0">
                  {item.image_url && (
                    <div className="w-full h-64 bg-muted rounded-t-lg overflow-hidden">
                      <img
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="p-6 pb-0">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    {item.description && <CardDescription className="mt-2">{item.description}</CardDescription>}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Votes:</span>
                        <span className="text-2xl font-bold text-primary">{item.vote_count || 0}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, ((item.vote_count || 0) / Math.max(...pollItems.map((i) => i.vote_count || 0), 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => openEditSheet(item)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs and Sheets */}
        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Voting Item</DialogTitle>
              <DialogDescription>Add a new option for attendees to vote on</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item-title">Title *</Label>
                <Input
                  id="item-title"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="Hawk Logo Design A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadCreate}
                  className="hidden"
                  id="create-image-upload"
                  disabled={isUploadingCreate}
                />
                {!itemForm.image_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => document.getElementById("create-image-upload")?.click()}
                    disabled={isUploadingCreate}
                  >
                    {isUploadingCreate ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="relative group">
                    <img
                      src={itemForm.image_url || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-muted rounded-md cursor-pointer"
                      onClick={() => document.getElementById("create-image-upload")?.click()}
                    />
                    <div
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center cursor-pointer"
                      onClick={() => document.getElementById("create-image-upload")?.click()}
                    >
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setItemForm({ ...itemForm, image_url: "" })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createItem} disabled={!itemForm.title}>
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Voting Item</SheetTitle>
              <SheetDescription>Update the name, description, and image for this voting option</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Hawk Logo Design A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Optional description"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadEdit}
                  className="hidden"
                  id="edit-image-upload"
                  disabled={isUploadingEdit}
                />
                {!editForm.image_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => document.getElementById("edit-image-upload")?.click()}
                    disabled={isUploadingEdit}
                  >
                    {isUploadingEdit ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="relative group">
                    <img
                      src={editForm.image_url || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-muted rounded-md cursor-pointer"
                      onClick={() => document.getElementById("edit-image-upload")?.click()}
                    />
                    <div
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center cursor-pointer"
                      onClick={() => document.getElementById("edit-image-upload")?.click()}
                    >
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditForm({ ...editForm, image_url: "" })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setShowEditSheet(false)}>
                Cancel
              </Button>
              <Button onClick={updateItem} disabled={!editForm.title}>
                Save Changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voting Management</h1>
          <p className="text-muted-foreground">Create and manage voting polls for your event</p>
        </div>
        <Button onClick={() => setShowPollDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Poll
        </Button>
      </div>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Vote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No polls created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <Card key={poll.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{poll.title}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">{poll.description}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Active:</span>
                      <Switch
                        checked={poll.is_active}
                        onCheckedChange={() => togglePollActive(poll.id, poll.is_active)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Hide votes:</span>
                      <Switch
                        checked={poll.blind_voting}
                        onCheckedChange={() => toggleBlindVoting(poll.id, poll.blind_voting)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={poll.is_active ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {poll.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Voting Mode:</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {poll.blind_voting ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Blind
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Public
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Votes:</span>
                    <span className="font-medium">{poll.total_votes || 0}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        fetchPollDetails(poll.id)
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditPollSheet(poll)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
            <DialogDescription>Create a new voting poll for your attendees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={pollForm.title}
                onChange={(e) => setPollForm({ ...pollForm, title: e.target.value })}
                placeholder="Vote for your favorite..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={pollForm.description}
                onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })}
                placeholder="Help us decide..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={pollForm.is_active}
                onCheckedChange={(checked) => setPollForm({ ...pollForm, is_active: checked })}
              />
              <Label htmlFor="active">Activate immediately</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="blind"
                checked={pollForm.blind_voting}
                onCheckedChange={(checked) => setPollForm({ ...pollForm, blind_voting: checked })}
              />
              <Label htmlFor="blind" className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Blind voting (hide vote counts from voters)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createPoll} disabled={!pollForm.title}>
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showEditPollSheet} onOpenChange={setShowEditPollSheet}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Poll</SheetTitle>
            <SheetDescription>Update the poll name, description, and status</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="edit-poll-title">Title *</Label>
              <Input
                id="edit-poll-title"
                value={editPollForm.title}
                onChange={(e) => setEditPollForm({ ...editPollForm, title: e.target.value })}
                placeholder="Vote for your favorite..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-poll-description">Description</Label>
              <Textarea
                id="edit-poll-description"
                value={editPollForm.description}
                onChange={(e) => setEditPollForm({ ...editPollForm, description: e.target.value })}
                placeholder="Help us decide..."
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-poll-active"
                checked={editPollForm.is_active}
                onCheckedChange={(checked) => setEditPollForm({ ...editPollForm, is_active: checked })}
              />
              <Label htmlFor="edit-poll-active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-poll-blind"
                checked={editPollForm.blind_voting}
                onCheckedChange={(checked) => setEditPollForm({ ...editPollForm, blind_voting: checked })}
              />
              <Label htmlFor="edit-poll-blind" className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Blind voting (hide vote counts from voters)
              </Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setShowEditPollSheet(false)}>
              Cancel
            </Button>
            <Button onClick={updatePoll} disabled={!editPollForm.title}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
