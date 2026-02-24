"use client";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
};

export default function StatCard({ label, value, icon, subtitle }: Props) {
  return (
    <div className="nb-card-elevated nb-stat-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold nb-brand-text">{value}</div>
      {subtitle && (
        <div className="text-xs mt-1 opacity-70">{subtitle}</div>
      )}
    </div>
  );
}
