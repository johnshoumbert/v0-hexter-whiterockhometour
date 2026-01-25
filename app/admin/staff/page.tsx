"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEvent } from "@/contexts/event-context"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminStaffPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [staffRoles, setStaffRoles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false)
  const [showAddSlotDialog, setShowAddSlotDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [roleToDelete, setRoleToDelete] = useState<any>(null)
  const [roleName, setRoleName] = useState("")
  const [roleDescription, setRoleDescription] = useState("")
  const [maxPositions, setMaxPositions] = useState("1")
  const [slotDateTime, setSlotDateTime] = useState("")
  const [slotEndTime, setSlotEndTime] = useState("")
  const [slotCapacity, setSlotCapacity] = useState("1")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (event?.id) {
      fetchStaffRoles()
    }
  }, [event?.id])

  const fetchStaffRoles = async () => {
    if (!event?.id) return

    try {
      const response = await fetch(`/api/events/${event.id}/staff/roles`)
      if (response.ok) {
        const data = await response.json()
        setStaffRoles(data.roles || [])
      }
    } catch (error) {
      console.error("Failed to fetch staff roles:", error)
      toast({ title: "Failed to load staff roles", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRole = async () => {
    if (!event?.id || !roleName) {
      console.log("[v0] Missing required fields - event.id:", event?.id, "roleName:", roleName)
      return
    }

    const isUpdate = !!selectedRole?.id
    console.log(`[v0] ${isUpdate ? "Updating" : "Creating"} role with:`, {
      eventId: event.id,
      roleId: selectedRole?.id,
      roleName,
      roleDescription,
      maxPositions,
    })

    setIsSaving(true)
    try {
      const payload = {
        ...(isUpdate ? { roleId: selectedRole.id } : {}),
        roleName,
        description: roleDescription,
        maxPositions: Number.parseInt(maxPositions),
      }
      console.log("[v0] Sending payload:", payload)

      const response = await fetch(`/api/events/${event.id}/staff/roles`, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Parsed response data:", data)
        toast({ title: `Staff role ${isUpdate ? "updated" : "created"} successfully` })
        setShowAddRoleDialog(false)
        setRoleName("")
        setRoleDescription("")
        setMaxPositions("1")
        setSelectedRole(null) // Clear selected role after save
        await fetchStaffRoles()
      } else {
        console.error("[v0] API returned error status:", response.status)
        toast({
          title: `Failed to ${isUpdate ? "update" : "create"} staff role (status: ${response.status})`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`[v0] Failed to ${isUpdate ? "update" : "create"} staff role:`, error)
      toast({ title: `Failed to ${isUpdate ? "update" : "create"} staff role`, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSlot = async () => {
    if (!event?.id || !selectedRole || !slotDateTime || !slotEndTime) {
      toast({ title: "Please fill in all fields", variant: "destructive" })
      return
    }

    const startDate = new Date(slotDateTime)
    const endDate = new Date(slotEndTime)

    if (endDate <= startDate) {
      toast({ title: "End time must be after start time", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      console.log("[v0] Adding time slot:", {
        staffRoleId: selectedRole.id,
        startTime: slotDateTime,
        endTime: slotEndTime,
        capacity: slotCapacity,
      })

      const response = await fetch(`/api/events/${event.id}/staff/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffRoleId: selectedRole.id,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          capacity: Number.parseInt(slotCapacity),
        }),
      })

      console.log("[v0] Add slot response status:", response.status)

      if (response.ok) {
        toast({ title: "Time slot added successfully" })
        setShowAddSlotDialog(false)
        setSlotDateTime("")
        setSlotEndTime("")
        setSlotCapacity("1")
        fetchStaffRoles()
      } else {
        const error = await response.json()
        console.error("[v0] Add slot failed:", error)
        toast({ title: "Failed to add time slot", description: error.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("[v0] Failed to add time slot:", error)
      toast({ title: "Failed to add time slot", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!event?.id || !roleToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/staff/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: roleToDelete.id }),
      })

      if (response.ok) {
        toast({ title: "Staff role deleted successfully" })
        setRoleToDelete(null)
        await fetchStaffRoles()
      } else {
        toast({
          title: "Failed to delete staff role",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to delete staff role:", error)
      toast({ title: "Failed to delete staff role", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff roles and availability</p>
        </div>
        <Button onClick={() => setShowAddRoleDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Staff Role</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="space-y-6">
        {staffRoles.map((role: any) => (
          <Card key={role.id}>
            <CardHeader>
              <div>
                <CardTitle>{role.role_name}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Max Positions</p>
                  <p className="text-lg font-semibold">{role.max_positions}</p>
                </div>
              </div>
              {role.slots && role.slots.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {role.slots.map((slot: any) => (
                      <TableRow key={slot.id}>
                        <TableCell>{new Date(slot.date_time).toLocaleString()}</TableCell>
                        <TableCell>{slot.capacity}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No time slots added yet</p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRole(role)
                  setRoleName(role.role_name)
                  setRoleDescription(role.description)
                  setMaxPositions(role.max_positions.toString())
                  setShowAddRoleDialog(true)
                }}
                className="gap-2 w-full sm:w-auto"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Role</span>
                <span className="sm:hidden">Edit</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedRole(role)
                  setShowAddSlotDialog(true)
                }}
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Time Slot</span>
                <span className="sm:hidden">Slot</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleToDelete(role)}
                className="gap-2 w-full sm:w-auto text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog
        open={showAddRoleDialog}
        onOpenChange={(open) => {
          setShowAddRoleDialog(open)
          if (!open) {
            setSelectedRole(null)
            setRoleName("")
            setRoleDescription("")
            setMaxPositions("1")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRole ? "Edit" : "Add"} Staff Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                placeholder="e.g., Door Greeter, Bid Tracker"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the role and responsibilities"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Positions</Label>
              <Input type="number" min="1" value={maxPositions} onChange={(e) => setMaxPositions(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={isSaving || !roleName}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedRole ? "Update" : "Create"} Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSlotDialog && !!selectedRole} onOpenChange={setShowAddSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Slot for {selectedRole?.role_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Input type="datetime-local" value={slotDateTime} onChange={(e) => setSlotDateTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Input type="datetime-local" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" min="1" value={slotCapacity} onChange={(e) => setSlotCapacity(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSlotDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSlot} disabled={isSaving || !slotDateTime || !slotEndTime}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{roleToDelete?.role_name}</strong>? This action cannot be undone.
              All associated time slots will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
