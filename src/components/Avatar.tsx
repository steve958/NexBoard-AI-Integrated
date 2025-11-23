"use client";
import React from "react";
import { getBotUser } from "@/lib/botUsers";

function colorFor(uid: string) {
  const colors = ["var(--nb-teal)", "var(--nb-coral)", "var(--nb-accent)"] as const;
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function initials(name?: string, email?: string) {
  const src = name || email || "?";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase();
}

function BotIcon({ icon, size }: { icon: 'warp' | 'cursor'; size: number }) {
  if (icon === 'warp') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.9"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      </svg>
    );
  }

  if (icon === 'cursor') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="currentColor" opacity="0.9"/>
        <path d="M13 13L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
      </svg>
    );
  }

  return null;
}

export default function Avatar({ uid, name, email, size = 20 }: { uid: string; name?: string; email?: string; size?: number }) {
  const botUser = getBotUser(uid);

  if (botUser) {
    return (
      <div
        style={{ width: size, height: size, backgroundColor: 'var(--nb-accent)', color: '#1d1d1d' }}
        className="rounded-full flex items-center justify-center relative"
        title={`${botUser.name} (Bot)`}
        aria-label={`${botUser.name} (Bot)`}
      >
        <BotIcon icon={botUser.icon} size={size * 0.65} />
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--nb-teal)' }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="12" height="2" rx="1"/>
            <rect x="4" y="8" width="16" height="2" rx="1"/>
            <rect x="4" y="12" width="16" height="2" rx="1"/>
            <rect x="6" y="16" width="12" height="2" rx="1"/>
            <circle cx="8" cy="19" r="1" fill="white"/>
            <circle cx="12" cy="19" r="1" fill="white"/>
            <circle cx="16" cy="19" r="1" fill="white"/>
          </svg>
        </div>
      </div>
    );
  }

  const bg = colorFor(uid);
  const text = "#1d1d1d";
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, color: text }}
      className="rounded-full flex items-center justify-center text-[10px] font-semibold"
      title={name || email || uid}
      aria-label={name || email || uid}
    >
      {initials(name, email)}
    </div>
  );
}
