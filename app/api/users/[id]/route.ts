import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log("[v0] GET /api/users/[id] - id:", id)

    const users = await sql`
      SELECT id, name, email, phone, is_admin, role, created_at, profile_image, bio
      FROM users
      WHERE id = ${id}
    `

    console.log("[v0] Users found:", users.length)

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User profile fetched:", users[0].name)
    return NextResponse.json({ user: users[0] })
  } catch (error) {
    console.error("[v0] Get user error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Users can only update their own profile unless they're admin
    if (session.id !== id && !session.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, profile_image, bio } = body

    console.log("[v0] Updating user:", { id, name, email, phone, hasProfileImage: !!profile_image, hasBio: !!bio })

    const result = await sql`
      UPDATE users
      SET 
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        profile_image = COALESCE(${profile_image}, profile_image),
        bio = COALESCE(${bio}, bio)
      WHERE id = ${id}
      RETURNING id, name, email, phone, is_admin, role, created_at, profile_image, bio
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User updated successfully:", result[0].id)

    return NextResponse.json({ user: result[0] })
  } catch (error) {
    console.error("[v0] Update user error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only global admins can permanently delete users
    if (!user.is_admin) {
      return NextResponse.json({ error: "Unauthorized - Global admin access required" }, { status: 403 })
    }

    // Prevent admins from deleting themselves
    if (id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    console.log("[v0] Permanent delete user request:", { userId: id, requestingUser: user.id })

    // Delete from all tables that reference the user
    await sql`DELETE FROM event_admins WHERE user_id = ${id}`
    await sql`DELETE FROM event_attendance WHERE user_id = ${id}`
    await sql`DELETE FROM event_users WHERE user_id = ${id}`
    await sql`DELETE FROM bids WHERE user_id = ${id}`
    await sql`DELETE FROM max_bids WHERE user_id = ${id}`
    await sql`DELETE FROM winners WHERE user_id = ${id}`
    await sql`DELETE FROM payments WHERE user_id = ${id}`
    await sql`DELETE FROM shop_orders WHERE user_id = ${id}`
    await sql`DELETE FROM ticket_purchases WHERE user_id = ${id}`
    await sql`DELETE FROM raffle_entries WHERE user_id = ${id}`
    await sql`DELETE FROM votes WHERE user_id = ${id}`
    await sql`DELETE FROM messages WHERE sender_id = ${id} OR receiver_id = ${id}`
    await sql`DELETE FROM chats WHERE user_id = ${id}`
    await sql`DELETE FROM notifications WHERE user_id = ${id}`
    await sql`DELETE FROM gallery_images WHERE user_id = ${id}`
    await sql`DELETE FROM gallery_comments WHERE user_id = ${id}`
    await sql`DELETE FROM gallery_likes WHERE user_id = ${id}`
    await sql`DELETE FROM auction_likes WHERE user_id = ${id}`
    await sql`DELETE FROM blog_comments WHERE user_id = ${id}`
    await sql`DELETE FROM kb_article_feedback WHERE user_id = ${id}`
    await sql`DELETE FROM user_staff_assignments WHERE user_id = ${id}`
    await sql`DELETE FROM organization_members WHERE user_id = ${id}`
    await sql`DELETE FROM invites WHERE created_by = ${id}`

    // Now delete the user
    const result = await sql`
      DELETE FROM users
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User permanently deleted:", { userId: id })

    return NextResponse.json({
      success: true,
      message: "User permanently deleted successfully",
    })
  } catch (error: any) {
    console.error("[v0] Permanent delete user error:", error)
    return NextResponse.json({ error: "Failed to delete user", details: error.message }, { status: 500 })
  }
}
