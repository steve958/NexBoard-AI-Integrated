"use client";
import { useState } from "react";
import type { Task } from "@/lib/taskTypes";

export default function TaskEditor({
  task,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 px-3 rounded-md bg-transparent border border-white/10" />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-md bg-transparent border border-white/10" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={async () => { if (busy) return; setBusy(true); try { await onDelete(); onClose(); } finally { setBusy(false); } }}
          className="h-10 px-4 rounded-md border border-red-400 text-red-300 hover:bg-red-500/10"
        >
          Delete
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-md nb-btn-secondary hover:bg-white/5">Cancel</button>
          <button
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              try { await onSave({ title, description }); onClose(); } finally { setBusy(false); }
            }}
            className="h-10 px-4 rounded-md nb-btn-primary"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
