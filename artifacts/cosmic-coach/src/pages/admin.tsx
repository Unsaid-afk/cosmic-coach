import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, LayoutList, TrendingUp, Crown, MoreHorizontal, Edit2, Trash2, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  isBanned: boolean;
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

interface AdminContract {
  id: number;
  userId: string;
  email: string | null;
  pricePerMonth: number;
  sessionQuota: number;
  status: string;
  createdAt: string;
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

async function fetchAdminContracts(): Promise<AdminContract[]> {
  const r = await fetch("/api/admin/contracts", { credentials: "include" });
  if (!r.ok) throw new Error("Forbidden");
  return r.json() as Promise<AdminContract[]>;
}

async function toggleUserBan(id: string) {
  const r = await fetch(`/api/admin/users/${id}/ban`, { method: "POST", credentials: "include" });
  if (!r.ok) throw new Error("Failed to ban");
  return r.json();
}

async function deleteUser(id: string) {
  const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error("Failed to delete user");
  return r.json();
}

async function editUser(data: { id: string; email: string }) {
  const r = await fetch(`/api/admin/users/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: data.email }),
    credentials: "include"
  });
  if (!r.ok) throw new Error("Failed to edit user");
  return r.json();
}

async function deleteSession(id: string) {
  const r = await fetch(`/api/admin/sessions/${id}`, { method: "DELETE", credentials: "include" });
  if (!r.ok) throw new Error("Failed to delete session");
  return r.json();
}

async function editSession(data: { id: string; title: string; speakerName: string }) {
  const r = await fetch(`/api/admin/sessions/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: data.title, speakerName: data.speakerName }),
    credentials: "include"
  });
  if (!r.ok) throw new Error("Failed to edit session");
  return r.json();
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editUserModal, setEditUserModal] = useState<AdminUser | null>(null);
  const [editSessionModal, setEditSessionModal] = useState<AdminSession | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSpeaker, setNewSpeaker] = useState("");

  const [contractEmail, setContractEmail] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [contractQuota, setContractQuota] = useState("");

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
  const { data: contracts = [] } = useQuery({
    queryKey: ["admin-contracts"],
    queryFn: fetchAdminContracts,
    retry: false,
  });

  const toggleBanMutation = useMutation({
    mutationFn: toggleUserBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Ban status updated" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User deleted" });
    }
  });

  const editUserMutation = useMutation({
    mutationFn: editUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditUserModal(null);
      toast({ title: "User updated" });
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      toast({ title: "Session deleted" });
    }
  });

  const editSessionMutation = useMutation({
    mutationFn: editSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      setEditSessionModal(null);
      toast({ title: "Session updated" });
    }
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contractEmail, pricePerMonth: contractPrice, sessionQuota: contractQuota }),
        credentials: "include"
      });
      if (!r.ok) {
        const body = await r.json();
        throw new Error(body.error || "Failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contracts"] });
      setContractEmail("");
      setContractPrice("");
      setContractQuota("");
      toast({ title: "Contract created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
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
            <Crown className="w-4 h-4 text-primary" /> Enterprise Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="User Email" value={contractEmail} onChange={(e) => setContractEmail(e.target.value)} className="bg-background" />
            <Input placeholder="Price (Cents)" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} className="bg-background" />
            <Input placeholder="Quota" value={contractQuota} onChange={(e) => setContractQuota(e.target.value)} className="bg-background" />
            <Button disabled={!contractEmail || !contractPrice || !contractQuota || createContractMutation.isPending} onClick={() => createContractMutation.mutate()} className="shrink-0 font-mono text-xs uppercase tracking-widest">
              Create Contract
            </Button>
          </div>
          {contracts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No active contracts</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Email</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Monthly Price</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Quota</th>
                    <th className="text-left pb-2 text-muted-foreground font-mono font-normal">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 font-mono text-xs text-foreground/80">{c.email}</td>
                      <td className="py-2 text-xs font-mono">${(c.pricePerMonth / 100).toFixed(2)}</td>
                      <td className="py-2 text-xs font-mono">{c.sessionQuota}</td>
                      <td className="py-2 text-xs text-muted-foreground font-mono">
                        {new Date(c.createdAt).toLocaleDateString()}
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
                    <th className="text-right pb-2 text-muted-foreground font-mono font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 font-mono text-xs text-foreground/80">
                        {u.email ?? "—"}
                        {u.isBanned && <Badge variant="destructive" className="ml-2 text-[10px]">BANNED</Badge>}
                      </td>
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
                      <td className="py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditUserModal(u); setNewEmail(u.email || ""); }}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleBanMutation.mutate(u.id)}>
                              <Ban className="mr-2 h-4 w-4" /> {u.isBanned ? "Unban User" : "Ban User"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteUserMutation.mutate(u.id)} className="text-red-500">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    <th className="text-right pb-2 text-muted-foreground font-mono font-normal">Actions</th>
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
                      <td className="py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditSessionModal(s); setNewTitle(s.title); setNewSpeaker(s.speakerName); }}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Session
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteSessionMutation.mutate(s.id)} className="text-red-500">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Session
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUserModal} onOpenChange={(open) => !open && setEditUserModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserModal(null)}>Cancel</Button>
            <Button onClick={() => editUserModal && editUserMutation.mutate({ id: editUserModal.id, email: newEmail })}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={!!editSessionModal} onOpenChange={(open) => !open && setEditSessionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Speaker Name</Label>
              <Input value={newSpeaker} onChange={(e) => setNewSpeaker(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSessionModal(null)}>Cancel</Button>
            <Button onClick={() => editSessionModal && editSessionMutation.mutate({ id: editSessionModal.id, title: newTitle, speakerName: newSpeaker })}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
