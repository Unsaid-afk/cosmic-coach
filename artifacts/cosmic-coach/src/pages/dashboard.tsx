import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, Trophy, Zap, TrendingUp, Presentation, Mic, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-card" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 bg-card" />
          <Skeleton className="h-32 bg-card" />
          <Skeleton className="h-32 bg-card" />
          <Skeleton className="h-32 bg-card" />
        </div>
        <Skeleton className="h-[400px] bg-card" />
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-glow-pulse">
            <Mic className="w-12 h-12 text-primary/60" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-secondary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Welcome to Mission Control</h1>
        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          This is where your speech coaching journey begins. Upload a recording or paste a video link to get your first AI-powered analysis.
        </p>
        <Link href="/sessions/new">
          <Button className="h-12 px-8 font-mono text-sm uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(0,102,255,0.4)] transition-all">
            <Zap className="mr-2 w-4 h-4" /> Start Your First Session <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
        <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground/50 font-mono">
          <span>Upload a file</span>
          <span className="text-muted-foreground/20">|</span>
          <span>Paste a YouTube link</span>
          <span className="text-muted-foreground/20">|</span>
          <span>Results in 60s</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary uppercase font-mono">Mission Control</h1>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-card/50 border-primary/20 backdrop-blur-xl hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <Presentation className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-secondary/20 backdrop-blur-xl hover:border-secondary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Score</CardTitle>
            <Activity className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.averageScore.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-chart-3/20 backdrop-blur-xl hover:border-chart-3/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fillers Eliminated</CardTitle>
            <Zap className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalFillerWordsEliminated}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-chart-4/20 backdrop-blur-xl hover:border-chart-4/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most Improved</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground capitalize">{stats.mostImprovedMetric.replace(/([A-Z])/g, ' $1').trim()}</div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="bg-card/50 border-border/50 backdrop-blur-xl h-full">
            <CardHeader>
              <CardTitle className="text-lg font-mono uppercase text-muted-foreground tracking-wider">Score Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.scoreProgression}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#scoreGradient)" 
                      filter="url(#glow)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          {stats.bestSession && (
            <Card className="bg-card/50 border-chart-3/50 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-chart-3/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-chart-3">
                  <Trophy className="h-5 w-5" />
                  <CardTitle className="text-sm font-mono uppercase tracking-wider">Best Session</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-xl mb-1 truncate">{stats.bestSession.title}</div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{stats.bestSession.speakerName}</span>
                  <span className="text-chart-3 font-mono font-bold bg-chart-3/10 px-2 py-1 rounded">Score: {stats.bestSession.overallScore}</span>
                </div>
                <Link href={`/sessions/${stats.bestSession.id}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View Best Session</span>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card/50 border-border/50 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase text-muted-foreground tracking-wider">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.recentSessions.slice(0, 3).map(session => (
                <div key={session.id} className="flex justify-between items-center group">
                  <div className="overflow-hidden">
                    <Link href={`/sessions/${session.id}`} className="font-medium text-foreground hover:text-primary transition-colors truncate block">
                      {session.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{new Date(session.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center text-xs font-mono text-primary group-hover:bg-primary/10 transition-colors">
                      {session.overallScore}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}