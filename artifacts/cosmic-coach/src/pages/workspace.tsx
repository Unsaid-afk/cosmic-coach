import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Users, Key, Plus, ShieldCheck, Mail, Calendar, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  userId: string;
  role: string;
  email: string | null;
  createdAt: string;
}

interface TeamSession {
  id: string;
  title: string;
  speakerName: string;
  overallScore: number;
  duration: number;
  createdAt: string;
}

interface TeamData {
  team?: {
    teamId: number;
    teamName: string;
    role: string;
    joinCode: string;
  };
  members: TeamMember[];
  sessions: TeamSession[];
}

export default function Workspace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const { data, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/teams/me"],
    queryFn: async () => {
      return customFetch<TeamData>("/api/teams/me");
    }
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return customFetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me"] });
      toast({ title: "Team created successfully" });
      setCreateName("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      return customFetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me"] });
      toast({ title: "Joined team successfully" });
      setJoinCode("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return customFetch<{ previewUrl?: string }>("/api/teams/invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: (data) => {
      toast({ 
        title: "Invite Sent!", 
        description: "The email has been sent successfully." 
      });
      // In development with Ethereal, open the preview URL automatically
      if (data.previewUrl) {
        window.open(data.previewUrl, "_blank");
      }
      setInviteEmail("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  if (isLoading) return <div className="p-8 font-mono text-muted-foreground animate-pulse">Loading workspace...</div>;

  const { team, members, sessions } = data || { members: [], sessions: [] };

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto pt-10 px-6 space-y-8 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Team Workspace</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Enterprise Multi-Role Infrastructure</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card/40 backdrop-blur-md border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Create a Team</CardTitle>
              <CardDescription>Create a new workspace as a Manager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Team Name (e.g. Acme Sales)" 
                value={createName} 
                onChange={(e) => setCreateName(e.target.value)} 
                className="font-mono bg-background"
              />
              <Button 
                onClick={() => createMutation.mutate(createName)} 
                disabled={!createName || createMutation.isPending}
                className="w-full font-mono text-xs uppercase tracking-widest"
              >
                {createMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Join a Team</CardTitle>
              <CardDescription>Join an existing workspace as a Rep</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="8-Character Join Code" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
                className="font-mono bg-background uppercase"
                maxLength={8}
              />
              <Button 
                variant="secondary"
                onClick={() => joinMutation.mutate(joinCode)} 
                disabled={joinCode.length !== 8 || joinMutation.isPending}
                className="w-full font-mono text-xs uppercase tracking-widest"
              >
                {joinMutation.isPending ? "Joining..." : "Join Team"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pt-10 px-6 space-y-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center gap-3">
            {team.teamName}
            {team.role === "manager" ? (
              <Badge variant="outline" className="font-mono uppercase text-[10px] bg-primary/10 text-primary border-primary/30"><ShieldCheck className="w-3 h-3 mr-1" /> Manager</Badge>
            ) : (
              <Badge variant="outline" className="font-mono uppercase text-[10px] bg-secondary/10 text-secondary border-secondary/30"><Users className="w-3 h-3 mr-1" /> Rep</Badge>
            )}
          </h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Workspace Overview</p>
        </div>
        {team.role === "manager" && (
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground mb-1">Team Join Code</div>
            <div className="text-2xl font-black font-mono text-primary bg-primary/10 px-4 py-1 rounded border border-primary/20 tracking-[0.2em]">{team.joinCode}</div>
          </div>
        )}
      </motion.div>

      {team.role === "manager" && (
        <Card className="bg-card/40 backdrop-blur-md border-primary/20 mb-6 max-w-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Invite Team Member</CardTitle>
            <CardDescription>Send an email invitation directly to a rep</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input 
              placeholder="rep@example.com" 
              type="email"
              value={inviteEmail} 
              onChange={(e) => setInviteEmail(e.target.value)} 
              className="font-mono bg-background"
            />
            <Button 
              onClick={() => inviteMutation.mutate(inviteEmail)} 
              disabled={!inviteEmail || inviteMutation.isPending}
              className="font-mono text-xs uppercase tracking-widest shrink-0"
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold border-b border-border/50 pb-2">Recent Team Sessions</h2>
          {sessions.length === 0 ? (
            <div className="p-8 border border-dashed border-border/50 rounded text-center text-muted-foreground font-mono text-sm">
              No sessions have been recorded in this workspace yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="p-4 bg-card/40 border border-border/40 rounded-lg flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer" onClick={() => window.location.href=`/sessions/${s.id}`}>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary" /> {s.title}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-1 flex gap-3">
                      <span>Rep: {s.speakerName}</span>
                      <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground">{Math.round(s.overallScore)}</div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-widest">Score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {team.role === "manager" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-border/50 pb-2">Team Roster</h2>
            <div className="space-y-3">
              {members.map(m => (
                <div key={m.userId} className="p-3 bg-card/20 border border-border/40 rounded-lg flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm break-all"><Mail className="w-3 h-3 inline mr-1 text-muted-foreground" /> {m.email || "Unknown User"}</span>
                    {m.role === "manager" ? <Badge variant="outline" className="text-[9px] uppercase font-mono border-primary/30 text-primary bg-primary/10">Mgr</Badge> : <Badge variant="outline" className="text-[9px] uppercase font-mono text-muted-foreground">Rep</Badge>}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground"><Calendar className="w-3 h-3 inline mr-1" /> Joined {new Date(m.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
