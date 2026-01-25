import "server-only"

// Generate a unique license code (format: XXXX-XXXX-XXXX)
export function generateLicenseCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed ambiguous characters
  const segments = 3
  const segmentLength = 4

  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  }).join("-")

  return code
}
