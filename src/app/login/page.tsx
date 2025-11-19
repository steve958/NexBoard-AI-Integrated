"use client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen flex flex-col lg:flex-row" role="main">
      {/* Left side - Branding */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#2F4858] dark:bg-[#1a2832] p-8 lg:p-16">
        <div className="max-w-lg w-full text-center lg:text-left">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center">
            <div
              className="rounded-[20px]"
              style={{ backgroundColor: '#FAFAFA' }}
            >
              <Image
                src="/logo.png"
                alt="NexBoard Logo"
                width={200}
                height={200}
                priority
                className="h-64 w-64 lg:h-72 lg:w-72"
              />
            </div>
          </div>

          {/* App name and description */}
          {/* <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard"}
          </h1> */}
          <p className="text-lg lg:text-xl text-zinc-100 mb-4 leading-relaxed">
            Collaborative Kanban boards that bring your team together in real-time.
          </p>
          <p className="text-base text-zinc-300 leading-relaxed">
            Manage tasks, track progress, and collaborate seamlessly with powerful features like
            real-time updates, role-based permissions, subtasks, comments, and smart notifications.
          </p>

          {/* Feature highlights */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-[#FF9B8A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-100">Real-time collaboration</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-[#5FA8A0] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-100">Drag & drop interface</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-[#FDB95E] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-100">Subtasks & progress tracking</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-[#FF9B8A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-100">Smart notifications</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-black p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">
              Welcome back
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Auth method info */}
          <div className="mb-6 p-4 rounded-lg bg-[#5FA8A0]/10 dark:bg-[#5FA8A0]/20 border border-[#5FA8A0]/30 dark:border-[#5FA8A0]/40">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 text-[#5FA8A0] flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                We use Google authentication to keep your account secure. Only Google sign-in is supported.
              </p>
            </div>
          </div>

          {/* Google sign-in button */}
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
            className="w-full h-12 px-6 rounded-lg bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5FA8A0] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 font-medium text-zinc-900 dark:text-zinc-100"
          >
            {loading ? (
              <span
                className="inline-block h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          {/* Help text */}
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500 text-center">
            If nothing happens, your browser may have blocked the popup. Try again or allow popups for this site.
          </p>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
