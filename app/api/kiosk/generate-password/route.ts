import { NextResponse } from "next/server"
import { generateMemorablePassword } from "@/lib/word-lists"
import bcrypt from "bcryptjs"

export async function POST() {
  try {
    const password = generateMemorablePassword()
    const hashedPassword = await bcrypt.hash(password, 10)

    return NextResponse.json({
      password: hashedPassword,
      displayPassword: password,
    })
  } catch (error) {
    console.error("[v0] Error generating password:", error)
    return NextResponse.json({ error: "Failed to generate password" }, { status: 500 })
  }
}
