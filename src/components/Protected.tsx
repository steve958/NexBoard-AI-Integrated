"use client";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      if (pathname !== "/login") router.replace("/login");
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
