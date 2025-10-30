"use client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4" role="main">
      <div className="w-full max-w-md rounded-2xl nb-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100 tracking-tight">
          Sign in to {process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard"}
        </h1>
        <button
          onClick={async () => {
            setLoading(true);
            try {
              await signInWithGoogle();
            } finally {
              setLoading(false);
            }
          }}
          aria-label="Continue with Google"
          disabled={loading}
          className="h-10 px-4 rounded-md nb-btn-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--nb-ring] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" aria-hidden="true" />
          )}
          Continue with Google
        </button>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          If nothing happens, your browser may have blocked the popup. Try again or allow popups for this site.
        </p>
      </div>
    </main>
  );
}
