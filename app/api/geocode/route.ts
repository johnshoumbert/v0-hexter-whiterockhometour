import { NextRequest, NextResponse } from 'next/server'

const GEOCODING_RATE_LIMIT = 100 // requests per day per IP
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(ip: string): string {
  return `geocode:${ip}`
}

function checkRateLimit(ip: string): boolean {
  const key = getRateLimitKey(ip)
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= GEOCODING_RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const { homes } = await request.json()

    if (!homes || !Array.isArray(homes) || homes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid homes data' },
        { status: 400 }
      )
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      console.error('[v0] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Geocode each address
    const results = await Promise.all(
      homes.map(async (home: { id: string; address: string }) => {
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            home.address
          )}&key=${googleApiKey}`

          const geocodeResponse = await fetch(geocodeUrl)
          const geocodeData = await geocodeResponse.json()

          if (geocodeData.status === 'OK' && geocodeData.results?.[0]) {
            const location = geocodeData.results[0].geometry.location
            return {
              id: home.id,
              latitude: location.lat,
              longitude: location.lng,
              formattedAddress: geocodeData.results[0].formatted_address,
            }
          }

          console.warn(`[v0] Could not geocode address: ${home.address}`)
          return {
            id: home.id,
            latitude: null,
            longitude: null,
          }
        } catch (error) {
          console.error(`[v0] Error geocoding ${home.address}:`, error)
          return {
            id: home.id,
            latitude: null,
            longitude: null,
          }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[v0] Geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode addresses' },
      { status: 500 }
    )
  }
}
