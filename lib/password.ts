import "server-only"
import bcrypt from "bcryptjs"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const result = await bcrypt.compare(password, hash)
    return result
  } catch (error) {
    console.error("[v0] Password verification error:", error)
    return false
  }
}

export { generateMemorablePassword } from "./word-lists"
