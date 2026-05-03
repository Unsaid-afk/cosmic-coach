import { 
  useGetSession, 
  useGetAnalysis, 
  useGetWaveform, 
  useGetTranscript, 
  useGetPersuasionAnalysis, 
  useGetAudienceSimulation, 
  useGetImpactTimeline 
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceDot } from "recharts";
import { Activity, Eye, Mic, Brain, ShieldAlert, Target, Users, Zap, Clock, Smartphone, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const [playbackTime, setPlaybackTime] = useState(0);

  const { data: session, isLoading: isSessionLoading } = useGetSession(id || "", { query: { enabled: !!id } });
  const { data: analysis, isLoading: isAnalysisLoading } = useGetAnalysis(id || "", { query: { enabled: !!id } });
  const { data: waveform } = useGetWaveform(id || "", { query: { enabled: !!id } });
  const { data: transcript } = useGetTranscript(id || "", { query: { enabled: !!id } });
  const { data: persuasion } = useGetPersuasionAnalysis(id || "", { query: { enabled: !!id } });
  const { data: audience } = useGetAudienceSimulation(id || "", { query: { enabled: !!id } });
  const { data: impact } = useGetImpactTimeline(id || "", { query: { enabled: !!id } });

  const isLoading = isSessionLoading || isAnalysisLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 bg-card" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[200px] bg-card col-span-2" />
          <Skeleton className="h-[200px] bg-card" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] bg-card" />
          <Skeleton className="h-[400px] bg-card" />
        </div>
      </div>
    );
  }

  if (!session || !analysis) return <div>Session not found</div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      
      {/* HEADER */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-sans">{session.title}</h1>
            <Badge variant="outline" className="font-mono uppercase text-[10px] tracking-wider bg-primary/10 text-primary border-primary/30">
              {session.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> {session.speakerName}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(session.duration/60)}:{(session.duration%60).toString().padStart(2,'0')}</span>
            <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-secondary" /> {session.energyLevel}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Overall Score</div>
            <div className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(0,102,255,0.5)]">
              {session.overallScore}
            </div>
          </div>
        </div>
      </motion.div>

      {/* METRICS RINGS */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Eye Contact", score: analysis.eyeContactScore, icon: Eye, color: "text-primary" },
          { label: "Confidence", score: analysis.confidenceScore, icon: Brain, color: "text-secondary" },
          { label: "Structure", score: analysis.structureScore, icon: Target, color: "text-chart-3" },
          { label: "Pace (WPM)", score: analysis.speechPaceWpm, max: 200, icon: Activity, color: "text-chart-4" }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VIBE MONITOR & TIMELINE */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          
          <Card className="bg-card/40 border-border/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Vibe Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="h-[200px] w-full pr-4">
                {waveform && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waveform}>
                      <defs>
                        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <filter id="neonGlow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        labelFormatter={(v) => `${v}s`}
                      />
                      <Area type="monotone" dataKey="energy" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#energyGrad)" filter="url(#neonGlow)" strokeWidth={2} />
                      <Area type="monotone" dataKey="clarity" stroke="hsl(var(--secondary))" fillOpacity={0} strokeWidth={1} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-chart-3" /> Impact & Audience Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="h-[200px] w-full pr-4">
                {impact && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={impact}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Line type="step" dataKey="impactScore" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                      {impact.filter(p => p.isPhoneCheckMoment).map((p, i) => (
                        <ReferenceDot key={`phone-${i}`} x={p.time} y={p.impactScore} r={4} fill="hsl(var(--destructive))" stroke="none" />
                      ))}
                      {impact.filter(p => p.isGoldenMoment).map((p, i) => (
                        <ReferenceDot key={`gold-${i}`} x={p.time} y={p.impactScore} r={6} fill="hsl(var(--chart-3))" stroke="none" />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex justify-center gap-6 pb-4 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-chart-3" /> Golden Moment</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive" /> Audience Lost</span>
              </div>
            </CardContent>
          </Card>

        </motion.div>

        {/* TRANSCRIPT */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="bg-card/40 border-border/40 backdrop-blur-md h-full flex flex-col max-h-[600px]">
            <CardHeader className="border-b border-border/30 pb-3 shrink-0">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-muted-foreground" /> Transcript Analysis</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">{analysis.fillerWordCount} Fillers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-sm leading-relaxed">
              {transcript?.map((segment) => {
                if (segment.isFillerWord) {
                  return (
                    <span key={segment.id} className="animate-smoke-out text-muted-foreground/50 mx-1">
                      {segment.text}
                    </span>
                  );
                }
                if (segment.isGoldenMoment) {
                  return (
                    <span key={segment.id} className="text-chart-3 bg-chart-3/10 px-1 rounded border border-chart-3/30 mx-1 relative inline-block shadow-[0_0_10px_rgba(255,170,0,0.2)]">
                      {segment.text}
                    </span>
                  );
                }
                return <span key={segment.id} className="text-foreground/90 mx-1">{segment.text}</span>;
              })}
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
            <CardContent className="p-6 space-y-6">
              {persuasion && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground font-mono mb-1">PAS Framework Score</div>
                      <div className="text-3xl font-bold text-foreground">{persuasion.pasScore}<span className="text-muted-foreground text-lg">/100</span></div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={persuasion.hasProblemStatement ? "bg-primary/20 text-primary border-primary/50" : "opacity-30"}>Problem</Badge>
                      <Badge variant="outline" className={persuasion.hasAgitation ? "bg-secondary/20 text-secondary border-secondary/50" : "opacity-30"}>Agitation</Badge>
                      <Badge variant="outline" className={persuasion.hasSolution ? "bg-chart-3/20 text-chart-3 border-chart-3/50" : "opacity-30"}>Solution</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 bg-background/50 rounded border border-border">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-bold text-foreground">Rule of Three</div>
                        <Badge variant="secondary" className="font-mono">{persuasion.ruleOfThreeCount} Detected</Badge>
                      </div>
                      {persuasion.ruleOfThreeExamples.map((ex, i) => (
                        <div key={i} className="text-xs text-muted-foreground italic border-l-2 border-secondary/50 pl-2 mt-1">{ex}</div>
                      ))}
                    </div>
                    
                    {persuasion.persuasionAlerts.map(alert => (
                      <div key={alert.id} className={`p-3 rounded border text-sm flex gap-3 ${alert.severity === 'critical' ? 'bg-destructive/10 border-destructive/50 text-destructive' : 'bg-chart-3/10 border-chart-3/50 text-chart-3'}`}>
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{alert.message}</div>
                      </div>
                    ))}
                  </div>
                </>
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
              {audience?.map(persona => (
                <div key={persona.id} className="p-4 bg-background/40 rounded-lg border border-border/50 relative overflow-hidden">
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                    persona.overallReaction === 'engaged' || persona.overallReaction === 'impressed' ? 'bg-chart-4' : 
                    persona.overallReaction === 'lost' || persona.overallReaction === 'skeptical' ? 'bg-destructive' : 'bg-muted'
                  }`} />
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-card flex items-center justify-center border border-border/50">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">{persona.name}</div>
                        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{persona.role.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">{persona.overallReaction}</Badge>
                  </div>
                  
                  {persona.feedbackItems.length > 0 && (
                    <div className="text-sm text-muted-foreground bg-card/50 p-2 rounded italic border border-border/30">
                      "{persona.feedbackItems[0].comment}"
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

      </div>

    </motion.div>
  );
}