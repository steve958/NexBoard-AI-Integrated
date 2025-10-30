"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

export default function Header() {
  const { user, signOutUser } = useAuth();
  return (
    <header className="w-full border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="NexBoard" width={28} height={28} className="rounded-md bg-white/5" />
          <span className="font-semibold tracking-tight">NexBoard</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user && <Link href="/boards" className="hover:underline">Boards</Link>}
          {user ? (
            <button onClick={signOutUser} className="h-9 px-3 rounded-md nb-btn-secondary hover:bg-white/5">Sign out</button>
          ) : (
            <Link href="/login" className="h-9 px-3 rounded-md nb-btn-primary flex items-center">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
