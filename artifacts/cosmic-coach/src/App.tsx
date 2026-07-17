import React, { useEffect, useRef } from "react";
import { ClerkProvider, useAuth, useClerk, useUser, AuthenticateWithRedirectCallback } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router as WouterRouter, Switch, Route, Link, useLocation, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Mic, LayoutDashboard, Plus, Settings, Crown, LogOut, User, ChevronDown, Shield, FolderGit } from "lucide-react";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent, SidebarTrigger
} from "@/components/ui/sidebar";

import Dashboard from "./pages/dashboard";
import Sessions from "./pages/sessions";
import NewSession from "./pages/new-session";
import SessionDetail from "./pages/session-detail";
import PricingPage from "./pages/pricing";
import AdminPage from "./pages/admin";
import Workspace from "./pages/workspace";
import JoinTeam from "./pages/join-team";
import NotFound from "./pages/not-found";
import Landing from "./pages/landing";
import TermsPage from "./pages/terms";
import PrivacyPage from "./pages/privacy";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { usePremiumStatus } from "./hooks/usePremiumStatus";
import { ErrorBoundary } from "./components/error-boundary";

function AuthSync() {
  const { getToken } = useAuth();
  
  // Set synchronously so it's ready before child queries run
  setAuthTokenGetter(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    return () => setAuthTokenGetter(null);
  }, []);

  return null;
}

const queryClient = new QueryClient();
const QueryClientContext = React.createContext<QueryClient | null>(null);

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl =
  import.meta.env.PROD && import.meta.env.VITE_CLERK_PROXY_URL
    ? (import.meta.env.VITE_CLERK_PROXY_URL as string)
    : undefined;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(217, 100%, 50%)",
    colorForeground: "hsl(0, 0%, 98%)",
    colorMutedForeground: "hsl(215, 20%, 65%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorBackground: "hsl(222, 47%, 5%)",
    colorInput: "hsl(222, 47%, 10%)",
    colorInputForeground: "hsl(0, 0%, 98%)",
    colorNeutral: "hsl(215, 20%, 25%)",
    fontFamily: "'Space Mono', 'JetBrains Mono', monospace",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(222,47%,7%)] border border-[hsl(215,20%,20%)] rounded-xl w-[440px] max-w-full overflow-hidden shadow-[0_0_40px_rgba(0,102,255,0.1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-mono",
    headerSubtitle: "text-[hsl(215,20%,65%)] font-mono text-sm",
    socialButtonsBlockButtonText: "text-white font-mono text-sm",
    formFieldLabel: "text-[hsl(215,20%,65%)] font-mono text-xs uppercase tracking-wider",
    footerActionLink: "text-[hsl(217,100%,60%)] font-mono",
    footerActionText: "text-[hsl(215,20%,65%)] font-mono",
    dividerText: "text-[hsl(215,20%,65%)] font-mono text-xs",
    identityPreviewEditButton: "text-[hsl(217,100%,60%)]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-red-400 font-mono text-sm",
    socialButtonsBlockButton: "border-[hsl(215,20%,20%)] bg-[hsl(222,47%,10%)] hover:bg-[hsl(222,47%,15%)] transition-colors",
    formButtonPrimary: "bg-[hsl(217,100%,50%)] hover:bg-[hsl(217,100%,45%)] font-mono uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(0,102,255,0.3)]",
    formFieldInput: "bg-[hsl(222,47%,10%)] border-[hsl(215,20%,20%)] text-white font-mono focus:border-[hsl(217,100%,50%)]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[hsl(215,20%,20%)]",
    alert: "border-red-500/30 bg-red-500/5",
    otpCodeFieldInput: "bg-[hsl(222,47%,10%)] border-[hsl(215,20%,20%)] text-white",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = React.useContext(QueryClientContext);
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!qc) return;
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function UserMenu() {
  const { user, isSignedIn } = useUser();
  const { isPremium, isAdmin } = usePremiumStatus();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [open, setOpen] = React.useState(false);

  if (!isSignedIn || !user) return null;

  const displayName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? "User";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-primary/5 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-3.5 h-3.5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">{displayName}</div>
          {isAdmin ? (
            <div className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
              <Shield className="w-2.5 h-2.5" /> Admin
            </div>
          ) : isPremium ? (
            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
              <Crown className="w-2.5 h-2.5" /> Pro
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground font-mono">Free Plan</div>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden z-50">
            {!isPremium && (
              <button
                onClick={() => { setOpen(false); setLocation("/pricing"); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-mono text-amber-400 hover:bg-amber-400/5 transition-colors border-b border-border/30"
              >
                <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
              </button>
            )}
            <button
              onClick={() => { setOpen(false); void signOut(); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { isPremium, isAdmin } = usePremiumStatus();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-border/50 bg-card/50 backdrop-blur-xl">
          <SidebarHeader className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 font-bold text-xl text-primary font-mono">
              <Mic className="w-6 h-6" />
              <span>Closing Clarity</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col h-full">
            <SidebarGroup className="flex-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/dashboard" className="flex items-center gap-3 w-full">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/workspace" className="flex items-center gap-3 w-full">
                        <FolderGit className="w-4 h-4" />
                        <span>Workspace</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/sessions" className="flex items-center gap-3 w-full">
                        <Mic className="w-4 h-4" />
                        <span>Sessions</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/sessions/new" className="flex items-center gap-3 w-full text-secondary">
                        <Plus className="w-4 h-4" />
                        <span>New Session</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/pricing" className="flex items-center gap-3 w-full">
                        <Settings className="w-4 h-4" />
                        <span>Billing</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link href="/admin" className="flex items-center gap-3 w-full text-blue-400">
                          <Shield className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isPremium && !isAdmin && (
              <div className="p-3 border-t border-border/30">
                <Link href="/pricing">
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 hover:bg-amber-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Upgrade to Premium</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">80 sessions · $249/mo</p>
                  </div>
                </Link>
              </div>
            )}
            {isAdmin && (
              <div className="p-3 border-t border-border/30">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Admin Access</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">Full system access enabled</p>
                </div>
              </div>
            )}

            <div className="p-3 border-t border-border/30">
              <UserMenu />
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
          <div className="absolute inset-0 bg-dot-pattern pointer-events-none" />
          
          <div className="md:hidden flex items-center p-4 border-b border-border/50 bg-card/30 backdrop-blur-md relative z-20">
            <SidebarTrigger className="-ml-2 mr-2" />
            <div className="flex items-center gap-2 font-bold text-lg text-primary font-mono">
              <Mic className="w-5 h-5 text-primary" />
              <span>Closing Clarity</span>
            </div>
          </div>

          <div className="relative z-10 flex-1 overflow-auto p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return <Layout><Component /></Layout>;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAdmin, isLoading } = usePremiumStatus();

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (!isAdmin) return <Redirect to="/dashboard" />;

  return <Layout><Component /></Layout>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <Landing />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function BannedHandler() {
  const { isError, error } = usePremiumStatus();
  const { signOut } = useClerk();
  const { toast } = useToast();
  
  useEffect(() => {
    if (isError && error?.message === "BANNED") {
      signOut().then(() => {
        toast({
          title: "Account Banned",
          description: "Your account has been permanently banned from Closing Clarity.",
          variant: "destructive",
          duration: Infinity,
        });
      });
    }
  }, [isError, error, signOut, toast]);
  
  return null;
}

function InnerRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey ?? ""}
      proxyUrl={clerkProxyUrl}
      appearance={{
        elements: { cardBox: "shadow-none border border-border/50", card: "bg-card" },
        layout: { socialButtonsPlacement: "bottom", shimmer: true },
        variables: { colorPrimary: "hsl(217.2 91.2% 59.8%)" },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Closing Clarity account" } },
        signUp: { start: { title: "Create your account", subtitle: "Start your Closing Clarity journey today" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientContext.Provider value={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <AuthSync />
          <BannedHandler />
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/pricing" component={PricingPage} />
              <Route path="/terms" component={TermsPage} />
              <Route path="/privacy" component={PrivacyPage} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/workspace" component={() => <ProtectedRoute component={Workspace} />} />
              <Route path="/join/:token" component={() => <ProtectedRoute component={JoinTeam} />} />
              <Route path="/sessions/new" component={() => <ProtectedRoute component={NewSession} />} />
              <Route path="/sessions/:id" component={() => <ProtectedRoute component={SessionDetail} />} />
              <Route path="/sessions" component={() => <ProtectedRoute component={Sessions} />} />
              <Route path="/admin" component={() => <AdminRoute component={AdminPage} />} />
              <Route path="/sso-callback" component={() => <AuthenticateWithRedirectCallback signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />} />
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </QueryClientContext.Provider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={basePath}>
        <InnerRoutes />
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;
