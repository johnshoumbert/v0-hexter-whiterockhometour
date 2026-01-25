/**
 * Safely extracts error information from Stripe errors without circular references
 */
export function safeStripeError(err: any): {
  message: string
  type?: string
  code?: string
  requestId?: string
} {
  return {
    message: err?.message || err?.raw?.message || "Unknown error",
    type: err?.type,
    code: err?.code,
    requestId: err?.requestId,
  }
}

/**
 * Safely converts any error to a plain string message
 */
export function safeErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === "string") {
      return error
    }
    if (error && typeof error === "object" && "message" in error) {
      // Force string conversion without any object reference
      return `${error.message}`
    }
    return "Unknown error"
  } catch (e) {
    // If anything fails during extraction, return a safe fallback
    return "Error occurred"
  }
}

/**
 * Safely extracts data from Stripe checkout session without circular references
 */
export function safeExtractStripeSessionData(session: any): {
  url: string
  id: string
  paymentIntentId: string
} {
  return {
    url: session?.url ? String(session.url) : "",
    id: session?.id ? String(session.id) : "",
    paymentIntentId: session?.payment_intent ? String(session.payment_intent) : "",
  }
}
