import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getServerSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, email, website, logo_url } = body

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    const existingMembership = await sql`
      SELECT om.id
      FROM organization_members om
      WHERE om.user_id = ${session.user.id}
      LIMIT 1
    `

    if (existingMembership.length > 0) {
      return NextResponse.json({ error: "You already belong to an organization" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO organizations (name, description, email, website, logo_url, created_by)
      VALUES (${name}, ${description || ""}, ${email || ""}, ${website || ""}, ${logo_url || ""}, ${session.user.id})
      RETURNING *
    `

    const organization = result[0]

    await sql`
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (${organization.id}, ${session.user.id}, 'owner')
    `

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("[v0] Error creating organization:", error)
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizations = await sql`
      SELECT * FROM organizations
      WHERE created_by = ${session.user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("[v0] Error fetching organizations:", error)
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 })
  }
}
