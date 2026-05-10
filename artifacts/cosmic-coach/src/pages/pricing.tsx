import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Mic, CheckCircle, Zap, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const FREE_FEATURES = [
  "3 sessions per month",
  "File upload (up to 25 MB)",
  "Video URL analysis",
  "Filler word detection",
  "Basic AI scoring",
  "Audience personas (3 types)",
  "Impact timeline",
  "Waveform visualization",
];

const PRO_FEATURES = [
  "Unlimited sessions",
  "Files up to 100 MB",
  "Priority URL analysis",
  "Full filler word breakdown",
  "5 parallel AI analysis calls",
  "Detailed per-metric coaching",
  "Opening & closing strength",
  "Vocabulary complexity score",
  "Call-to-action assessment",
  "Persuasion framework scoring",
  "7-day free trial",
];

export default function PricingPage() {
  const { user, isSignedIn } = useUser();
  const { isPremium, priceId } = usePremiumStatus();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      setLocation("/sign-up");
      return;
    }
    if (!priceId) {
      toast({ title: "Unavailable", description: "Pricing not configured yet. Please try again soon.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Failed to start checkout");
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/">
          <div className="flex items-center gap-2 font-bold text-lg text-primary font-mono cursor-pointer">
            <Mic className="w-5 h-5" />
            <span>COSMIC COACH</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button variant="ghost" className="font-mono text-xs uppercase tracking-widest">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" className="font-mono text-xs uppercase tracking-widest">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button className="font-mono text-xs uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="relative z-10 pt-16 pb-24 px-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free. Upgrade when you're ready to go deeper.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-8"
          >
            <div className="mb-6">
              <div className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-2">Free</div>
              <div className="text-4xl font-black text-foreground">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <div className="text-sm text-muted-foreground mt-1">Forever free, no card needed</div>
            </div>
            <ul className="space-y-2.5 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-widest border-border/50">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-widest border-border/50">
                  Get Started Free
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-primary/40 bg-card/60 backdrop-blur-xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,102,255,0.1)]"
          >
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-mono text-primary uppercase tracking-widest">
                <Crown className="w-3 h-3" />
                Pro
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-mono uppercase tracking-widest text-primary mb-2">Pro</div>
              <div className="text-4xl font-black text-foreground">$19<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <div className="text-sm text-emerald-400 mt-1 font-mono">7-day free trial · cancel anytime</div>
            </div>

            <ul className="space-y-2.5 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <Button
                disabled
                className="w-full font-mono text-xs uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              >
                <CheckCircle className="mr-2 w-4 h-4" /> Current Plan
              </Button>
            ) : (
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full font-mono text-xs uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,102,255,0.3)]"
              >
                {loading ? "Loading..." : (
                  <><Zap className="mr-2 w-4 h-4" /> Start Free Trial <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </Button>
            )}
          </motion.div>
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground/60 font-mono">
          Questions? All plans include unlimited analysis revisions. Upgrade or cancel any time.
        </div>
      </div>
    </div>
  );
}
