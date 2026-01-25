/**
 * Normalize a domain for consistent comparison
 * Strips protocol, www, trailing slashes, whitespace, and lowercases
 */
export function normalizeDomain(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "") // Remove protocol
    .replace(/^www\./, "") // Remove www
    .replace(/\/+$/, "") // Remove trailing slashes
    .split(":")[0] // Remove port
}
