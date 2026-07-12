import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch("/api/teams/join-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include"
    })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to join team");
      }
      return res.json();
    })
    .then(() => {
      setStatus("success");
    })
    .catch((err) => {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message);
    });
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-md w-full bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-8 text-center"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h2 className="text-xl font-bold text-foreground">Processing Invitation...</h2>
            <p className="font-mono text-sm">Please wait while we verify your invite token.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 text-emerald-500">
            <CheckCircle2 className="w-16 h-16" />
            <h2 className="text-2xl font-bold text-foreground">You're In!</h2>
            <p className="font-mono text-sm text-muted-foreground mb-4">You have successfully joined the workspace.</p>
            <Button onClick={() => setLocation("/workspace")} className="w-full font-mono uppercase tracking-widest text-xs">
              Go to Workspace
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-destructive">
            <XCircle className="w-16 h-16" />
            <h2 className="text-2xl font-bold text-foreground">Invite Failed</h2>
            <p className="font-mono text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button variant="outline" onClick={() => setLocation("/dashboard")} className="w-full font-mono uppercase tracking-widest text-xs border-border/50">
              Return Home
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
