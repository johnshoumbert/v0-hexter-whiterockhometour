"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export function TermsOfUse() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 space-y-8">
      <Card className="shadow-md border-muted">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Terms of Use
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-sm leading-relaxed">
          <p className="text-muted-foreground text-center">
            Last updated: November 2025
          </p>

          <Separator />

          <section>
            <h2 className="font-semibold text-lg mb-2">1. Overview</h2>
            <p>
              MySchoolAuction (“we,” “our,” “us”) provides tools for schools,
              PTAs, and community organizations to run online silent auctions
              and fundraisers. By using our platform, you agree to these Terms
              of Use and our{" "}
              <Link
                href="/privacy"
                className="text-primary hover:underline font-medium"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">2. Your Account</h2>
            <p>
              You must be at least 18 years old, provide accurate information,
              and maintain the security of your account. We reserve the right
              to suspend or close inactive or noncompliant accounts.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">3. Appropriate Use</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Do not post illegal, infringing, or misleading content.</li>
              <li>Do not impersonate others or misuse organization details.</li>
              <li>Do not manipulate bids, fees, or payments.</li>
              <li>Do not upload viruses or attempt to disrupt services.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">4. Fees & Payments</h2>
            <p>
              Creating an account is free. Transaction and processing fees apply
              when hosting auctions or receiving payments. All payments are
              processed securely through Stripe, subject to{" "}
              <a
                href="https://stripe.com/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Stripe’s Terms of Service
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">5. Ownership & Content</h2>
            <p>
              You retain rights to your content but grant MySchoolAuction a
              limited license to display it for your event. You are responsible
              for ensuring your content does not violate copyright or trademark
              laws.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">6. Liability & Disclaimer</h2>
            <p>
              MySchoolAuction is not the seller of any listed items. We make no
              guarantees regarding the quality or fulfillment of items. Services
              are provided “as is” and without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">7. Disputes & Governing Law</h2>
            <p>
              All disputes shall be governed by the laws of Texas, USA. Any
              disputes will be resolved through mediation or arbitration before
              court proceedings.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">8. Updates</h2>
            <p>
              We may update these Terms periodically. Continued use of the
              platform after changes are posted constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="font-semibold text-lg mb-2">Contact Us</h2>
            <p>
              For any questions about these Terms, contact us at{" "}
              <a
                href="mailto:support@myschoolauction.com"
                className="text-primary underline"
              >
                support@myschoolauction.com
              </a>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export default TermsOfUse
