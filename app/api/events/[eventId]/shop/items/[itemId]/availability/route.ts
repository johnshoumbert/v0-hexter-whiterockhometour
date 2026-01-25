import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; itemId: string }> }) {
  try {
    const { eventId, itemId } = await params

    console.log("[v0] Fetching availability for item:", itemId)

    const itemResult = await sql`
      SELECT options, quantity_type, quantity_available, quantity_sold
      FROM shop_items
      WHERE id = ${itemId} AND event_id = ${eventId}
    `

    if (!itemResult || itemResult.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const item = itemResult[0]
    console.log("[v0] Item data:", {
      options: item.options,
      quantity_available: item.quantity_available,
      quantity_sold: item.quantity_sold,
    })

    if (!item.options || item.options.length === 0) {
      const available =
        item.quantity_type === "unlimited" ? 999 : (item.quantity_available || 0) - (item.quantity_sold || 0)

      return NextResponse.json({
        itemAvailable: Math.max(0, available),
        optionAvailability: {},
      })
    }

    const ordersResult = await sql`
      SELECT id, selected_options, quantity, status
      FROM shop_orders
      WHERE shop_item_id = ${itemId}
      AND status IN ('pending', 'completed')
    `
    console.log("[v0] ALL orders found:", ordersResult.length)
    console.log("[v0] All orders:", JSON.stringify(ordersResult, null, 2))

    const soldCounts: Record<string, Record<string, number>> = {}

    ordersResult.forEach((order) => {
      const selectedOptions = order.selected_options || {}
      console.log(
        "[v0] Processing order:",
        order.id,
        "with selected_options:",
        selectedOptions,
        "quantity:",
        order.quantity,
      )

      Object.entries(selectedOptions).forEach(([optionId, valueIds]) => {
        if (!soldCounts[optionId]) {
          soldCounts[optionId] = {}
        }

        const values = Array.isArray(valueIds) ? valueIds : [valueIds]
        values.forEach((valueId: string) => {
          soldCounts[optionId][valueId] = (soldCounts[optionId][valueId] || 0) + (order.quantity || 1)
          console.log(
            `[v0] Added ${order.quantity || 1} to option ${optionId}, value ${valueId}. Total now: ${soldCounts[optionId][valueId]}`,
          )
        })
      })
    })

    console.log("[v0] Final sold counts by option:", JSON.stringify(soldCounts, null, 2))

    const optionAvailability: Record<string, Record<string, number>> = {}

    item.options.forEach((option: any) => {
      optionAvailability[option.id] = {}

      option.values.forEach((value: any) => {
        const initialQuantity = value.quantity ?? null

        if (initialQuantity === null || initialQuantity === undefined) {
          // No limit on this option value
          optionAvailability[option.id][value.id] = 999
        } else {
          const sold = soldCounts[option.id]?.[value.id] || 0
          const available = Math.max(0, initialQuantity - sold)
          console.log(
            `[v0] Option ${option.name} value ${value.label || value.value}: initial=${initialQuantity}, sold=${sold}, available=${available}`,
          )
          optionAvailability[option.id][value.id] = available
        }
      })
    })

    console.log("[v0] Final availability:", JSON.stringify(optionAvailability, null, 2))

    return NextResponse.json({
      optionAvailability,
      itemAvailable:
        item.quantity_type === "unlimited"
          ? 999
          : Math.max(0, (item.quantity_available || 0) - (item.quantity_sold || 0)),
    })
  } catch (error) {
    console.error("[v0] Error fetching item availability:", error)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
