import { Link } from "wouter";
import { ArrowRight, Upload, Sparkles, Coins, Shield, Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Sparkles,
    title: "AI Deal Coach",
    description: "Get instant seller scripts, per-issue cost breakdowns, and estimated credit requests - ready for your next call.",
  },
  {
    icon: Upload,
    title: "60-Second Analysis",
    description: "Upload your inspection PDF the moment you receive it. AI analysis is ready before your coffee cools.",
  },
  {
    icon: Coins,
    title: "Upload 1, Unlock 2",
    description: "Every report you share earns credits to unlock two more. Build your research war chest.",
  },
  {
    icon: Shield,
    title: "Privacy Protected",
    description: "Your personal info is auto-redacted before sharing. Control what you share, keep what you need.",
  },
  {
    icon: Bell,
    title: "Bounty System",
    description: "Looking at a specific property? Request its report. Get notified when an investor shares it.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Upload Immediately",
    description: "Get your inspection report? Upload it right away - analysis is ready in 60 seconds.",
  },
  {
    step: "2",
    title: "Get Your Battlecard",
    description: "AI generates seller scripts, issue breakdowns, and credit recommendations for your negotiation.",
  },
  {
    step: "3",
    title: "Win Your Negotiation",
    description: "Walk into your next seller conversation with data-backed leverage and confidence.",
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
            <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
              For Real Estate Investors
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Win Your Next{" "}
              <span className="text-primary">Negotiation</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your inspection report the moment you receive it. Get AI-powered 
              seller scripts, cost breakdowns, and credit requests - ready for your negotiation 
              in 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">
                  Start Winning Negotiations
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                <a href="#how-it-works">
                  See How It Works
                </a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
              50 free credits on signup - Upload 1 report, unlock 2 from the marketplace
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Your Negotiation Toolkit</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From the moment you receive your inspection to the final negotiation call - 
              everything you need to maximize your leverage and close better deals.
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
            <h2 className="text-3xl font-bold mb-4">60 Seconds to Negotiation Ready</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From upload to battlecard - everything you need to walk into your seller 
              conversation with confidence.
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
              <h2 className="text-3xl font-bold mb-4">Build Your Research War Chest</h2>
              <p className="text-muted-foreground">
                Every report you upload earns credits for your next property research. Fair exchange, mutual benefit.
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
            <h2 className="text-3xl font-bold mb-4">Your Next Inspection Awaits</h2>
            <p className="text-muted-foreground mb-8">
              The moment you receive your next inspection report, upload it here. 
              60 seconds later, you'll have everything you need to negotiate with confidence.
            </p>
            <Button size="lg" asChild data-testid="button-cta-signup">
              <a href="/api/login">
                Get Your Negotiation Edge
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
