"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Testimonial {
  id: string
  author_name: string
  author_title: string
  author_avatar?: string
  quote: string
  display_order: number
}

interface TestimonialCarouselProps {
  eventId: string
  autoAdvanceInterval?: number
}

export function TestimonialCarousel({ eventId, autoAdvanceInterval = 5 * 60 * 1000 }: TestimonialCarouselProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/events/${eventId}/testimonials`)
        if (res.ok) {
          const data = await res.json()
          setTestimonials(data.testimonials || [])
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestimonials()
  }, [eventId])

  // Auto-advance carousel
  useEffect(() => {
    if (testimonials.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, autoAdvanceInterval)

    return () => clearInterval(interval)
  }, [testimonials.length, autoAdvanceInterval])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!testimonials || testimonials.length === 0) {
    return null
  }

  const current = testimonials[currentIndex]

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  return (
    <div className="w-full">
      <div className="space-y-8">
        {/* Testimonial Card */}
        <Card className="border-2 border-gray-900 min-h-96 flex flex-col justify-center">
          <CardContent className="p-8">
            <blockquote className="text-xl italic text-gray-700 mb-6 leading-relaxed">
              "{current.quote}"
            </blockquote>

            {/* Author Info with Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarImage src={current.author_avatar || ""} alt={current.author_name} />
                <AvatarFallback className="text-lg">{current.author_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-gray-900">{current.author_name}</div>
                {current.author_title && <div className="text-sm text-gray-600">{current.author_title}</div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            disabled={testimonials.length <= 1}
            className="border-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Carousel Indicators */}
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-3 w-3 rounded-full transition-all ${
                  index === currentIndex ? "bg-gray-900 w-8" : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={testimonials.length <= 1}
            className="border-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Counter */}
        <div className="text-center text-sm text-muted-foreground">
          {currentIndex + 1} of {testimonials.length}
        </div>
      </div>
    </div>
  )
}
