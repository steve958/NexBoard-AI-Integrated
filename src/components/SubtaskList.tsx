"use client";
import { useState } from "react";
import type { Task } from "@/lib/taskTypes";

export default function SubtaskList({
  subtasks = [],
  doneColumnId,
  onCreate,
  onToggle,
  onEdit,
  onDelete,
}: {
  subtasks?: Task[];
  doneColumnId: string;
  onCreate: (title: string) => Promise<void>;
  onToggle: (sub: Task, done: boolean) => Promise<void>;
  onEdit: (sub: Task, newTitle: string) => Promise<void>;
  onDelete: (sub: Task) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const t = title.trim();
              if (t) {
                try {
                  await onCreate(t);
                  setTitle("");
                } catch (error) {
                  // Error handled by parent component
                }
              }
            }
          }}
          placeholder="New subtask"
          className="flex-1 h-8 px-3 rounded-lg bg-transparent focus:outline-none focus:ring-2 transition-all"
          style={{
            border: '1.5px solid color-mix(in srgb, var(--nb-ink) 20%, transparent)',
            color: 'var(--nb-ink)',
            caretColor: 'var(--nb-teal)',
          }}
          type="text"
        />
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const t = title.trim();
            if (!t) return;
            try {
              await onCreate(t);
              setTitle("");
            } catch (error) {
              // Error handled by parent component
            }
          }}
          className="h-8 px-4 rounded-lg nb-btn-primary text-sm font-semibold"
          type="button"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {subtasks.map((s) => {
          const done = s.columnId === doneColumnId;
          const isEditing = editingId === s.taskId;

          return (
            <li
              key={s.taskId}
              className="flex items-center gap-2 p-2 rounded-lg group"
              style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 3%, transparent)' }}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={(e) => onToggle(s, e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--nb-teal)' }}
              />
              {isEditing ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const t = editTitle.trim();
                        if (t) {
                          onEdit(s, t);
                          setEditingId(null);
                        }
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                    className="flex-1 h-7 px-2 rounded bg-transparent focus:outline-none focus:ring-2"
                    style={{
                      border: '1px solid color-mix(in srgb, var(--nb-ink) 20%, transparent)',
                      color: 'var(--nb-ink)',
                    }}
                  />
                  <button
                    onClick={() => {
                      const t = editTitle.trim();
                      if (t) {
                        onEdit(s, t);
                        setEditingId(null);
                      }
                    }}
                    className="h-7 px-3 rounded text-xs font-semibold"
                    style={{ backgroundColor: 'var(--nb-teal)', color: '#1d1d1d' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="h-7 px-3 rounded text-xs font-semibold"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)', color: 'var(--nb-ink)' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${done ? 'opacity-60 line-through' : ''}`} style={{ color: 'var(--nb-ink)' }}>
                    {s.title}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(s.taskId);
                        setEditTitle(s.title);
                      }}
                      className="h-7 w-7 rounded flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 10%, transparent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Edit subtask"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-ink)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await onDelete(s);
                        } catch (error) {
                          // Error handled by parent component
                        }
                      }}
                      className="h-7 w-7 rounded flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-coral) 10%, transparent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Delete subtask"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-coral)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
        {subtasks.length === 0 && (
          <li className="text-xs py-2 text-center" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
            No subtasks yet
          </li>
        )}
      </ul>
    </div>
  );
}
