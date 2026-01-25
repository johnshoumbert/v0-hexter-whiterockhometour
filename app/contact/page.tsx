"use client"

import { HelpCircle } from "lucide-react"
import { ContactFormSection } from "@/components/contact-form-section"

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">How Can We Help?</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions or reach out to our support team
          </p>
        </div>

        <ContactFormSection />
      </div>
    </div>
  )
}
