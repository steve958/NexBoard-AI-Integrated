"use client";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { signOutUser } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8 sm:p-16" role="main">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">You are signed in.</p>
        <div className="mt-6 flex gap-3">
          <a href="/boards" className="h-10 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 flex items-center">Go to Boards</a>
          <button
            onClick={signOutUser}
            className="h-10 px-4 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
