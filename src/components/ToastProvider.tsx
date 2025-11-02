"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

export type Toast = {
  id: string;
  title: string;
  kind?: "success" | "error" | "info";
  duration?: number;
};

type ToastCtx = {
  addToast: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) return { addToast: () => {} } as ToastCtx;
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, duration: 3000, kind: "info", ...t };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), toast.duration);
  };

  const value = useMemo(() => ({ addToast }), []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`nb-card nb-shadow rounded-md px-3 py-2 text-sm border ${
            t.kind === "success" ? "nb-chip-teal" : t.kind === "error" ? "nb-chip-coral" : ""
          }`}
          >
            {t.title}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
