import { Link } from "wouter";
import { ArrowRight, Upload, Sparkles, Coins, Shield, Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Upload,
    title: "Smart Upload",
    description: "Drag & drop your inspection PDF. Our AI extracts key data in under 30 seconds.",
  },
  {
    icon: Sparkles,
    title: "AI Deal Coach",
    description: "Get instant negotiation points and estimated credit requests for seller discussions.",
  },
  {
    icon: Coins,
    title: "Karma Credits",
    description: "Earn credits by uploading reports. Spend them to access reports from other investors.",
  },
  {
    icon: Shield,
    title: "Privacy Protected",
    description: "Auto-redaction removes your personal info before reports are shared publicly.",
  },
  {
    icon: Bell,
    title: "Bounty System",
    description: "Request reports for specific addresses. Stake credits and get notified when available.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Upload Your Report",
    description: "Drop any PDF inspection report. Old or new - they all have value.",
  },
  {
    step: "2",
    title: "Get AI Analysis",
    description: "Receive negotiation strategies and credit estimates instantly.",
  },
  {
    step: "3",
    title: "Earn & Spend Credits",
    description: "Use credits to access reports for properties you're considering.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">InspectSwap</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Turn Dead Inspection Reports Into{" "}
              <span className="text-primary">Deal Leverage</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop paying $300-$600 for inspections on deals that fall through. 
              Upload your reports, get AI-powered insights, and access a community-driven 
              marketplace of property inspections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                <a href="#how-it-works">
                  Learn More
                </a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
              50 free credits on signup
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built by real estate investors, for real estate investors. 
              Every feature is designed to save you money and give you negotiating power.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple, fast, and designed to get you results in under a minute.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
                {index < howItWorks.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-muted-foreground/50 mx-auto mt-4 hidden md:block rotate-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit System Explainer */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">The Credit Economy</h2>
              <p className="text-muted-foreground">
                A fair exchange system where everyone wins.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-green-500 rotate-45" />
                    </div>
                    <h3 className="font-semibold text-lg">Earn Credits</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span><strong>+50</strong> credits on signup</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span><strong>+10</strong> credits per report uploaded</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span><strong>+5</strong> bonus for uploading within 48h</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span><strong>+Bounty</strong> rewards for requested addresses</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-orange-500 -rotate-45" />
                    </div>
                    <h3 className="font-semibold text-lg">Spend Credits</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span><strong>-5</strong> credits to unlock a report</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span><strong>-5+</strong> credits to stake on bounties</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
                    Upload 1 report = Unlock 2 from the marketplace
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of real estate investors who are turning their inspection reports 
              into negotiating power.
            </p>
            <Button size="lg" asChild data-testid="button-cta-signup">
              <a href="/api/login">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Upload className="w-4 h-4 text-primary-foreground" />
              </div>
              <span>InspectSwap</span>
            </div>
            <p>Built for real estate investors, by real estate investors.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
