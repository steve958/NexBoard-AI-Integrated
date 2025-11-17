"use client";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--nb-bg)',
          border: '2px solid color-mix(in srgb, var(--nb-ink) 15%, transparent)',
          padding: '2rem'
        }}
      >
        {title && (
          <div className="mb-6 pb-4 border-b" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 12%, transparent)' }}>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--nb-ink)' }}>
              {title}
            </h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
