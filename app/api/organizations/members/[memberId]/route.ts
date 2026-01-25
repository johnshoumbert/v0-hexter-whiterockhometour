import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getServerSession } from "@/lib/session"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const session = await getServerSession()
    const { memberId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the member to be removed
    const memberResult = await sql`
      SELECT om.organization_id, om.role, om.user_id
      FROM organization_members om
      WHERE om.id = ${memberId}
      LIMIT 1
    `

    if (memberResult.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const member = memberResult[0]

    // Check if requester has permission
    const requesterResult = await sql`
      SELECT role FROM organization_members
      WHERE organization_id = ${member.organization_id} AND user_id = ${session.user.id}
      LIMIT 1
    `

    if (requesterResult.length === 0) {
      return NextResponse.json({ error: "You don't belong to this organization" }, { status: 403 })
    }

    const requesterRole = requesterResult[0].role

    // Only owners can remove members, or users can remove themselves
    if (requesterRole !== "owner" && member.user_id !== session.user.id) {
      return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 })
    }

    // Can't remove the owner
    if (member.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 400 })
    }

    // Remove member
    await sql`
      DELETE FROM organization_members WHERE id = ${memberId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}
