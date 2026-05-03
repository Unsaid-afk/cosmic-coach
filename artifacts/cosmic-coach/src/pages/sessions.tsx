import { useListSessions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Mic, Clock, Calendar, Activity } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function Sessions() {
  const { data: sessions, isLoading } = useListSessions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 bg-card mb-6" />
        <div className="grid gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 bg-card" />)}
        </div>
      </div>
    );
  }

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'electric': return 'bg-primary/20 text-primary border-primary/50';
      case 'high': return 'bg-secondary/20 text-secondary border-secondary/50';
      case 'medium': return 'bg-chart-3/20 text-chart-3 border-chart-3/50';
      case 'low': return 'bg-muted text-muted-foreground border-muted-foreground/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex justify-between items-center">
        <motion.h1 variants={item} className="text-3xl font-bold tracking-tight text-primary uppercase font-mono">
          Analysis Log
        </motion.h1>
        <motion.div variants={item}>
          <Link href="/sessions/new" className="px-4 py-2 bg-primary/10 text-primary border border-primary/50 rounded hover:bg-primary/20 transition-colors uppercase font-mono text-sm tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,102,255,0.3)]">
            <Mic className="w-4 h-4" />
            New Session
          </Link>
        </motion.div>
      </div>

      <div className="grid gap-4">
        {sessions?.map((session) => (
          <motion.div key={session.id} variants={item}>
            <Link href={`/sessions/${session.id}`}>
              <Card className="bg-card/40 border-border/40 backdrop-blur-sm hover:bg-card hover:border-primary/50 transition-all cursor-pointer group overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground truncate">{session.title}</h3>
                      {session.status === 'processing' && (
                        <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/50 text-[10px] uppercase animate-pulse">Processing</Badge>
                      )}
                      {session.status === 'failed' && (
                        <Badge variant="destructive" className="text-[10px] uppercase">Failed</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        {session.speakerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(session.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-auto w-full md:w-auto justify-between md:justify-end">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Energy</span>
                      <Badge variant="outline" className={`${getEnergyColor(session.energyLevel)} text-[10px] uppercase font-mono mt-1`}>
                        <Activity className="w-3 h-3 mr-1" />
                        {session.energyLevel}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-primary/20 group-hover:border-primary/60 group-hover:shadow-[0_0_20px_rgba(0,102,255,0.2)] transition-all bg-background relative overflow-hidden">
                      <span className="text-xl font-bold font-mono text-foreground z-10">{session.overallScore}</span>
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-primary/20 z-0 transition-all duration-1000"
                        style={{ height: `${session.overallScore}%` }}
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
        {sessions?.length === 0 && (
          <div className="text-center py-20 bg-card/20 rounded-lg border border-dashed border-border">
            <Mic className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-mono text-muted-foreground uppercase tracking-wider">No Transmissions Found</h3>
            <p className="text-sm text-muted-foreground mt-2">Initialize your first coaching session to begin analysis.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}