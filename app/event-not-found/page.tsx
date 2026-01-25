import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function EventNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10 p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="mb-8">
            <AlertCircle className="h-24 w-24 mx-auto text-destructive mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Event Not Found</h1>
            <p className="text-lg text-muted-foreground mb-6 text-pretty">
              We couldn't find an event associated with this domain. The event may have been removed or the URL might be
              incorrect.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/events">Browse All Events</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="https://myschoolauction.com">Visit MySchoolAuction.com</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
