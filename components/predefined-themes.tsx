"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
// import { EventThemePreview } from "./event-theme-preview"

export interface ThemeTemplate {
  id: string
  name: string
  description: string
  category: string
  colors: {
    lightBg: string
    lightText: string
    lightBoldText: string
    darkBg: string
    darkText: string
    darkBoldText: string
  }
  fonts: {
    regular: string
    bold: string
  }
  buttons: {
    lightBg: string
    lightText: string
    darkBg: string
    darkText: string
  }
}

const PREDEFINED_THEMES: ThemeTemplate[] = [
  {
    id: "wild-west",
    name: "Wild West Round-Up",
    description: "Rustic, adventurous, crowd-favorite",
    category: "Western",
    colors: {
      lightBg: "#faf6f1",
      lightText: "#6b5344",
      lightBoldText: "#3d2b21",
      darkBg: "#2a1f18",
      darkText: "#e8dcc8",
      darkBoldText: "#f5e6d3",
    },
    fonts: {
      regular: "Libre Baskerville",
      bold: "Rye",
    },
    buttons: {
      lightBg: "#8b6f47",
      lightText: "#faf6f1",
      darkBg: "#d4a574",
      darkText: "#2a1f18",
    },
  },
  {
    id: "groovy-70s",
    name: "Groovy 70s Disco",
    description: "Fun, colorful, nostalgic",
    category: "Vibrant",
    colors: {
      lightBg: "#fff8f0",
      lightText: "#8b5a2b",
      lightBoldText: "#cc6633",
      darkBg: "#2d1810",
      darkText: "#f5d5a8",
      darkBoldText: "#ffb347",
    },
    fonts: {
      regular: "Poppins",
      bold: "Montserrat",
    },
    buttons: {
      lightBg: "#cc6633",
      lightText: "#fff8f0",
      darkBg: "#ff9500",
      darkText: "#2d1810",
    },
  },
  {
    id: "hollywood",
    name: "Hollywood Red Carpet",
    description: "Glamorous, aspirational",
    category: "Elegant",
    colors: {
      lightBg: "#fafafa",
      lightText: "#333333",
      lightBoldText: "#000000",
      darkBg: "#1a1a1a",
      darkText: "#e8e8e8",
      darkBoldText: "#ffd700",
    },
    fonts: {
      regular: "Lato",
      bold: "Playfair Display",
    },
    buttons: {
      lightBg: "#dc143c",
      lightText: "#fafafa",
      darkBg: "#ffd700",
      darkText: "#1a1a1a",
    },
  },
  {
    id: "big-top",
    name: "Under the Big Top",
    description: "Whimsical, family-friendly",
    category: "Fun",
    colors: {
      lightBg: "#fffbf5",
      lightText: "#5a3a3a",
      lightBoldText: "#8b0000",
      darkBg: "#2c1f1f",
      darkText: "#f5e6d3",
      darkBoldText: "#ff6666",
    },
    fonts: {
      regular: "Poppins",
      bold: "Baloo 2",
    },
    buttons: {
      lightBg: "#8b0000",
      lightText: "#fffbf5",
      darkBg: "#ff6666",
      darkText: "#2c1f1f",
    },
  },
  {
    id: "enchanted-garden",
    name: "Enchanted Garden",
    description: "Magical, elegant, calming",
    category: "Nature",
    colors: {
      lightBg: "#f5f9f7",
      lightText: "#556b5f",
      lightBoldText: "#2d5a4e",
      darkBg: "#1a3a33",
      darkText: "#d1e8e0",
      darkBoldText: "#e8f4f0",
    },
    fonts: {
      regular: "Source Serif 4",
      bold: "Merriweather",
    },
    buttons: {
      lightBg: "#2d5a4e",
      lightText: "#f5f9f7",
      darkBg: "#7fb3a0",
      darkText: "#1a3a33",
    },
  },
  {
    id: "neon-arcade",
    name: "Neon Arcade",
    description: "Energetic, kid-approved, playful",
    category: "Retro",
    colors: {
      lightBg: "#f0f0f5",
      lightText: "#333333",
      lightBoldText: "#1a1a2e",
      darkBg: "#0a0a1a",
      darkText: "#00ffff",
      darkBoldText: "#ff00ff",
    },
    fonts: {
      regular: "Inter",
      bold: "Montserrat",
    },
    buttons: {
      lightBg: "#00ffff",
      lightText: "#0a0a1a",
      darkBg: "#ff00ff",
      darkText: "#0a0a1a",
    },
  },
  {
    id: "passport-world",
    name: "Passport to the World",
    description: "Cultural, educational, inclusive",
    category: "Global",
    colors: {
      lightBg: "#fefaf5",
      lightText: "#5a5a5a",
      lightBoldText: "#1a2d4d",
      darkBg: "#1a2d4d",
      darkText: "#e8d7c3",
      darkBoldText: "#f5e6d3",
    },
    fonts: {
      regular: "Open Sans",
      bold: "Abril Fatface",
    },
    buttons: {
      lightBg: "#1a2d4d",
      lightText: "#fefaf5",
      darkBg: "#d4a574",
      darkText: "#1a2d4d",
    },
  },
  {
    id: "campfire-smores",
    name: "Campfire & S'mores",
    description: "Cozy, outdoorsy, community-focused",
    category: "Rustic",
    colors: {
      lightBg: "#fffaf5",
      lightText: "#5a4a3a",
      lightBoldText: "#2d5a2d",
      darkBg: "#1a3d1a",
      darkText: "#f5ddb8",
      darkBoldText: "#ffcc99",
    },
    fonts: {
      regular: "Roboto Slab",
      bold: "Abril Fatface",
    },
    buttons: {
      lightBg: "#2d5a2d",
      lightText: "#fffaf5",
      darkBg: "#ffcc99",
      darkText: "#1a3d1a",
    },
  },
  {
    id: "art-imagination",
    name: "Art & Imagination",
    description: "Creative, student-centric",
    category: "Creative",
    colors: {
      lightBg: "#ffffff",
      lightText: "#444444",
      lightBoldText: "#222222",
      darkBg: "#1a1a1a",
      darkText: "#f0f0f0",
      darkBoldText: "#ffffff",
    },
    fonts: {
      regular: "Nunito",
      bold: "Montserrat",
    },
    buttons: {
      lightBg: "#ff6b6b",
      lightText: "#ffffff",
      darkBg: "#ff9999",
      darkText: "#1a1a1a",
    },
  },
  {
    id: "tropical-luau",
    name: "Tropical Luau",
    description: "Bright, cheerful, escape-the-ordinary",
    category: "Vibrant",
    colors: {
      lightBg: "#fffaf5",
      lightText: "#5a6b4e",
      lightBoldText: "#00695c",
      darkBg: "#1a3a35",
      darkText: "#c8f7f0",
      darkBoldText: "#ff6b9d",
    },
    fonts: {
      regular: "Poppins",
      bold: "Poppins",
    },
    buttons: {
      lightBg: "#00695c",
      lightText: "#fffaf5",
      darkBg: "#ff6b9d",
      darkText: "#1a3a35",
    },
  },
]

interface PredefinedThemesProps {
  onApplyTheme: (theme: ThemeTemplate) => void
  selectedThemeId?: string
}

export function PredefinedThemes({ onApplyTheme, selectedThemeId }: PredefinedThemesProps) {
  const [selectedForPreview, setSelectedForPreview] = useState<string | null>(selectedThemeId || null)
  const previewTheme = PREDEFINED_THEMES.find((t) => t.id === selectedForPreview) || PREDEFINED_THEMES[0]

  // Group themes by category
  const categories = Array.from(new Set(PREDEFINED_THEMES.map((t) => t.category)))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Choose a Theme Template</CardTitle>
          <CardDescription>Select from our curated collection of pre-designed themes</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="Western" className="space-y-2">
            {categories.map((category) => {
              const themesInCategory = PREDEFINED_THEMES.filter((t) => t.category === category)
              return (
                <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <span className="font-semibold">{category}</span>
                      <Badge variant="secondary">{themesInCategory.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {themesInCategory.map((theme) => (
                        <div key={theme.id} className="relative">
                          <Card
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedForPreview === theme.id ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => setSelectedForPreview(theme.id)}
                          >
                            <CardContent className="p-4 space-y-3">
                              {/* Color Preview */}
                              <div className="flex gap-2 rounded overflow-hidden h-12">
                                <div
                                  className="flex-1"
                                  style={{ backgroundColor: theme.colors.lightBg }}
                                  title="Light Mode"
                                />
                                <div
                                  className="flex-1"
                                  style={{ backgroundColor: theme.colors.darkBg }}
                                  title="Dark Mode"
                                />
                              </div>

                              {/* Theme Info */}
                              <div>
                                <h3 className="font-semibold text-sm">{theme.name}</h3>
                                <p className="text-xs text-muted-foreground">{theme.description}</p>
                              </div>

                              {/* Fonts */}
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>
                                  Regular: <span className="font-medium">{theme.fonts.regular}</span>
                                </div>
                                <div>
                                  Bold: <span className="font-medium">{theme.fonts.bold}</span>
                                </div>
                              </div>

                              {/* Apply Button */}
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedForPreview(theme.id)
                                  onApplyTheme(theme)
                                }}
                              >
                                {selectedForPreview === theme.id && <Check className="mr-2 h-4 w-4" />}
                                Apply Theme
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
