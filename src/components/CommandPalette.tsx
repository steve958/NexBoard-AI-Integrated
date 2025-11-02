"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCommands, subscribe, type Command } from "@/lib/commands";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Command[]>(getCommands());
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const off = subscribe(() => setAll(getCommands()));
    return () => off();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all;
    if (!needle) return list;
    return list.filter((c) => c.title.toLowerCase().includes(needle));
  }, [q, all]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (open) {
        if (e.key === "Escape") setOpen(false);
        if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, filtered.length - 1));
        if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = filtered[sel];
          if (cmd) {
            setOpen(false);
            Promise.resolve(cmd.run());
          }
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sel, filtered]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setQ("");
        setSel(0);
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="palette-label">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative mx-auto mt-24 w-full max-w-xl nb-card nb-shadow rounded-2xl p-2">
        <label htmlFor="command-input" className="sr-only" id="palette-label">Search commands</label>
        <input
          id="command-input"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a command..."
          className="w-full h-12 rounded-xl px-4 bg-transparent border border-white/10 outline-none"
          aria-autocomplete="list"
          aria-controls="command-list"
        />
        <ul id="command-list" role="listbox" className="max-h-80 overflow-auto divide-y divide-white/10 mt-2">
          {filtered.length === 0 && (
            <li className="p-3 text-sm opacity-70" role="option" aria-disabled="true">No commands</li>
          )}
          {filtered.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === sel}>
              <button
                onClick={() => {
                  setOpen(false);
                  Promise.resolve(c.run());
                }}
                className={`w-full text-left p-3 rounded-lg flex items-start justify-between gap-4 ${i === sel ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <div>
                  <div className="text-sm font-medium">{c.title}</div>
                  {c.group && <div className="text-xs opacity-70 mt-1">{c.group}</div>}
                </div>
                {c.shortcut && (
                  <kbd className="px-2 py-1 rounded bg-white/10 text-xs font-mono opacity-70 flex-shrink-0">{c.shortcut}</kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between px-2 py-2 text-xs opacity-60">
          <span>↑↓ navigate · Enter select · Esc close</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Ctrl+K</kbd>
        </div>
      </div>
    </div>
  );
}
