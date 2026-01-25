import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getServerSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get organization where user is a member
    const orgResult = await sql`
      SELECT o.*, om.role
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = ${session.user.id}
      LIMIT 1
    `

    if (orgResult.length === 0) {
      return NextResponse.json({ organization: null, members: [] })
    }

    const organization = orgResult[0]

    // Get all members of the organization
    const membersResult = await sql`
      SELECT 
        om.id,
        om.user_id,
        om.role,
        om.created_at,
        u.name,
        u.email
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ${organization.id}
      ORDER BY 
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          ELSE 3
        END,
        om.created_at ASC
    `

    return NextResponse.json({
      organization,
      members: membersResult,
    })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 })
  }
}
