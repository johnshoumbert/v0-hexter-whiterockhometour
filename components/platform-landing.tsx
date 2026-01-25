import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Users, Zap, Shield, Heart, Trophy, Sparkles, Rocket, DollarSign, Check } from 'lucide-react'

export function PlatformLanding() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm">
              <Rocket className="h-4 w-4 text-primary" />
              <span>Newly Launched Platform</span>
            </div>

            <h1 className="text-balance text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Run successful fundraising auctions{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                with ease
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
              The complete auction platform built for schools and nonprofits. Engage bidders, raise more money, and
              create memorable fundraising events — all in one place.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base" asChild>
                <Link href="/events">
                  Browse Active Auctions <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base bg-transparent" asChild>
                <Link href="/contact">Request a Demo</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      </section>

      <section className="border-y bg-gradient-to-br from-primary/5 via-muted/30 to-secondary/5 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4">
                <Sparkles className="h-4 w-4" />
                Just Launched
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl mb-4">
                Simplified Auction Platform for Schools & Nonprofits
              </h2>
              <p className="text-pretty text-lg text-muted-foreground max-w-2xl mx-auto">
                We're excited to introduce our newly launched platform designed specifically for educational institutions and nonprofit organizations. Modern fundraising made simple.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-10">
              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Simple Pricing</h3>
                <p className="text-sm text-muted-foreground">Just $200 per auction event. No hidden fees or complicated pricing tiers.</p>
              </div>

              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Built for You</h3>
                <p className="text-sm text-muted-foreground">Purpose-built features specifically designed for school PTAs and nonprofits.</p>
              </div>

              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Quick Setup</h3>
                <p className="text-sm text-muted-foreground">Launch your auction in minutes with our intuitive setup process.</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/50 p-8">
              <h3 className="text-xl font-semibold mb-4 text-center">What's Included</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Unlimited auction items</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Real-time bidding</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Secure payment processing</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Mobile-responsive design</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Donor management tools</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Custom branding options</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Everything you need for a successful auction
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              Purpose-built features that help you engage bidders, maximize fundraising, and create unforgettable events
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl border bg-card p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Real-Time Bidding</h3>
              <p className="text-pretty text-muted-foreground">
                Engage bidders with live auction updates, automatic bid notifications, and competitive bidding features
                that drive excitement
              </p>
            </div>

            <div className="group rounded-2xl border bg-card p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Easy Management</h3>
              <p className="text-pretty text-muted-foreground">
                Intuitive admin dashboard to manage items, track bids, communicate with bidders, and monitor your
                fundraising goals
              </p>
            </div>

            <div className="group rounded-2xl border bg-card p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Mobile-First Design</h3>
              <p className="text-pretty text-muted-foreground">
                Beautiful, responsive experience that works perfectly on any device. Bidders can participate from
                anywhere, anytime
              </p>
            </div>

            <div className="group rounded-2xl border bg-card p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Secure Payments</h3>
              <p className="text-pretty text-muted-foreground">
                Integrated Stripe payments with PCI compliance, automatic receipts, and seamless checkout for winning
                bidders
              </p>
            </div>

            <div className="group rounded-2xl border bg-card p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Donor Engagement</h3>
              <p className="text-pretty text-muted-foreground">
                Build lasting relationships with features like donation pages, sponsor recognition, and personalized
                thank-you messages
              </p>
            </div>

            <div className="group rounded-2xl border bg-card p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Proven Results</h3>
              <p className="text-pretty text-muted-foreground">
                Schools using our platform raise 40% more on average compared to traditional silent auctions. See the
                difference
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Launch your auction in minutes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              Simple setup process that gets you from signup to live auction faster than any other platform
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mb-3 text-xl font-semibold">Create Your Event</h3>
              <p className="text-pretty text-muted-foreground">
                Set up your auction details, customize your branding, and configure your fundraising goals in minutes
              </p>
              {/* Connector line */}
              <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-border md:block" />
            </div>

            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="mb-3 text-xl font-semibold">Add Your Items</h3>
              <p className="text-pretty text-muted-foreground">
                Upload auction items with photos, descriptions, and starting bids. Organize into categories for easy
                browsing
              </p>
              {/* Connector line */}
              <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-border md:block" />
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="mb-3 text-xl font-semibold">Go Live & Raise Funds</h3>
              <p className="text-pretty text-muted-foreground">
                Share your custom auction link, watch the bids roll in, and celebrate your fundraising success
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <Link href="/contact">
                Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-12 text-center shadow-lg">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Ready to transform your fundraising?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
              Join hundreds of schools and nonprofits raising more money with engaging online auctions
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/events">Browse Active Auctions</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Schedule a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
