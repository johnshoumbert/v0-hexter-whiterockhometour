"use client"

import { useEffect } from "react"

import { useState } from "react"

import { SheetFooter, SheetDescription } from "@/components/ui/sheet"
import { DataTable } from "@/components/data-table"
import {
  Loader2,
  Mail,
  Shield,
  UserPlus,
  ShieldCheck,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  Pencil,
  RefreshCw,
  UserX,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminUsersPage() {
  const { event } = useEvent()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false)
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [userToPromote, setUserToPromote] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [showInviteLinkDialog, setShowInviteLinkDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedUser, setEditedUser] = useState<any>(null)
  const [staffRoles, setStaffRoles] = useState<any[]>([])
  const [userAssignments, setUserAssignments] = useState<any>(null)
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState<string>("")
  const [selectedSlotsForAssignment, setSelectedSlotsForAssignment] = useState<string[]>([])
  const [isEditingStaffAssignment, setIsEditingStaffAssignment] = useState(false)
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false) // Declare isPermanentlyDeleting
  const [userToDeletePermanently, setUserToDeletePermanently] = useState<any>(null) // Declare userToDeletePermanently
  const [isSaving, setIsSaving] = useState(false) // Declare setIsSaving
  const itemsPerPage = 20

  useEffect(() => {
    if (event?.id) {
      fetchUsers()
    }
  }, [event?.id])

  const fetchUsers = async () => {
    if (!event?.id) return

    try {
      console.log("[v0] Fetching users...")
      const response = await fetch(`/api/events/${event.id}/users`)
      if (response.ok) {
        const data = await response.json()
        const usersData = data.users || []
        console.log("[v0] Users fetched:", usersData.length)

        const usersWithRoles = usersData.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          bidsPlaced: user.bid_count || 0,
          totalSpent: user.total_spent || 0,
          joinedDate: new Date(user.created_at).toLocaleDateString(),
          eventRole: user.event_role || "participant",
          isEventAdmin: user.event_role === "admin",
          profile_image: user.profile_image || "",
        }))

        setUsers(usersWithRoles)
      } else {
        console.error("[v0] Failed to fetch users:", response.status)
        setUsers([])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch users:", error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStaffRolesAndAssignments = async (userId: string) => {
    if (!event?.id) return

    try {
      const [rolesRes, assignmentRes] = await Promise.all([
        fetch(`/api/events/${event.id}/staff/roles`),
        fetch(`/api/events/${event.id}/staff/assignments/${userId}`),
      ])

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setStaffRoles(rolesData.roles || [])
      }

      if (assignmentRes.ok) {
        const assignmentData = await assignmentRes.json()
        setUserAssignments(assignmentData.assignment || null)
        if (assignmentData.assignment) {
          setSelectedRoleForAssignment(assignmentData.assignment.staff_role_id)
          setSelectedSlotsForAssignment(assignmentData.assignment.selected_slot_ids || [])
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch staff data:", error)
    }
  }

  const handleSendInvite = async () => {
    if (!event?.id || !inviteEmail) return

    setIsSendingInvite(true)
    try {
      const response = await fetch(`/api/events/${event.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          isAdmin: inviteAsAdmin,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        if (data.inviteLink) {
          setInviteLink(data.inviteLink)
          setShowInviteLinkDialog(true)
          toast({
            title: "Invite created!",
            description: `An invitation link has been generated for ${inviteEmail}`,
          })
        } else {
          toast({
            title: "User added!",
            description: `${inviteEmail} has been added to the event${inviteAsAdmin ? " as an admin" : ""}`,
          })
          fetchUsers()
        }

        setShowInviteDialog(false)
        setInviteEmail("")
        setInviteName("")
        setInviteAsAdmin(false)
      } else {
        const error = await response.json()
        toast({
          title: "Failed to send invite",
          description: error.error || "Please try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to send invite:", error)
      toast({
        title: "Failed to send invite",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handlePromoteToAdmin = async () => {
    if (!event?.id || !userToPromote) return

    setIsPromoting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userToPromote.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "User promoted!",
          description: `${userToPromote.name} is now an event admin`,
        })
        setUserToPromote(null)
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "Failed to promote user",
          description: error.error || "Please try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to promote user:", error)
      toast({
        title: "Failed to promote user",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsPromoting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!event?.id || !userToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({ title: "User removed from event successfully" })
        setUserToDelete(null)
        setSelectedUser(null)
        await fetchUsers()
      } else {
        toast({
          title: "Failed to remove user from event",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to remove user from event:", error)
      toast({ title: "Failed to remove user from event", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePermanentDeleteUser = async () => {
    if (!userToDeletePermanently) return

    setIsPermanentlyDeleting(true)
    try {
      const response = await fetch(`/api/users/${userToDeletePermanently.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({ title: "User permanently deleted" })
        setUserToDeletePermanently(null)
        setSelectedUser(null)
        await fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "Failed to delete user",
          description: error.error || "An error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to permanently delete user:", error)
      toast({ title: "Failed to delete user", variant: "destructive" })
    } finally {
      setIsPermanentlyDeleting(false)
    }
  }

  const handleRowClick = (user: any) => {
    console.log("[v0] Opening user panel:", user.id)
    setSelectedUser(user)
    setEditedUser({ ...user })
    setIsEditMode(false)
    fetchStaffRolesAndAssignments(user.id)
  }

  const handleSaveUserUpdates = async () => {
    if (!event?.id || !editedUser) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/events/${event.id}/users/${editedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedUser.name,
          email: editedUser.email,
          phone: editedUser.phone,
          eventRole: editedUser.eventRole,
        }),
      })

      if (response.ok) {
        toast({
          title: "User updated successfully",
        })
        setSelectedUser(editedUser)
        setIsEditMode(false)
        fetchUsers()
      } else {
        toast({
          title: "Failed to update user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to update user:", error)
      toast({
        title: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveStaffAssignment = async () => {
    if (!event?.id || !selectedUser || !selectedRoleForAssignment) return

    setIsEditingStaffAssignment(true)
    try {
      const response = await fetch(`/api/events/${event.id}/staff/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          staffRoleId: selectedRoleForAssignment,
          selectedSlotIds: selectedSlotsForAssignment,
        }),
      })

      if (response.ok) {
        toast({
          title: "Staff assignment updated",
        })
        fetchStaffRolesAndAssignments(selectedUser.id)
      } else {
        toast({
          title: "Failed to save assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to save staff assignment:", error)
      toast({
        title: "Failed to save assignment",
        variant: "destructive",
      })
    } finally {
      setIsEditingStaffAssignment(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && user.isEventAdmin) ||
      (roleFilter === "participant" && !user.isEventAdmin) ||
      (roleFilter === "staff" && user.eventRole === "staff")
    return matchesSearch && matchesRole
  })

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 p-4 sm:p-8 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage event users and permissions</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite User</span>
            <span className="sm:hidden">Invite</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="participant">Participant</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:block">
          <DataTable columns={columns} data={paginatedUsers} onRowClick={handleRowClick} />
        </div>

        {/* Mobile card layout */}
        <div className="md:hidden space-y-3">
          {paginatedUsers.map((user: any) => (
            <Card
              key={user.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleRowClick(user)}
            >
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-base">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    {user.eventRole === "admin" && (
                      <Badge variant="default" className="ml-2">
                        Admin
                      </Badge>
                    )}
                  </div>
                  {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                  <div className="flex gap-4 pt-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Bids</p>
                      <p className="font-semibold">{user.bidsPlaced}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joined</p>
                      <p className="font-semibold text-xs">{user.joinedDate}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left w-full sm:w-auto">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedUser && editedUser && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>User Profile</SheetTitle>
                  {!isEditMode ? (
                    <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm" className="gap-2">
                      <Pencil className="h-4 w-4" />
                      Edit User
                    </Button>
                  ) : (
                    <Button onClick={handleSaveUserUpdates} size="sm" className="gap-2">
                      <Check className="h-4 w-4" />
                      Save Updates
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={editedUser.profile_image || undefined} alt={editedUser.name} />
                    <AvatarFallback>{editedUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        {isEditMode ? (
                          <Input
                            value={editedUser.name}
                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-lg font-semibold">{editedUser.name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        {isEditMode ? (
                          <Input
                            type="email"
                            value={editedUser.email}
                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-lg">{editedUser.email}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        {isEditMode ? (
                          <Input
                            value={editedUser.phone || ""}
                            onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                            className="mt-1"
                          />
                        ) : editedUser.phone ? (
                          <p className="text-lg">{editedUser.phone}</p>
                        ) : (
                          <p className="text-lg text-muted-foreground">Not provided</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="text-lg">{editedUser.joinedDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Role</p>
                        {isEditMode ? (
                          <Select
                            value={editedUser.eventRole}
                            onValueChange={(value) => setEditedUser({ ...editedUser, eventRole: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="participant">Participant</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Event Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : editedUser.isEventAdmin ? (
                          <Badge variant="default" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Event Admin
                          </Badge>
                        ) : editedUser.eventRole === "staff" ? (
                          <Badge variant="secondary">Staff</Badge>
                        ) : (
                          <Badge variant="secondary">Participant</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bids</p>
                        <p className="text-2xl font-bold">{editedUser.bidsPlaced}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="text-2xl font-bold">${Number(editedUser.totalSpent).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {editedUser.eventRole === "participant" && (
                  <Button onClick={() => setUserToPromote(editedUser)} variant="outline" className="w-full gap-2">
                    <Shield className="h-4 w-4" />
                    Promote to Event Admin
                  </Button>
                )}

                {editedUser.eventRole === "staff" && staffRoles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Staff Assignment</CardTitle>
                      <CardDescription>Assign roles and time slots</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Staff Role</Label>
                        <Select value={selectedRoleForAssignment} onValueChange={setSelectedRoleForAssignment}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffRoles.map((role: any) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.role_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedRoleForAssignment && (
                        <div className="space-y-2">
                          <Label>Available Time Slots</Label>
                          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                            {staffRoles.find((r: any) => r.id === selectedRoleForAssignment)?.slots?.length > 0 ? (
                              staffRoles
                                .find((r: any) => r.id === selectedRoleForAssignment)
                                ?.slots.map((slot: any) => (
                                  <div key={slot.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`slot-${slot.id}`}
                                      checked={selectedSlotsForAssignment.includes(slot.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedSlotsForAssignment([...selectedSlotsForAssignment, slot.id])
                                        } else {
                                          setSelectedSlotsForAssignment(
                                            selectedSlotsForAssignment.filter((id: string) => id !== slot.id),
                                          )
                                        }
                                      }}
                                    />
                                    <label htmlFor={`slot-${slot.id}`} className="text-sm cursor-pointer flex-1">
                                      {new Date(slot.date_time).toLocaleString()}
                                    </label>
                                  </div>
                                ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No time slots available for this role</p>
                            )}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleSaveStaffAssignment}
                        disabled={!selectedRoleForAssignment || isEditingStaffAssignment}
                        className="w-full gap-2"
                      >
                        {isEditingStaffAssignment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Save Assignment
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={() => setUserToDelete(editedUser)}
                  variant="outline"
                  className="w-full gap-2 text-orange-600 hover:text-orange-600"
                >
                  <UserX className="h-4 w-4" />
                  Remove from Event
                </Button>

                {currentUser?.is_admin && (
                  <Button
                    onClick={() => setUserToDeletePermanently(editedUser)}
                    variant="outline"
                    className="w-full gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Permanently Delete User
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invite User</SheetTitle>
            <SheetDescription>Send an invitation to join this event</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name (Optional)</Label>
              <Input
                id="invite-name"
                placeholder="John Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="invite-as-admin"
                checked={inviteAsAdmin}
                onCheckedChange={(checked) => setInviteAsAdmin(checked as boolean)}
              />
              <Label htmlFor="invite-as-admin" className="text-sm font-normal cursor-pointer">
                Invite as Event Admin
              </Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={!inviteEmail || isSendingInvite} className="gap-2">
              {isSendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Invite
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={showInviteLinkDialog} onOpenChange={setShowInviteLinkDialog}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invitation Link Created</SheetTitle>
            <SheetDescription>
              Share this link with the user to complete their registration. The link expires in 7 days.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={() => setShowInviteLinkDialog(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!userToPromote} onOpenChange={(open) => !open && setUserToPromote(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {userToPromote && (
            <>
              <SheetHeader>
                <SheetTitle>Promote to Event Admin?</SheetTitle>
                <SheetDescription>
                  Are you sure you want to promote <strong>{userToPromote.name}</strong> to event admin? They will have
                  access to manage this event's auctions, bids, and settings.
                </SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <Button variant="outline" onClick={() => setUserToPromote(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePromoteToAdmin}
                  disabled={isPromoting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPromoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Promote
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {userToDelete && (
            <>
              <SheetHeader>
                <SheetTitle>Remove User from Event?</SheetTitle>
                <SheetDescription>
                  Are you sure you want to remove <strong>{userToDelete.name}</strong> from this event? They will still
                  exist in the system and can be re-added later.
                </SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <Button variant="outline" onClick={() => setUserToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Remove from Event
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!userToDeletePermanently} onOpenChange={(open) => !open && setUserToDeletePermanently(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {userToDeletePermanently && (
            <>
              <SheetHeader>
                <SheetTitle>Permanently Delete User?</SheetTitle>
                <SheetDescription>
                  Are you sure you want to permanently delete <strong>{userToDeletePermanently.name}</strong>? This will
                  remove them from ALL events and delete all their data. This action CANNOT be undone.
                </SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <Button variant="outline" onClick={() => setUserToDeletePermanently(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePermanentDeleteUser}
                  disabled={isPermanentlyDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isPermanentlyDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Permanently Delete
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  {
    key: "eventRole",
    label: "Role",
    render: (value: string) =>
      value === "admin" ? (
        <Badge variant="default" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </Badge>
      ) : value === "staff" ? (
        <Badge variant="secondary">Staff</Badge>
      ) : (
        <Badge variant="secondary">Participant</Badge>
      ),
  },
  { key: "bidsPlaced", label: "Bids" },
  { key: "joinedDate", label: "Joined" },
]
