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
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get user's organization
    const orgResult = await sql`
      SELECT om.organization_id, om.role
      FROM organization_members om
      WHERE om.user_id = ${session.user.id}
      LIMIT 1
    `

    if (orgResult.length === 0) {
      return NextResponse.json({ error: "You don't belong to an organization" }, { status: 400 })
    }

    const { organization_id, role } = orgResult[0]

    // Check if user has permission (owner or admin)
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 })
    }

    // Find user by email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found with that email" }, { status: 404 })
    }

    const invitedUserId = userResult[0].id

    // Check if user is already a member
    const existingMember = await sql`
      SELECT id FROM organization_members
      WHERE organization_id = ${organization_id} AND user_id = ${invitedUserId}
      LIMIT 1
    `

    if (existingMember.length > 0) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 })
    }

    // Add member
    await sql`
      INSERT INTO organization_members (organization_id, user_id, role, invited_by)
      VALUES (${organization_id}, ${invitedUserId}, 'member', ${session.user.id})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error inviting member:", error)
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 })
  }
}
