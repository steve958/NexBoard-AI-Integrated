"use client";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { signOutUser } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8 sm:p-16 bg-white dark:bg-black" role="main">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">You are signed in.</p>
        <button
          onClick={signOutUser}
          className="mt-6 h-10 px-4 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
