import { useQuery } from "@tanstack/react-query";
import { Shield, Users, LayoutList, TrendingUp, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  premiumCount: number;
}

interface AdminUser {
  id: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

interface AdminSession {
  id: string;
  userId: string | null;
  title: string;
  speakerName: string;
  duration: number;
  createdAt: string;
  status: string;
  overallScore: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const r = await fetch("/api/admin/stats", { credentials: "include" });
  if (!r.ok) throw new Error("Forbidden");
  return r.json() as Promise<AdminStats>;
}

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const r = await fetch("/api/admin/users", { credentials: "include" });
  if (!r.ok) throw new Error("Forbidden");
  return r.json() as Promise<AdminUser[]>;
}

async function fetchAdminSessions(): Promise<AdminSession[]> {
  const r = await fetch("/api/admin/sessions", { credentials: "include" });
  if (!r.ok) throw new Error("Forbidden");
  return r.json() as Promise<AdminSession[]>;
}

export default function AdminPage() {
  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    retry: false,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
    retry: false,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchAdminSessions,
    retry: false,
  });

  if (statsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-mono text-sm">Access denied — admin only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Full system access — restricted to 2 admin accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold font-mono">{stats?.totalUsers ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <LayoutList className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold font-mono">{stats?.totalSessions ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold font-mono">{stats?.premiumCount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Premium Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No users yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Email</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Plan</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 font-mono text-xs text-foreground/80">{u.email ?? "—"}</td>
                      <td className="py-2">
                        {u.stripeSubscriptionId ? (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">Pro</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Free</Badge>
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> All Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No sessions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Title</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Speaker</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Score</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Status</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 text-xs text-foreground/80 font-mono max-w-[180px] truncate">{s.title}</td>
                      <td className="py-2 text-xs text-foreground/80">{s.speakerName}</td>
                      <td className="py-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{s.overallScore}</span>
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${s.status === "ready" ? "text-green-400 border-green-500/30" : s.status === "processing" ? "text-yellow-400 border-yellow-500/30" : "text-red-400 border-red-500/30"}`}
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground font-mono">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
