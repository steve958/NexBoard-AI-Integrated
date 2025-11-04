"use client";
import { useState } from "react";
import type { Task } from "@/lib/taskTypes";
import SubtaskList from "@/components/SubtaskList";
import CommentsThread from "@/components/CommentsThread";

export default function TaskEditor({
  task,
  members = [],
  projectId,
  doneColumnId,
  subtasks = [],
  onCreateSubtask,
  onToggleSubtask,
  onSave,
  onDelete,
  onClose,
  currentUserId,
  ownerId,
}: {
  task: Task;
  members?: { uid: string; name?: string; email?: string }[];
  projectId: string;
  doneColumnId: string;
  subtasks?: Task[];
  onCreateSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (sub: Task, done: boolean) => Promise<void>;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  currentUserId: string;
  ownerId: string;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [assigneeId, setAssigneeId] = useState<string | undefined>(task.assigneeId);
  const [dueDate, setDueDate] = useState<string | undefined>(() => {
    if (!task.dueDate) return undefined;
    const date = typeof task.dueDate === 'object' && task.dueDate && 'toDate' in task.dueDate
      ? (task.dueDate as { toDate: () => Date }).toDate()
      : new Date(task.dueDate);
    return date.toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState(false);
  const doneCount = (subtasks || []).filter((s) => s.columnId === doneColumnId).length;
  const total = (subtasks || []).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Progress</label>
            <div className="h-2 w-full rounded bg-white/10">
              <div className="h-2 rounded nb-chip-teal" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs opacity-70 mt-1">{doneCount}/{total} ({pct}%)</div>
          </div>
          <div>
            <label className="block text-sm mb-1">Assignee</label>
            <select value={assigneeId || ""} onChange={(e)=> setAssigneeId(e.target.value || undefined)} className="w-full h-10 px-2 rounded-md bg-transparent border border-white/10">
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.uid} value={m.uid}>{m.name || m.email || m.uid}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Due date</label>
            <input type="date" value={dueDate || ""} onChange={(e)=> setDueDate(e.target.value || undefined)} className="w-full h-10 px-2 rounded-md bg-transparent border border-white/10" />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm mb-1">Subtasks</label>
        <SubtaskList
          subtasks={subtasks}
          onToggle={onToggleSubtask}
          onCreate={onCreateSubtask}
          doneColumnId={doneColumnId}
        />
      </div>
      <div className="mt-6">
        <label className="block text-sm mb-1">Comments</label>
        <CommentsThread projectId={projectId} taskId={task.taskId} currentUserId={currentUserId} ownerId={ownerId} members={members} taskAssigneeId={assigneeId} taskTitle={title} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={async () => {
            if (busy) return;
            const hasSubtasks = (subtasks || []).length > 0;
            const msg = hasSubtasks
              ? `Delete "${task.title}"?\n\nThis task has ${subtasks!.length} subtask(s) that will be moved to the Backlog column.`
              : `Delete "${task.title}"?`;
            if (!confirm(msg)) return;
            setBusy(true);
            try { await onDelete(); onClose(); } finally { setBusy(false); }
          }}
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
              try { await onSave({ title, description, assigneeId, dueDate }); onClose(); } finally { setBusy(false); }
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
