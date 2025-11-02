"use client";
import { useEffect, useState } from "react";

const shortcuts = [
  { category: "Navigation", items: [
    { key: "Ctrl+K", desc: "Open command palette" },
    { key: "G then B", desc: "Go to boards list" },
    { key: "Esc", desc: "Close dialogs / Clear selection" },
  ]},
  { category: "Tasks", items: [
    { key: "N", desc: "New task (quick add)" },
    { key: "E or Enter", desc: "Edit selected task" },
    { key: "Delete", desc: "Delete selected task" },
    { key: "↑ ↓", desc: "Navigate between tasks" },
  ]},
  { category: "Comments", items: [
    { key: "@", desc: "Mention a team member" },
    { key: "Ctrl+Enter", desc: "Send comment" },
  ]},
  { category: "Help", items: [
    { key: "?", desc: "Show this help" },
  ]},
];

export default function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (open && e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative mx-auto mt-16 w-full max-w-2xl nb-card nb-shadow rounded-2xl p-6" role="dialog" aria-labelledby="help-title" aria-modal="true">
        <div className="flex items-center justify-between mb-6">
          <h2 id="help-title" className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-md hover:bg-white/5 flex items-center justify-center" aria-label="Close help">
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shortcuts.map((cat) => (
            <div key={cat.category}>
              <h3 className="text-sm font-medium opacity-70 mb-3">{cat.category}</h3>
              <ul className="space-y-2">
                {cat.items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between text-sm">
                    <span>{item.desc}</span>
                    <kbd className="px-2 py-1 rounded bg-white/10 text-xs font-mono">{item.key}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 text-xs opacity-70 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">?</kbd> to close
        </div>
      </div>
    </div>
  );
}
