import { SignIn } from "@clerk/react";
import { Mic } from "lucide-react";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/">
          <div className="flex items-center gap-2 font-bold text-xl text-primary font-mono mb-8 justify-center">
            <Mic className="w-6 h-6" />
            <span>CLOSING CLARITY</span>
          </div>
        </Link>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
          appearance={{
            elements: {
              card: "bg-card/50 backdrop-blur-sm border border-primary/20 shadow-[0_0_40px_rgba(0,102,255,0.1)]",
              headerTitle: "font-mono",
              headerSubtitle: "font-mono text-muted-foreground",
              formButtonPrimary: "font-mono uppercase tracking-wider",
              socialButtonsBlockButton: "font-mono bg-background/50 border-primary/20 hover:bg-primary/10",
              formFieldLabel: "font-mono text-xs uppercase tracking-wider text-muted-foreground",
              formFieldInput: "font-mono bg-background/50",
              dividerText: "font-mono text-muted-foreground",
              footerActionText: "font-mono text-muted-foreground",
              footerActionLink: "font-mono text-primary hover:underline"
            }
          }}
        />
      </div>
    </div>
  );
}
