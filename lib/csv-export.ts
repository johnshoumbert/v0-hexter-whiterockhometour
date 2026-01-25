/**
 * Escapes a CSV field value to prevent injection and ensure proper formatting
 * - Wraps in quotes if contains comma, newline, or quote
 * - Escapes quotes by doubling them
 * - Replaces newlines with spaces to prevent row breaks
 */
export function escapeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return ""
  }

  let stringValue = String(value)

  // Replace actual newlines with space to prevent cell breaks
  stringValue = stringValue.replace(/[\r\n]+/g, " ")

  // Check if field needs to be quoted
  const needsQuotes = stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")

  if (needsQuotes) {
    // Escape quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""')
    // Wrap in quotes
    return `"${stringValue}"`
  }

  return stringValue
}

/**
 * Converts an array of objects to CSV format
 */
export function convertToCSV(data: any[], headers: { key: string; label: string }[]): string {
  // Create header row
  const headerRow = headers.map((h) => escapeCsvField(h.label)).join(",")

  // Create data rows
  const dataRows = data.map((item) => {
    return headers
      .map((h) => {
        const value = item[h.key]
        return escapeCsvField(value)
      })
      .join(",")
  })

  return [headerRow, ...dataRows].join("\n")
}

/**
 * Triggers a browser download of CSV data
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
