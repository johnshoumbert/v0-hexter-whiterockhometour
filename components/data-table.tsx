"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  onRowClick?: (row: any) => void
  onSort?: (columnKey: string) => void
  sortColumn?: string | null
  sortDirection?: "asc" | "desc"
}

export function DataTable({ columns, data, onEdit, onRowClick, onSort, sortColumn, sortDirection }: DataTableProps) {
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-2 text-muted-foreground" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-2" />
    }
    return <ArrowDown className="h-4 w-4 ml-2" />
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {onEdit && <TableHead className="w-[100px]">View</TableHead>}
            {columns.map((column) => (
              <TableHead key={column.key}>
                {column.sortable && onSort ? (
                  <button
                    onClick={() => onSort(column.key)}
                    className="flex items-center hover:text-foreground transition-colors font-medium"
                  >
                    {column.label}
                    {getSortIcon(column.key)}
                  </button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            {onEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onRowClick?.(row)}
            >
              {onEdit && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(`/auctions/${row.id}`, "_blank")
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {typeof row[column.key] === "number" && column.key.includes("Bid")
                    ? `$${row[column.key].toLocaleString()}`
                    : row[column.key]}
                </TableCell>
              ))}
              {onEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(row)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
