"use client";
import React from "react";
import Image from "next/image";
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

export default function Avatar({ uid, name, email, size = 20 }: { uid: string; name?: string; email?: string; size?: number }) {
  const botUser = getBotUser(uid);

  if (botUser) {
    const logoSrc = `/${botUser.icon}.jpg`;
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full flex items-center justify-center overflow-hidden"
        title={`${botUser.name} (AI Assistant)`}
        aria-label={`${botUser.name} (AI Assistant)`}
      >
        <Image
          src={logoSrc}
          alt={`${botUser.name} logo`}
          width={size}
          height={size}
          className="object-cover"
        />
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
