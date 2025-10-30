"use client";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== "/login") {
        router.replace("/login");
      }
      if (user && pathname === "/login") {
        router.replace("/");
      }
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-busy="true">
        <span className="sr-only">Loading…</span>
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-zinc-300 border-t-zinc-900" aria-hidden="true" />
      </div>
    );
  }

  // If unauthenticated on /login, allow rendering the login page
  if (!user && pathname === "/login") {
    return <>{children}</>;
  }

  // If unauthenticated elsewhere, render nothing (router effect will redirect)
  if (!user && pathname !== "/login") return null;

  // If authenticated on /login, don't render login while redirecting
  if (user && pathname === "/login") return null;

  return <>{children}</>;
}
