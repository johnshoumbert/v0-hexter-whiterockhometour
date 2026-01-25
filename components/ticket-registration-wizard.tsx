"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight, ChevronLeft } from "lucide-react"

interface Question {
  id: string
  question_text: string
  question_type: "text" | "select" | "multiselect"
  options: string[] | null
  is_required: boolean
}

interface TicketWithQuestions {
  ticket_id: string
  ticket_name: string
  questions: Question[]
}

interface TicketRegistrationWizardProps {
  tickets: TicketWithQuestions[]
  onComplete: (responses: Record<string, Record<string, string | string[]>>) => void
  onCancel: () => void
}

export function TicketRegistrationWizard({ tickets, onComplete, onCancel }: TicketRegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, Record<string, string | string[]>>>({})

  const currentTicket = tickets[currentStep]
  const hasQuestions = currentTicket?.questions && currentTicket.questions.length > 0

  const handleNext = () => {
    // Validate required fields
    if (hasQuestions) {
      const ticketResponses = responses[currentTicket.ticket_id] || {}
      const unansweredRequired = currentTicket.questions.filter((q) => q.is_required && !ticketResponses[q.id])

      if (unansweredRequired.length > 0) {
        alert("Please answer all required questions")
        return
      }
    }

    if (currentStep < tickets.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete(responses)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      onCancel()
    }
  }

  const updateResponse = (questionId: string, value: string | string[]) => {
    setResponses({
      ...responses,
      [currentTicket.ticket_id]: {
        ...(responses[currentTicket.ticket_id] || {}),
        [questionId]: value,
      },
    })
  }

  const toggleMultiselectOption = (questionId: string, option: string) => {
    const currentResponses = (responses[currentTicket.ticket_id]?.[questionId] as string[]) || []
    const newResponses = currentResponses.includes(option)
      ? currentResponses.filter((o) => o !== option)
      : [...currentResponses, option]
    updateResponse(questionId, newResponses)
  }

  if (!hasQuestions) {
    // Skip tickets without questions
    if (currentStep < tickets.length - 1) {
      setCurrentStep(currentStep + 1)
      return null
    }
    onComplete(responses)
    return null
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Registration Questions - {currentTicket.ticket_name}</CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {tickets.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentTicket.questions.map((question, index) => (
          <div key={question.id} className="space-y-3">
            <Label className="text-base">
              {index + 1}. {question.question_text}
              {question.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {question.question_type === "text" && (
              <Textarea
                placeholder="Your answer"
                value={(responses[currentTicket.ticket_id]?.[question.id] as string) || ""}
                onChange={(e) => updateResponse(question.id, e.target.value)}
                className="min-h-[100px]"
              />
            )}

            {question.question_type === "select" && question.options && (
              <RadioGroup
                value={(responses[currentTicket.ticket_id]?.[question.id] as string) || ""}
                onValueChange={(value) => updateResponse(question.id, value)}
              >
                {question.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label htmlFor={`${question.id}-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {question.question_type === "multiselect" && question.options && (
              <div className="space-y-2">
                {question.options.map((option) => {
                  const checked = ((responses[currentTicket.ticket_id]?.[question.id] as string[]) || []).includes(
                    option,
                  )
                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={checked}
                        onCheckedChange={() => toggleMultiselectOption(question.id, option)}
                      />
                      <Label htmlFor={`${question.id}-${option}`} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </Button>
          <Button onClick={handleNext}>
            {currentStep < tickets.length - 1 ? (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "Complete Registration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
