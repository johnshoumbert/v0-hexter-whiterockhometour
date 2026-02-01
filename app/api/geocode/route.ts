import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address, captchaToken } = await request.json()

    // Verify reCAPTCHA token
    if (!captchaToken) {
      return NextResponse.json(
        { error: 'CAPTCHA token is required' },
        { status: 400 }
      )
    }

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
    if (!recaptchaSecret) {
      console.error('[v0] RECAPTCHA_SECRET_KEY not configured')
      return NextResponse.json(
        { error: 'CAPTCHA verification not configured' },
        { status: 500 }
      )
    }

    // Verify CAPTCHA with Google
    const verifyResponse = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${recaptchaSecret}&response=${captchaToken}`,
      }
    )

    const captchaResult = await verifyResponse.json()

    if (!captchaResult.success || captchaResult.score < 0.5) {
      return NextResponse.json(
        { error: 'CAPTCHA verification failed' },
        { status: 403 }
      )
    }

    // Geocode the address using Google Maps Geocoding API
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${googleApiKey}`

    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()

    if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
      return NextResponse.json(
        { error: 'Unable to geocode address' },
        { status: 400 }
      )
    }

    const location = geocodeData.results[0].geometry.location

    return NextResponse.json({
      lat: location.lat,
      lng: location.lng,
      formattedAddress: geocodeData.results[0].formatted_address,
    })
  } catch (error) {
    console.error('[v0] Geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    )
  }
}
