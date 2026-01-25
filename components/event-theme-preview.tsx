"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Heart, ArrowRight } from "lucide-react"

interface EventThemePreviewProps {
  bgColor?: string
  bgImage?: string
  fontFamily?: string
  fontFamilyRegular?: string
  fontFamilyBold?: string
  textColor?: string
  boldTextColor?: string
  mode?: "light" | "dark" | "not-set"
  eventName?: string
  buttonLightBg?: string
  buttonLightText?: string
  buttonDarkBg?: string
  buttonDarkText?: string
}

export function EventThemePreview({
  bgColor = "#ffffff",
  bgImage,
  fontFamily = "Inter",
  fontFamilyRegular = "Nunito",
  fontFamilyBold = "Nunito",
  textColor = "#333333",
  boldTextColor = "#000000",
  mode = "light",
  eventName = "Your Event Name",
  buttonLightBg = "#000000",
  buttonLightText = "#ffffff",
  buttonDarkBg = "#ffffff",
  buttonDarkText = "#000000",
}: EventThemePreviewProps) {
  const containerStyle = {
    backgroundColor: bgColor,
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: fontFamilyRegular,
    color: textColor,
  }

  const boldStyle = {
    color: boldTextColor,
    fontWeight: 700,
    fontFamily: fontFamilyBold,
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-sm">
      <div className="bg-muted px-3 py-2 text-xs font-medium text-muted-foreground border-b">
        Preview - Home Page Hero Section
      </div>
      <div style={containerStyle} className="p-8 min-h-[400px] flex items-center justify-center">
        <div className="max-w-2xl text-center space-y-6">
          <h1 style={boldStyle} className="text-4xl md:text-5xl">
            {eventName}
          </h1>
          <p style={{ color: textColor, fontFamily: fontFamilyRegular }} className="text-lg">
            Join us for an amazing auction event. Bid on incredible items and support a great cause!
          </p>
          <div
            className="flex items-center justify-center gap-2 text-sm"
            style={{ color: textColor, fontFamily: fontFamilyRegular }}
          >
            <Calendar className="h-4 w-4" />
            <span>March 15, 2025 - March 20, 2025</span>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              size="lg"
              style={{
                backgroundColor: buttonDarkBg,
                color: buttonDarkText,
                fontFamily: fontFamilyBold,
              }}
            >
              Show QR Code <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              style={{
                backgroundColor: buttonLightBg,
                color: buttonLightText,
                borderColor: buttonLightBg,
                fontFamily: fontFamilyRegular,
              }}
            >
              Instructions <Heart className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Badge variant="secondary" className="mt-4">
            {mode === "dark" ? "Dark Mode (Fixed)" : mode === "light" ? "Light Mode (Fixed)" : "User Can Toggle Theme"}
          </Badge>
        </div>
      </div>
    </div>
  )
}
