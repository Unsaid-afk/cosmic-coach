import {
  useGetSession,
  useGetAnalysis,
  useGetWaveform,
  useGetTranscript,
  useGetPersuasionAnalysis,
  useGetAudienceSimulation,
  useGetImpactTimeline,
  useGetDetailedAnalysis,
  getGetSessionQueryKey,
  getGetAnalysisQueryKey,
  getGetWaveformQueryKey,
  getGetTranscriptQueryKey,
  getGetPersuasionAnalysisQueryKey,
  getGetAudienceSimulationQueryKey,
  getGetImpactTimelineQueryKey,
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, ReferenceDot,
} from "recharts";
import {
  Activity, Eye, Mic, Brain, ShieldAlert, Target, Users,
  Zap, Clock, MessageSquare, Loader2, AlertTriangle,
  CheckCircle, Sparkles, ChevronDown, ChevronUp, BookOpen,
  TrendingUp, Hash, Megaphone, Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function ProcessingView({ session }: { session: { title: string; speakerName: string; status: string; errorMessage?: string } }) {
  const isFailed = session.status === "failed";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {isFailed ? (
          <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
        ) : (
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-foreground mb-2">{session.title}</h1>
        <div className="text-sm text-muted-foreground font-mono mb-6">{session.speakerName}</div>

        {isFailed ? (
          <>
            <div className="text-destructive font-semibold mb-2">Analysis Failed</div>
            <div className="text-sm text-muted-foreground">{session.errorMessage || "An error occurred during processing."}</div>
          </>
        ) : (
          <>
            <div className="text-primary font-mono uppercase tracking-wider text-sm mb-6">AI Analysis In Progress</div>

            <div className="space-y-3 text-left">
              {[
                { label: "Transcribing audio with Whisper", icon: Mic },
                { label: "Detecting filler words & pacing", icon: Activity },
                { label: "Analyzing persuasion structure", icon: ShieldAlert },
                { label: "Generating audience personas", icon: Users },
                { label: "Computing impact timeline", icon: Target },
              ].map(({ label, icon: Icon }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-3 h-3 text-primary" />
                  </div>
                  <span>{label}</span>
                  <Loader2 className="w-3 h-3 text-primary/50 animate-spin ml-auto" />
                </motion.div>
              ))}
            </div>

            <div className="mt-6 text-xs text-muted-foreground/60 font-mono">
              This page refreshes automatically. Processing typically takes 30–90 seconds.
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session, isLoading: isSessionLoading } = useGetSession(id || "", {
    query: { enabled: !!id, queryKey: getGetSessionQueryKey(id || "") },
  });

  const isReady = session?.status === "ready";
  const isProcessing = session?.status === "processing";

  // Poll for status when processing
  useEffect(() => {
    if (!id) return;
    if (isProcessing) {
      pollingRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
      }, 4000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (isReady) {
        // Refresh analysis data once ready
        queryClient.invalidateQueries({ queryKey: getGetAnalysisQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetWaveformQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetTranscriptQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetPersuasionAnalysisQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetAudienceSimulationQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetImpactTimelineQueryKey(id) });
      }
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id, isProcessing, isReady, queryClient]);

  const { data: analysis, isLoading: isAnalysisLoading } = useGetAnalysis(id || "", {
    query: { enabled: !!id && isReady },
  });
  const { data: waveform } = useGetWaveform(id || "", { query: { enabled: !!id && isReady } });
  const { data: transcript } = useGetTranscript(id || "", { query: { enabled: !!id && isReady } });
  const { data: persuasion } = useGetPersuasionAnalysis(id || "", { query: { enabled: !!id && isReady } });
  const { data: audience } = useGetAudienceSimulation(id || "", { query: { enabled: !!id && isReady } });
  const { data: impact } = useGetImpactTimeline(id || "", { query: { enabled: !!id && isReady } });
  const [showDetails, setShowDetails] = useState(false);
  const { data: detailed, isLoading: isDetailedLoading } = useGetDetailedAnalysis(id || "", { query: { enabled: !!id && isReady && showDetails } });

  if (isSessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 bg-card" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-card" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-[400px] bg-card col-span-2" />
          <Skeleton className="h-[400px] bg-card" />
        </div>
      </div>
    );
  }

  if (!session) return <div className="p-8 text-muted-foreground">Session not found</div>;

  if (session.status !== "ready") {
    return <ProcessingView session={session as { title: string; speakerName: string; status: string; errorMessage?: string }} />;
  }

  if (isAnalysisLoading || !analysis) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="font-mono text-sm">Loading analysis data...</span>
      </div>
    );
  }

  const durationMin = Math.floor(session.duration / 60);
  const durationSec = Math.floor(session.duration % 60);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* HEADER */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{session.title}</h1>
            <Badge variant="outline" className="font-mono uppercase text-[10px] tracking-wider bg-primary/10 text-primary border-primary/30">
              {session.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> {session.speakerName}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {durationMin}:{durationSec.toString().padStart(2, "0")}</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-secondary" /> {session.energyLevel}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Overall Score</div>
            <div className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(0,102,255,0.5)]">
              {Math.round(session.overallScore)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* METRICS RINGS */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Eye Contact", score: Math.round(analysis.eyeContactScore), icon: Eye, color: "text-primary" },
          { label: "Confidence", score: Math.round(analysis.confidenceScore), icon: Brain, color: "text-secondary" },
          { label: "Structure", score: Math.round(analysis.structureScore), icon: Target, color: "text-chart-3" },
          { label: "Pace (WPM)", score: Math.round(analysis.speechPaceWpm), max: 200, icon: Activity, color: "text-chart-4" },
        ].map((m, i) => {
          const percentage = m.max ? Math.min((m.score / m.max) * 100, 100) : m.score;
          const strokeDasharray = `${percentage} 100`;
          return (
            <Card key={i} className="bg-card/40 border-border/40 backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted/30" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none" className={`stroke-current ${m.color}`} strokeWidth="3" strokeDasharray={strokeDasharray} strokeLinecap="round" />
                  </svg>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">{m.label}</div>
                  <div className="text-xl font-bold text-foreground">{m.score}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* STRENGTHS & IMPROVEMENTS */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/40 border-primary/10 backdrop-blur-md">
          <CardContent className="p-4 space-y-2">
            <div className="text-[10px] uppercase font-mono tracking-wider text-primary flex items-center gap-1.5 mb-3">
              <CheckCircle className="w-3 h-3" /> Top Strengths
            </div>
            {analysis.topStrengths.map((s, i) => (
              <div key={i} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-primary/40 font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-chart-3/10 backdrop-blur-md">
          <CardContent className="p-4 space-y-2">
            <div className="text-[10px] uppercase font-mono tracking-wider text-chart-3 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3 h-3" /> Key Improvements
            </div>
            {analysis.topImprovements.map((s, i) => (
              <div key={i} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-chart-3/40 font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* VIBE MONITOR & IMPACT TIMELINE */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">

          <Card className="bg-card/40 border-border/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Vibe Monitor — Energy & Clarity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[200px] w-full pr-4">
                {waveform && waveform.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waveform}>
                      <defs>
                        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <filter id="neonGlow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={[0, 1]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 12 }}
                        labelFormatter={(v) => `${v}s`}
                        formatter={(v: number, name: string) => [`${(v * 100).toFixed(0)}%`, name === "energy" ? "Energy" : "Clarity"]}
                      />
                      <Area type="monotone" dataKey="energy" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#energyGrad)" filter="url(#neonGlow)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="clarity" stroke="hsl(var(--secondary))" fillOpacity={0} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No waveform data</div>
                )}
              </div>
              <div className="flex justify-center gap-6 pb-3 pt-1 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Energy</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary" /> Clarity</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-chart-3" /> Impact Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[200px] w-full pr-4">
                {impact && impact.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={impact}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 12 }}
                        labelFormatter={(v) => `${v}s`}
                        formatter={(v: number) => [`${v}`, "Impact"]}
                      />
                      <Line type="monotone" dataKey="impactScore" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                      {impact.filter((p) => p.isPhoneCheckMoment).map((p, i) => (
                        <ReferenceDot key={`phone-${i}`} x={p.time} y={p.impactScore} r={4} fill="hsl(var(--destructive))" stroke="none" />
                      ))}
                      {impact.filter((p) => p.isGoldenMoment).map((p, i) => (
                        <ReferenceDot key={`gold-${i}`} x={p.time} y={p.impactScore} r={6} fill="hsl(var(--chart-3))" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No impact data</div>
                )}
              </div>
              <div className="flex justify-center gap-6 pb-3 pt-1 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-chart-3" /> Golden Moment</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive" /> Audience Lost</span>
              </div>
            </CardContent>
          </Card>

        </motion.div>

        {/* TRANSCRIPT */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="bg-card/40 border-border/40 backdrop-blur-md h-full flex flex-col" style={{ maxHeight: 500 }}>
            <CardHeader className="border-b border-border/30 pb-3 shrink-0">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Transcript</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">{analysis.fillerWordCount} Fillers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed space-y-1">
              {transcript && transcript.length > 0 ? transcript.map((seg) => {
                if (seg.isFillerWord) {
                  return (
                    <span key={seg.id} className="animate-smoke-out text-muted-foreground/40 line-through mx-0.5 text-xs" title={`Filler word: ${seg.fillerType ?? seg.text}`}>
                      {seg.text}
                    </span>
                  );
                }
                if (seg.isGoldenMoment) {
                  return (
                    <span key={seg.id} className="text-chart-3 bg-chart-3/10 px-1 py-0.5 rounded border border-chart-3/30 mx-0.5 shadow-[0_0_8px_rgba(255,170,0,0.15)] inline">
                      {seg.text}
                    </span>
                  );
                }
                return <span key={seg.id} className="text-foreground/85 mx-0.5">{seg.text}</span>;
              }) : (
                <div className="text-muted-foreground text-sm italic">No transcript data available.</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* PERSUASION STACK & AUDIENCE SIMULATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PERSUASION */}
        <motion.div variants={item}>
          <Card className="bg-card/40 border-border/40 backdrop-blur-md h-full">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-secondary" /> Persuasion Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {persuasion ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground font-mono mb-1">PAS Framework Score</div>
                      <div className="text-3xl font-bold text-foreground">{persuasion.pasScore}<span className="text-muted-foreground text-base">/100</span></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <Badge variant="outline" className={persuasion.hasProblemStatement ? "bg-primary/20 text-primary border-primary/50" : "opacity-30 text-muted-foreground"}>Problem</Badge>
                      <Badge variant="outline" className={persuasion.hasAgitation ? "bg-secondary/20 text-secondary border-secondary/50" : "opacity-30 text-muted-foreground"}>Agitation</Badge>
                      <Badge variant="outline" className={persuasion.hasSolution ? "bg-chart-3/20 text-chart-3 border-chart-3/50" : "opacity-30 text-muted-foreground"}>Solution</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-background/50 rounded border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-semibold text-foreground">Rule of Three</div>
                      <Badge variant="secondary" className="font-mono text-[10px]">{persuasion.ruleOfThreeCount} Detected</Badge>
                    </div>
                    {persuasion.ruleOfThreeExamples.length > 0 ? persuasion.ruleOfThreeExamples.map((ex, i) => (
                      <div key={i} className="text-xs text-muted-foreground italic border-l-2 border-secondary/50 pl-2 mt-1">"{ex}"</div>
                    )) : (
                      <div className="text-xs text-muted-foreground/60 italic">None detected in this speech</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className={persuasion.hasStorytelling ? "bg-chart-4/20 text-chart-4 border-chart-4/50" : "opacity-30"}>
                      {persuasion.hasStorytelling ? "Storytelling Detected" : "No Storytelling"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {persuasion.persuasionAlerts.map((alert) => (
                      <div key={alert.id} className={`p-3 rounded border text-sm flex gap-3 ${
                        alert.severity === "critical" ? "bg-destructive/10 border-destructive/50 text-destructive"
                          : alert.severity === "warning" ? "bg-chart-3/10 border-chart-3/50 text-chart-3"
                          : "bg-primary/10 border-primary/30 text-primary"
                      }`}>
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div>{alert.message}</div>
                          {alert.timestamp != null && (
                            <div className="text-[10px] mt-1 opacity-60 font-mono">at {Math.floor(alert.timestamp / 60)}:{String(alert.timestamp % 60).padStart(2, "0")}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-sm italic">No persuasion data available.</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AUDIENCE SIMULATION */}
        <motion.div variants={item}>
          <Card className="bg-card/40 border-border/40 backdrop-blur-md h-full">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-chart-4" /> Audience Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {audience && audience.length > 0 ? audience.map((persona) => (
                <div key={persona.id} className="p-4 bg-background/40 rounded-lg border border-border/50 relative overflow-hidden">
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                    persona.overallReaction === "engaged" || persona.overallReaction === "impressed" ? "bg-chart-4"
                      : persona.overallReaction === "lost" || persona.overallReaction === "skeptical" ? "bg-destructive"
                      : "bg-muted"
                  }`} />
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-card flex items-center justify-center border border-border/50">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">{persona.name}</div>
                        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{persona.role.replace("_", " ")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-muted-foreground">Retention</div>
                        <div className="text-sm font-bold text-foreground">{Math.round(persona.retentionScore)}%</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">{persona.overallReaction}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {persona.feedbackItems.slice(0, 2).map((fb, i) => (
                      <div key={i} className={`text-xs p-2 rounded border italic ${
                        fb.sentiment === "positive" ? "bg-chart-4/5 border-chart-4/20 text-foreground/80"
                          : fb.sentiment === "negative" ? "bg-destructive/5 border-destructive/20 text-foreground/80"
                          : "bg-card/50 border-border/30 text-muted-foreground"
                      }`}>
                        <span className="not-italic font-mono text-muted-foreground/50 mr-1">{Math.floor(fb.timestamp / 60)}:{String(fb.timestamp % 60).padStart(2, "0")}</span>
                        "{fb.comment}"
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-muted-foreground text-sm italic">No audience simulation data.</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* MORE DETAILS TOGGLE */}
      <motion.div variants={item} className="flex justify-center pt-2">
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/60 bg-card/40 backdrop-blur-md text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <BookOpen className="w-4 h-4" />
          {showDetails ? "Hide" : "Show"} Detailed Breakdown
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </motion.div>

      {/* DETAILED BREAKDOWN PANEL */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {isDetailedLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-mono text-sm">Generating detailed breakdown…</span>
            </div>
          ) : detailed ? (
            <>
              {/* OVERALL VERDICT */}
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/5 border-primary/20 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-widest text-primary mb-2">Overall Coaching Verdict</div>
                      <p className="text-sm text-foreground/90 leading-relaxed">{detailed.overallVerdict}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PER-METRIC CARDS */}
              <div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Metric Deep Dive
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailed.metrics.map((m) => {
                    const ratingColors = {
                      excellent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
                      good: "text-primary bg-primary/10 border-primary/30",
                      fair: "text-chart-3 bg-chart-3/10 border-chart-3/30",
                      poor: "text-destructive bg-destructive/10 border-destructive/30",
                    };
                    const barColors = {
                      excellent: "bg-emerald-400",
                      good: "bg-primary",
                      fair: "bg-chart-3",
                      poor: "bg-destructive",
                    };
                    const displayScore = m.score > 200 ? m.score : m.score; // WPM can be >100
                    const barWidth = m.score > 200 ? Math.min(100, (m.score / 250) * 100) : m.score;
                    return (
                      <Card key={m.metric} className="bg-card/40 border-border/40 backdrop-blur-md">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold text-sm text-foreground">{m.metric}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-foreground">{Math.round(displayScore)}</span>
                              <Badge variant="outline" className={`text-[10px] font-mono uppercase ${ratingColors[m.rating]}`}>
                                {m.rating}
                              </Badge>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted/30 rounded-full mb-4 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColors[m.rating]}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="space-y-2.5">
                            <div>
                              <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">Why this score</div>
                              <p className="text-xs text-foreground/80 leading-relaxed">{m.reason}</p>
                            </div>
                            <div className="p-2.5 rounded bg-primary/5 border border-primary/15">
                              <div className="text-[10px] uppercase font-mono tracking-wider text-primary mb-1">Coaching Tip</div>
                              <p className="text-xs text-foreground/80 leading-relaxed">{m.tip}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* FILLER BREAKDOWN + PACING */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {detailed.fillerBreakdown.length > 0 && (
                  <Card className="bg-card/40 border-border/40 backdrop-blur-md">
                    <CardHeader className="border-b border-border/30 pb-3">
                      <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Hash className="w-4 h-4 text-destructive" /> Filler Word Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {detailed.fillerBreakdown.map((f) => (
                        <div key={f.word} className="p-3 rounded bg-destructive/5 border border-destructive/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm font-bold text-destructive">"{f.word}"</span>
                            <Badge variant="outline" className="text-[10px] font-mono bg-destructive/10 text-destructive border-destructive/30">
                              ×{f.count}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/70 leading-relaxed">{f.impact}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-card/40 border-border/40 backdrop-blur-md">
                  <CardHeader className="border-b border-border/30 pb-3">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-secondary" /> Pacing & Rhythm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <p className="text-sm text-foreground/85 leading-relaxed">{detailed.pacingAnalysis}</p>
                  </CardContent>
                </Card>
              </div>

              {/* OPENING & CLOSING */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/40 border-primary/10 backdrop-blur-md">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-primary flex items-center gap-1.5 mb-3">
                      <Zap className="w-3 h-3" /> Opening Strength
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{detailed.openingStrength}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/40 border-chart-3/10 backdrop-blur-md">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-chart-3 flex items-center gap-1.5 mb-3">
                      <Target className="w-3 h-3" /> Closing Strength
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{detailed.closingStrength}</p>
                  </CardContent>
                </Card>
              </div>

              {/* KEY THEMES + VOCABULARY + CTA */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="bg-card/40 border-border/40 backdrop-blur-md">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Brain className="w-3 h-3" /> Key Themes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailed.keyThemes.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/40 backdrop-blur-md">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                      <BookOpen className="w-3 h-3" /> Vocabulary Complexity
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-sm px-3 py-1 ${
                        detailed.vocabularyComplexity === "advanced"
                          ? "bg-secondary/20 text-secondary border-secondary/40"
                          : detailed.vocabularyComplexity === "moderate"
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {detailed.vocabularyComplexity.charAt(0).toUpperCase() + detailed.vocabularyComplexity.slice(1)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {detailed.vocabularyComplexity === "advanced" ? "Expert-level language — ensure your audience matches."
                        : detailed.vocabularyComplexity === "moderate" ? "Balanced vocabulary — accessible to most audiences."
                        : "Simple, clear language — great for broad audiences."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/40 backdrop-blur-md">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Megaphone className="w-3 h-3" /> Call to Action
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] mb-2 ${detailed.callToActionPresent ? "bg-chart-3/20 text-chart-3 border-chart-3/40" : "bg-muted/20 text-muted-foreground border-border"}`}
                    >
                      {detailed.callToActionPresent ? "CTA Detected" : "No CTA"}
                    </Badge>
                    <p className="text-xs text-foreground/80 leading-relaxed">{detailed.callToActionStrength}</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </motion.div>
      )}

    </motion.div>
  );
}
