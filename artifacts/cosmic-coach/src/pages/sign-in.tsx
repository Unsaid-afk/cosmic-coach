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
          <div className="flex items-center gap-2 font-bold text-lg text-primary font-mono cursor-pointer">
            <Mic className="w-5 h-5" />
            <span>COSMIC COACH</span>
          </div>
        </Link>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      </div>
    </div>
  );
}
