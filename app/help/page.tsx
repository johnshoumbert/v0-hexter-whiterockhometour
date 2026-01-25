"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"
import { ContactFormSection } from "@/components/contact-form-section"

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

export default function HelpPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    try {
      const response = await fetch(`/api/faqs?eventId=null`)
      const data = await response.json()
      setFaqs(data.faqs || [])
    } catch (error) {
      console.error("Error fetching FAQs:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group FAQs by category
  const groupedFAQs = faqs.reduce(
    (acc, faq) => {
      const category = faq.category || "General"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(faq)
      return acc
    },
    {} as Record<string, FAQ[]>,
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">How Can We Help?</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions or reach out to our support team
          </p>
        </div>

        <div className="mb-12">
          <ContactFormSection />
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading FAQs...</div>
          ) : Object.keys(groupedFAQs).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => (
                <div key={category}>
                  <h3 className="text-xl font-semibold mb-4 text-primary">{category}</h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {categoryFaqs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-left font-medium hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No FAQs available yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
