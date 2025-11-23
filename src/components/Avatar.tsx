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

function RobotIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Robot head */}
      <rect x="6" y="8" width="12" height="10" rx="2" fill="currentColor" opacity="0.9"/>
      {/* Antenna */}
      <line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
      <circle cx="12" cy="3" r="1.5" fill="currentColor" opacity="0.9"/>
      {/* Eyes */}
      <circle cx="9.5" cy="12" r="1.5" fill="white"/>
      <circle cx="14.5" cy="12" r="1.5" fill="white"/>
      {/* Mouth */}
      <line x1="9" y1="15" x2="15" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/>
      {/* Body connector */}
      <rect x="11" y="18" width="2" height="2" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}

export default function Avatar({ uid, name, email, size = 20 }: { uid: string; name?: string; email?: string; size?: number }) {
  const botUser = getBotUser(uid);

  if (botUser) {
    const botColor = botUser.icon === 'warp' ? '#6366f1' : '#8b5cf6'; // indigo for Warp, purple for Cursor
    return (
      <div
        style={{ width: size, height: size, backgroundColor: botColor, color: 'white' }}
        className="rounded-full flex items-center justify-center"
        title={`${botUser.name} (AI Assistant)`}
        aria-label={`${botUser.name} (AI Assistant)`}
      >
        <RobotIcon size={size * 0.7} />
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
