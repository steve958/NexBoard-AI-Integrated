"use client";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="rounded-xl border p-8 bg-white dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Sign in to {process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard"}</h1>
        <button
          onClick={signInWithGoogle}
          className="px-4 py-2 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
