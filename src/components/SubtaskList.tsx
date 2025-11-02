"use client";
import { useState } from "react";
import type { Task } from "@/lib/taskTypes";

export default function SubtaskList({
  subtasks = [],
  doneColumnId,
  onCreate,
  onToggle,
}: {
  subtasks?: Task[];
  doneColumnId: string;
  onCreate: (title: string) => Promise<void>;
  onToggle: (sub: Task, done: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="New subtask" className="h-8 px-2 rounded bg-transparent border border-white/10" />
        <button onClick={async ()=>{ const t = title.trim(); if(!t) return; await onCreate(t); setTitle(""); }} className="h-8 px-3 rounded nb-btn-primary">Add</button>
      </div>
      <ul className="space-y-1">
        {subtasks.map((s)=>{
          const done = s.columnId === doneColumnId;
          return (
            <li key={s.taskId} className="flex items-center gap-2">
              <input type="checkbox" checked={done} onChange={(e)=>onToggle(s, e.target.checked)} />
              <span className={`text-sm ${done ? 'opacity-60 line-through' : ''}`}>{s.title}</span>
            </li>
          );
        })}
        {subtasks.length === 0 && <li className="text-xs opacity-70">No subtasks</li>}
      </ul>
    </div>
  );
}
