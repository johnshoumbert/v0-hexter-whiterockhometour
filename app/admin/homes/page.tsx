"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/data-table"
import { Plus, Loader2, Grid3x3, List, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEvent } from "@/contexts/event-context"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Simple form component for homes (can be extracted to separate component later)
function HomeForm({
  initialData,
  onSuccess,
  onDelete,
}: {
  initialData?: any
  onSuccess: () => void
  onDelete: () => void
}) {
  const { event } = useEvent()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(
    initialData || {
      name: "",
      address: "",
      sponsor: "",
      short_description: "",
      full_description: "",
      directions_url: "",
      display_order: 0,
    },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event?.id) return

    setIsSubmitting(true)
    try {
      const url = initialData
        ? `/api/events/${event.id}/homes/${initialData.id}`
        : `/api/events/${event.id}/homes`

      const response = await fetch(url, {
        method: initialData ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Home ${initialData ? "updated" : "created"} successfully`,
        })
        onSuccess()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save home",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save home",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!event?.id || !initialData) return
    if (!confirm("Are you sure you want to delete this home?")) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/homes/${initialData.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Home deleted successfully",
        })
        onDelete()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete home",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete home",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">{initialData ? "Edit Home" : "Add New Home"}</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Home Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter home name"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Address</label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter address"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Sponsor</label>
          <Input
            value={formData.sponsor}
            onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
            placeholder="Enter sponsor name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Short Description</label>
          <Input
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            placeholder="Brief description"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Full Description</label>
          <textarea
            value={formData.full_description}
            onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
            placeholder="Detailed description"
            className="w-full px-3 py-2 border rounded-md text-sm"
            rows={4}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Directions URL</label>
          <Input
            value={formData.directions_url}
            onChange={(e) => setFormData({ ...formData, directions_url: e.target.value })}
            placeholder="Enter directions URL"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Display Order</label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
            placeholder="0"
          />
        </div>
      </form>
      <div className="border-t p-4 flex gap-2">
        {initialData && (
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            Delete
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isSubmitting} className="ml-auto">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {initialData ? "Update" : "Create"} Home
        </Button>
      </div>
    </div>
  )
}

export default function AdminHomesPage() {
  const { event } = useEvent()
  const { toast } = useToast()
  const [homes, setHomes] = useState([])
  const [filteredHomes, setFilteredHomes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingHome, setEditingHome] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleFormSuccess = () => {
    setIsSheetOpen(false)
    fetchHomes()
  }

  const handleFormDelete = () => {
    setIsSheetOpen(false)
    fetchHomes()
  }

  useEffect(() => {
    if (event?.id) {
      fetchHomes()
    } else {
      setIsLoading(false)
    }
  }, [event?.id, currentPage, pageSize])

  useEffect(() => {
    let filtered = homes

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = homes.filter(
        (home: any) =>
          home.name.toLowerCase().includes(query) ||
          home.sponsor?.toLowerCase().includes(query) ||
          home.address?.toLowerCase().includes(query),
      )
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }

        const aStr = String(aValue || "").toLowerCase()
        const bStr = String(bValue || "").toLowerCase()

        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr)
        } else {
          return bStr.localeCompare(aStr)
        }
      })
    }

    setFilteredHomes(filtered)
  }, [searchQuery, homes, sortColumn, sortDirection])

  const fetchHomes = async () => {
    if (!event?.id) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/events/${event.id}/homes`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setTotalCount(data.length)
        setTotalPages(Math.ceil(data.length / pageSize))
        setHomes(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch homes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to fetch homes:", error)
      toast({
        title: "Error",
        description: "Failed to fetch homes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (home: any) => {
    setEditingHome(home)
    setIsSheetOpen(true)
  }

  const handleRowClick = (row: any) => {
    handleEdit(row)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const getFirstImage = (imageUrl: string | null) => {
    if (!imageUrl) return "/placeholder.svg?height=200&width=200"
    try {
      const parsed = JSON.parse(imageUrl)
      return Array.isArray(parsed) ? parsed[0] : imageUrl
    } catch {
      return imageUrl
    }
  }

  const columns = [
    { key: "name", label: "Home Name", sortable: true },
    { key: "address", label: "Address", sortable: true },
    { key: "sponsor", label: "Sponsor", sortable: true },
    { key: "short_description", label: "Description", sortable: false },
    { key: "display_order", label: "Order", sortable: true },
  ]

  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const showingTo = Math.min(currentPage * pageSize, totalCount)

  if (isLoading && homes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading homes...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-lg font-semibold">No event found for this domain</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 p-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Homes {totalCount > 0 && <span className="text-muted-foreground">({totalCount})</span>}
            </h1>
            <p className="text-muted-foreground">Manage tour homes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchHomes()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setEditingHome(null)
                setIsSheetOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Home
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search homes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {showingFrom}-{showingTo} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number.parseInt(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={filteredHomes}
            onEdit={handleEdit}
            onRowClick={handleRowClick}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHomes.map((home: any) => (
              <Card key={home.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div
                  className="relative aspect-square bg-muted"
                  onClick={() => handleEdit(home)}
                >
                  {home.item_images ? (
                    <Image
                      src={getFirstImage(home.item_images) || "/placeholder.svg?height=200&width=200"}
                      alt={home.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=200&width=200"
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No image</p>
                    </div>
                  )}
                </div>
                <CardContent className="p-4" onClick={() => handleEdit(home)}>
                  <h3 className="font-semibold truncate mb-1">{home.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2 truncate">{home.address}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">{home.sponsor}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{home.short_description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredHomes.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No homes found matching your search.</p>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
          <HomeForm initialData={editingHome} onSuccess={handleFormSuccess} onDelete={handleFormDelete} />
        </SheetContent>
      </Sheet>
    </>
  )
}
