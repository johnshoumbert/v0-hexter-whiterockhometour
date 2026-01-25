import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let canUpload = user.is_admin

    if (!canUpload) {
      const sql = neon(process.env.NEON_DATABASE_URL!)
      const eventAdmins = await sql`
        SELECT 1 FROM event_users 
        WHERE user_id = ${user.id} AND role = 'admin'
        LIMIT 1
      `
      canUpload = eventAdmins.length > 0
    }

    if (!canUpload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File too large. Maximum size is 10MB",
        },
        { status: 413 },
      )
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)

    if (!isValidType) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload JPEG, PNG, GIF, or WebP images. For HEIC/HEIF files, please convert them to JPEG first.",
        },
        { status: 400 },
      )
    }

    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
