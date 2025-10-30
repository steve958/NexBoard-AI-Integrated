"use client";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { signOutUser } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">Welcome to {process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard"}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">You are signed in.</p>
        <button onClick={signOutUser} className="mt-6 px-4 py-2 rounded-md border">Sign out</button>
      </main>
    </div>
  );
}
