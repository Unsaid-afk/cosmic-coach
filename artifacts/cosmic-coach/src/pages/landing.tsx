import { motion } from "framer-motion";
import { Link } from "wouter";
import { Mic, Zap, Brain, Target, Users, TrendingUp, Play, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Mic,
    title: "AI Transcription",
    desc: "Whisper-powered transcription with filler word detection and pacing analysis.",
    color: "text-primary",
    glow: "shadow-[0_0_20px_rgba(0,102,255,0.2)]",
  },
  {
    icon: Brain,
    title: "5 Parallel AI Calls",
    desc: "GPT-4o-mini scores delivery, persuasion, audience impact, and vocabulary simultaneously.",
    color: "text-secondary",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.2)]",
  },
  {
    icon: Users,
    title: "Audience Simulation",
    desc: "The Skeptic, The Busy Exec, and The Novice react to your speech in real time.",
    color: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.2)]",
  },
  {
    icon: Target,
    title: "Impact Timeline",
    desc: "See exactly when your audience checks their phone — and your golden moments.",
    color: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.2)]",
  },
  {
    icon: TrendingUp,
    title: "Persuasion Score",
    desc: "PAS framework analysis — Problem, Agitation, Solution — with storytelling detection.",
    color: "text-rose-400",
    glow: "shadow-[0_0_20px_rgba(251,113,133,0.2)]",
  },
  {
    icon: Zap,
    title: "Video URL Analysis",
    desc: "Paste a YouTube, Loom, or Vimeo link and let us handle the rest.",
    color: "text-sky-400",
    glow: "shadow-[0_0_20px_rgba(56,189,248,0.2)]",
  },
];

const testimonials = [
  { name: "Sarah Chen", role: "VC-backed Founder", text: "My investor pitch improved from a 42 to an 87 in two weeks. The audience persona feedback is insane.", stars: 5 },
  { name: "Marcus Reid", role: "Sales Director", text: "Cut my filler words by 70% after three sessions. Closed a $2M deal the week after.", stars: 5 },
  { name: "Priya Nair", role: "TEDx Speaker", text: "I never knew my opening was so weak until Cosmic Coach told me exactly why — and how to fix it.", stars: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl text-primary font-mono">
          <Mic className="w-6 h-6" />
          <span>COSMIC COACH</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <Button variant="ghost" className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Pricing
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" className="font-mono text-xs uppercase tracking-widest">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button className="font-mono text-xs uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground shadow-[0_0_15px_rgba(0,102,255,0.3)]">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-28 px-6 text-center max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs font-mono text-primary uppercase tracking-widest mb-8">
            <Zap className="w-3 h-3" />
            AI Speech Coaching · 5 Parallel Analysis Calls
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
            <span className="text-foreground">Turn Every Speech</span>
            <br />
            <span className="text-primary">Into Your Best.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload a video or paste a link. In 60 seconds, get a full AI breakdown — filler words, persuasion score,
            audience simulation, impact timeline, and a coaching verdict that actually moves the needle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button className="h-12 px-8 font-mono text-sm uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(0,102,255,0.4)] transition-all">
                Start Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="h-12 px-8 font-mono text-sm uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10">
                See Pricing
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/60 font-mono mt-4">
            Free to start · No credit card required · 7-day Pro trial
          </p>
        </motion.div>

        {/* Mock score card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 relative"
        >
          <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-3xl" />
          <div className="relative rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(0,102,255,0.1)] text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Live Analysis Preview</span>
              <div className="ml-auto px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">READY</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Overall Score", value: "84", unit: "/100", color: "text-primary" },
                { label: "Confidence", value: "78", unit: "/100", color: "text-secondary" },
                { label: "Filler Words", value: "3", unit: "detected", color: "text-amber-400" },
                { label: "Pace", value: "142", unit: "wpm", color: "text-emerald-400" },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-background/50 rounded-lg p-3 border border-border/30">
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">{label}</div>
                  <div className={`text-2xl font-black ${color}`}>{value}<span className="text-xs text-muted-foreground font-normal ml-1">{unit}</span></div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-foreground">
            Everything your coach can't tell you.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            AI runs 5 analyses simultaneously so you get the full picture in under 60 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color, glow }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/30 transition-all ${glow} hover:scale-[1.02]`}
            >
              <div className={`w-10 h-10 rounded-lg bg-background/80 border border-border/40 flex items-center justify-center mb-4 ${glow}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Real results. Real speakers.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, text, stars }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-6"
            >
              <div className="flex gap-0.5 mb-3">
                {Array(stars).fill(0).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{text}"</p>
              <div>
                <div className="text-sm font-semibold text-foreground">{name}</div>
                <div className="text-xs text-muted-foreground font-mono">{role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 text-center max-w-3xl mx-auto">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl p-12">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Your next speech starts here.
          </h2>
          <p className="text-muted-foreground mb-8">
            Free to start. 7-day Pro trial. Cancel any time.
          </p>
          <Link href="/sign-up">
            <Button className="h-12 px-10 font-mono text-sm uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(0,102,255,0.4)]">
              Start Free Today <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground/60 mb-2">
          <Mic className="w-3.5 h-3.5" />
          COSMIC COACH · AI Speech Intelligence
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/40 font-mono">
          <Link href="/pricing" className="hover:text-muted-foreground transition-colors">Pricing</Link>
          <Link href="/sign-in" className="hover:text-muted-foreground transition-colors">Sign In</Link>
          <Link href="/sign-up" className="hover:text-muted-foreground transition-colors">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}
