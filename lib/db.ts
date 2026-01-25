import "server-only"
import { neon } from "@neondatabase/serverless"

let _sql: ReturnType<typeof neon> | null = null

function getSQL() {
  if (!_sql) {
    const databaseUrl =
      process.env.NEON_DATABASE_URL ||
      process.env.NEON_POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL

    if (!databaseUrl) {
      throw new Error(
        "No Neon database URL environment variable is set. Tried: NEON_DATABASE_URL, NEON_POSTGRES_URL, DATABASE_URL, POSTGRES_URL",
      )
    }
    _sql = neon(databaseUrl)
  }
  return _sql
}

export const getDb = getSQL

function isRateLimitError(error: any): boolean {
  const errorStr = String(error?.message || error || "")
  return errorStr.includes("Too Many Requests") || errorStr.includes("429") || errorStr.includes("rate limit")
}

const sqlHandler = {
  apply(target: any, thisArg: any, args: any[]) {
    return executeWithRetry(() => getSQL()(...args))
  },
  get(target: any, prop: string) {
    const sqlInstance = getSQL()
    const value = (sqlInstance as any)[prop]
    return typeof value === "function" ? value.bind(sqlInstance) : value
  },
}

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    // If it's a rate limit error and we have retries left
    if (isRateLimitError(error) && retries > 0) {
      console.warn(`[v0] Rate limit detected, retrying in ${delay}ms... (${retries} retries left)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return executeWithRetry(fn, retries - 1, delay * 2)
    }

    // If it's a rate limit error but no retries left, throw a user-friendly error
    if (isRateLimitError(error)) {
      const rateLimitError = new Error(
        "Database temporarily unavailable due to rate limiting. Please try again in a moment.",
      )
      ;(rateLimitError as any).isRateLimit = true
      throw rateLimitError
    }

    throw error
  }
}

// Export a proxy that lazily initializes the connection and handles rate limits
export const sql = new Proxy(() => {}, sqlHandler) as ReturnType<typeof neon>

// Helper function to execute queries with error handling
export async function query<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await sql(queryText, params)
    return result as T[]
  } catch (error) {
    console.error("[v0] Database query error:", error)
    throw error
  }
}
