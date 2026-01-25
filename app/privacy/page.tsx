"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 space-y-8">
      <Card className="shadow-md border-muted">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Privacy Policy
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
              MySchoolAuction (“we,” “our,” “us”) is committed to protecting
              your privacy. This policy explains how we collect, use, and
              protect your personal data. By using our website and services, you
              agree to this policy and our{" "}
              <Link
                href="/terms"
                className="text-primary hover:underline font-medium"
              >
                Terms of Use
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">2. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Contact details like name, email, and phone number.</li>
              <li>Account and organization information.</li>
              <li>
                Bidding, donation, and event participation activity on the
                platform.
              </li>
              <li>Technical data such as browser type, device, and IP address.</li>
              <li>Cookies for session tracking and site preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Operate and improve the platform.</li>
              <li>Process payments securely via Stripe.</li>
              <li>Send updates, auction results, or support messages.</li>
              <li>Comply with legal or security obligations.</li>
            </ul>
            <p className="mt-2">
              We do not sell or rent your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">4. Sharing Information</h2>
            <p>
              We share limited information with trusted service providers such
              as Stripe, hosting, and email partners. Data may also be shared
              with your auction’s administrators for management purposes.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">5. Cookies & Analytics</h2>
            <p>
              Cookies help personalize your experience and maintain secure
              sessions. You can disable cookies in your browser settings, but
              some site features may stop working.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">6. Data Security</h2>
            <p>
              We use secure servers, encryption, and restricted access to
              protect your data. However, no online platform is completely
              secure, and you share information at your own risk.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">7. Your Rights & Choices</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Update your profile and preferences anytime.</li>
              <li>Request deletion of your account and personal data.</li>
              <li>Opt out of marketing communications.</li>
            </ul>
            <p className="mt-2">
              To make a request, email{" "}
              <a
                href="mailto:support@myschoolauction.com"
                className="text-primary underline"
              >
                support@myschoolauction.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">8. Children’s Privacy</h2>
            <p>
              MySchoolAuction is intended for adults managing school or
              community fundraisers. We do not knowingly collect data from
              minors under 18. If we learn of such data, we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">9. Policy Updates</h2>
            <p>
              We may update this policy from time to time. Continued use of our
              platform means you accept the latest version.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="font-semibold text-lg mb-2">Contact Us</h2>
            <p>
              Questions? Contact{" "}
              <a
                href="mailto:support@myschoolauction.com"
                className="text-primary underline"
              >
                support@myschoolauction.com
              </a>{" "}
              or mail us at Dallas, TX, USA.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export default PrivacyPolicy
