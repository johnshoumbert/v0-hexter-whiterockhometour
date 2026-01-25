import { sql } from "./db"

export interface PaymentGatewayCustomer {
  id: string
  user_id: string
  event_id: string
  payment_provider: string
  customer_id: string
  customer_metadata?: Record<string, any>
  created_at: Date
  updated_at: Date
}

/**
 * Get or create a payment gateway customer record
 * This centralizes customer IDs across different payment providers
 */
export async function getOrCreatePaymentGatewayCustomer(
  userId: string,
  eventId: string,
  paymentProvider: string,
  customerIdFromProvider: string,
  metadata?: Record<string, any>,
): Promise<PaymentGatewayCustomer> {
  const result = await sql`
    INSERT INTO payment_gateway_customers (user_id, event_id, payment_provider, customer_id, customer_metadata)
    VALUES (${userId}, ${eventId}, ${paymentProvider}, ${customerIdFromProvider}, ${JSON.stringify(metadata || {})})
    ON CONFLICT (user_id, event_id, payment_provider)
    DO UPDATE SET 
      customer_id = ${customerIdFromProvider},
      customer_metadata = ${JSON.stringify(metadata || {})},
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `

  return result[0]
}

/**
 * Get payment gateway customer for a user and provider
 */
export async function getPaymentGatewayCustomer(
  userId: string,
  eventId: string,
  paymentProvider: string,
): Promise<PaymentGatewayCustomer | null> {
  const result = await sql`
    SELECT * FROM payment_gateway_customers
    WHERE user_id = ${userId}
      AND event_id = ${eventId}
      AND payment_provider = ${paymentProvider}
  `

  return result.length > 0 ? result[0] : null
}

/**
 * Get all payment gateway customers for a user across all events/providers
 */
export async function getUserPaymentGatewayCustomers(userId: string): Promise<PaymentGatewayCustomer[]> {
  const result = await sql`
    SELECT * FROM payment_gateway_customers
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

  return result
}

/**
 * Get all payment gateway customers for an event
 */
export async function getEventPaymentGatewayCustomers(eventId: string): Promise<PaymentGatewayCustomer[]> {
  const result = await sql`
    SELECT * FROM payment_gateway_customers
    WHERE event_id = ${eventId}
    ORDER BY created_at DESC
  `

  return result
}

/**
 * Delete a payment gateway customer record
 */
export async function deletePaymentGatewayCustomer(
  userId: string,
  eventId: string,
  paymentProvider: string,
): Promise<boolean> {
  const result = await sql`
    DELETE FROM payment_gateway_customers
    WHERE user_id = ${userId}
      AND event_id = ${eventId}
      AND payment_provider = ${paymentProvider}
  `

  return result.count > 0
}
