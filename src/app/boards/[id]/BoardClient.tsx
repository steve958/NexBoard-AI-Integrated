"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { Column, Project } from "@/lib/types";
import { getUsersByIds, type UserProfile } from "@/lib/projects";
import { registerCommands } from "@/lib/commands";
import Avatar from "@/components/Avatar";
import DueChip from "@/components/DueChip";
import type { Task } from "@/lib/taskTypes";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { listenTasksByColumn, createTask, updateTask, computeNewOrder, deleteTask, deleteTaskWithOrphans } from "@/lib/tasks";
import Modal from "@/components/Modal";
import TaskEditor from "@/components/TaskEditor";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useToast } from "@/components/ToastProvider";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { canEditTasks } from "@/lib/roles";
import { calculateProgress } from "@/lib/progress";

export default function BoardClient({ boardId }: { boardId: string }) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [newTitle, setNewTitle] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Task | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement | null>());
  const tasksUnsubsRef = useRef<(() => void)[]>([]);
  const { addToast } = useToast();
  const [colErrors, setColErrors] = useState<Record<string, string | undefined>>({});
  const searchParams = useSearchParams();
  const [gPressed, setGPressed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const db = getDbClient();
    (async () => {
      try {
        const pRef = doc(db, "projects", boardId);
        const pSnap = await getDoc(pRef);
        if (!pSnap.exists()) { setError("Board not found"); return; }
        const data = pSnap.data() as Omit<Project, "projectId">;
        if (!data.members?.includes(user.uid)) { setError("You do not have access to this board"); return; }
        setProject({ projectId: pSnap.id, ...data } as Project);
        const profiles = await getUsersByIds(data.members || []);
        setMemberProfiles(profiles);
        const q = query(collection(db, `projects/${boardId}/columns`), orderBy("order"));
        const unsub = onSnapshot(q, (snap) => {
          tasksUnsubsRef.current.forEach((fn) => fn());
          tasksUnsubsRef.current = [];
          const cols: Column[] = [];
          snap.forEach((d) => {
            const col = { columnId: d.id, ...(d.data() as Omit<Column, "columnId">) } as Column;
            cols.push(col);
            const off = listenTasksByColumn(boardId, col.columnId, (list) => setTasks((prev) => ({ ...prev, [col.columnId]: list })));
            tasksUnsubsRef.current.push(off);
          });
          setColumns(cols);
        });
        return () => { tasksUnsubsRef.current.forEach((fn) => fn()); unsub(); };
      } catch (e: unknown) { setError((e as Error)?.message || "Failed to load board"); }
    })();
  }, [user, boardId]);

  // Register commands
  useEffect(() => {
    if (!project) return;
    const firstCol = columns[0]?.columnId;
    const unregister = registerCommands([
      { id: `boards:${project.projectId}:new-in-first`, title: `New task in "${columns[0]?.name || 'First column'}"`, group: 'Board', run: async () => { const title = prompt('Task title'); if (!title || !firstCol) return; await createTask(project.projectId, firstCol, title); } },
      { id: `boards:${project.projectId}:focus-quick-add`, title: 'Focus quick add', group: 'Board', shortcut: 'N', run: () => { if (firstCol) inputRefs.current.get(firstCol)?.focus(); } },
      { id: `boards:${project.projectId}:open-boards`, title: 'Open Boards list', group: 'Navigation', shortcut: 'G B', run: () => { window.location.href = '/boards'; } },
      { id: `boards:${project.projectId}:edit-selected`, title: 'Edit selected task', group: 'Task', shortcut: 'E', run: () => { const task = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId); if (task) setEditing(task); } },
      { id: `boards:${project.projectId}:new-subtask`, title: 'Add subtask to selected', group: 'Task', run: async () => { const parent = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId); const firstCol = columns[0]?.columnId; if (!parent || !firstCol) return; const title = prompt('Subtask title'); if (!title) return; await createTask(project.projectId, firstCol, title, { parentTaskId: parent.taskId }); } },
      { id: 'global:help', title: 'Show keyboard shortcuts', group: 'Help', shortcut: '?', run: () => { /* Handled by HelpOverlay */ } },
    ]);
    return unregister;
  }, [project, columns, tasks, selectedTaskId]);

  async function onDragEnd(result: DropResult) {
    if (!project) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const fromCol = source.droppableId;
    const toCol = destination.droppableId;
    if (fromCol === toCol && source.index === destination.index) return;
    const fromTasks = tasks[fromCol] || [];
    const toTasks = tasks[toCol] || [];
    const reordered = [...toTasks];
    const moving: Task = (tasks[fromCol] || []).find((t) => t.taskId === draggableId)!;
    const srcList = [...fromTasks].filter((t) => t.taskId !== draggableId);
    reordered.splice(destination.index, 0, moving);
    const newOrder = computeNewOrder(reordered, destination.index);
    
    // Notify assignee if column changed
    if (fromCol !== toCol && moving.assigneeId && moving.assigneeId !== user?.uid) {
      const fromColName = columns.find(c => c.columnId === fromCol)?.name || 'column';
      const toColName = columns.find(c => c.columnId === toCol)?.name || 'column';
      const { addNotification } = await import("@/lib/notifications");
      await addNotification(project.projectId, {
        userId: moving.assigneeId,
        taskId: moving.taskId,
        type: "status-change",
        title: "Task status changed",
        text: `"${moving.title}" moved from ${fromColName} to ${toColName}`,
      }).catch(() => {}); // Silent fail for notifications
    }
    
    updateTask(project.projectId, draggableId, { columnId: toCol, order: newOrder })
      .then(() => addToast({ title: 'Task moved', kind: 'success', duration: 1500 }))
      .catch(() => addToast({ title: 'Move failed (will resync)', kind: 'error' }));
    setTasks({ ...tasks, [fromCol]: srcList, [toCol]: reordered.map((t, i) => (i === destination.index ? { ...t, order: newOrder, columnId: toCol } : t)) });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')) return;
      const key = e.key.toLowerCase();
      
      // G then B sequence for board navigation
      if (key === 'g' && !gPressed) {
        setGPressed(true);
        setTimeout(() => setGPressed(false), 1000); // Reset after 1 second
        return;
      }
      if (gPressed && key === 'b') {
        setGPressed(false);
        window.location.href = '/boards';
        return;
      }
      
      if (key === 'n') {
        const first = columns[0]?.columnId;
        if (first) inputRefs.current.get(first)?.focus();
      } else if ((key === 'e' || key === 'enter') && selectedTaskId && project) {
        const task = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId);
        if (task) setEditing(task);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTaskId && project) {
        const task = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId);
        if (!task) return;
        const subs = Object.values(tasks).flat().filter((st) => st.parentTaskId === task.taskId);
        const msg = subs.length > 0 ? `Delete "${task.title}"?\n\n${subs.length} subtask(s) will be moved to Backlog.` : `Delete "${task.title}"?`;
        if (!confirm(msg)) return;
        const backlogCol = columns.find(c => c.name.toLowerCase().includes('backlog'))?.columnId || columns[0]?.columnId || '';
        const deletePromise = subs.length > 0 ? deleteTaskWithOrphans(project.projectId, selectedTaskId, backlogCol) : deleteTask(project.projectId, selectedTaskId);
        deletePromise.then(()=>addToast({ title: 'Task deleted', kind: 'success'})).catch(()=>addToast({ title: 'Delete failed', kind: 'error'}));
        setSelectedTaskId(null);
      } else if (key === 'arrowdown' || key === 'arrowup') {
        const cols = (columns || []).map(c => c.columnId);
        if (!cols.length) return;
        const currentCol = cols.find(colId => (tasks[colId] || []).some(t => t.taskId === selectedTaskId)) || cols[0];
        const list = tasks[currentCol] || [];
        const idx = selectedTaskId ? list.findIndex(t => t.taskId === selectedTaskId) : -1;
        if (key === 'arrowdown') {
          if (idx + 1 < list.length) setSelectedTaskId(list[idx + 1].taskId);
          else {
            const ci = cols.findIndex((c) => c === currentCol);
            const nextCol = ci >= 0 ? cols[ci + 1] : undefined;
            const nextList = nextCol ? (tasks[nextCol] || []) : [];
            if (nextList.length) setSelectedTaskId(nextList[0].taskId);
          }
        } else {
          if (idx > 0) setSelectedTaskId(list[idx - 1].taskId);
          else {
            const ci = cols.findIndex((c) => c === currentCol);
            const prevCol = ci > 0 ? cols[ci - 1] : undefined;
            const prevList = prevCol ? (tasks[prevCol] || []) : [];
            if (prevList.length) setSelectedTaskId(prevList[prevList.length - 1].taskId);
          }
        }
      } else if (key === 'escape') setSelectedTaskId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [columns, selectedTaskId, tasks, project, addToast]);

  useEffect(() => {
    if (selectedTaskId) {
      const el = document.querySelector(`[data-task-id="${selectedTaskId}"]`) as HTMLButtonElement | null;
      el?.focus();
    }
  }, [selectedTaskId]);

  // Focus task from URL param ?task=ID
  useEffect(() => {
    const tid = searchParams?.get('task');
    if (!tid) return;
    setTimeout(() => setSelectedTaskId(tid), 0);
  }, [searchParams]);

  const userCanEdit = project && user ? canEditTasks(project, user.uid) : false;
  
  // Calculate overall progress
  const allTasks = Object.values(tasks).flat();
  const doneCol = columns.find(c => c.name.toLowerCase().includes('done'))?.columnId || columns[columns.length-1]?.columnId || '';
  const progress = calculateProgress(allTasks, doneCol);

  return (
    <ErrorBoundary>
      {!user ? null : error ? (
        <main className="p-6 text-red-600">{error}</main>
      ) : !project ? (
        <main className="p-6">Loading…</main>
      ) : (
        <main className="min-h-screen p-6 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-semibold nb-brand-text">{project.name}</h1>
                <Link href="/boards" className="h-9 px-3 rounded-md nb-btn-secondary hover:bg-white/5">All Boards</Link>
              </div>
              {allTasks.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full nb-chip-teal transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs opacity-70 whitespace-nowrap">
                    {progress.done}/{progress.total} ({progress.percentage}%)
                  </div>
                </div>
              )}
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {columns.map((c) => (
                  <Droppable droppableId={c.columnId} key={c.columnId}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="rounded-xl nb-card nb-shadow p-3 min-h-[240px]">
                        <div className="font-medium mb-2 flex items-center justify-between">
                          <span>{c.name}</span>
                          {userCanEdit && (
                            <div className="flex items-center gap-2">
                              <input
                                ref={(el) => { inputRefs.current.set(c.columnId, el); }}
                                value={newTitle[c.columnId] || ""}
                                onChange={(e) => setNewTitle({ ...newTitle, [c.columnId]: e.target.value })}
                                placeholder="New task"
                                className="h-8 px-2 rounded-md bg-transparent border border-white/10"
                              />
                          <button onClick={async () => { const title = (newTitle[c.columnId] || "").trim(); if (!title || !project) return; try { await createTask(project.projectId, c.columnId, title); setNewTitle({ ...newTitle, [c.columnId]: "" }); setColErrors((e)=>({ ...e, [c.columnId]: undefined })); addToast({ title: 'Task created', kind: 'success' }); } catch (e: unknown) { const msg = (e as Error)?.message || 'Create failed'; setColErrors((prev)=>({ ...prev, [c.columnId]: msg })); addToast({ title: msg, kind: 'error' }); } }} className="h-8 px-3 rounded-md nb-btn-primary">Add</button>
                            </div>
                          )}
                        </div>
                        {colErrors[c.columnId] && (<div className="text-xs text-red-300 mb-1">{colErrors[c.columnId]}</div>)}
                        <div className="space-y-2">
                          {(tasks[c.columnId] || []).map((t, idx) => {
                            const subs = Object.values(tasks).flat().filter((st) => st.parentTaskId === t.taskId);
                            const doneCol = (columns.find(col=>col.name.toLowerCase().includes('done'))?.columnId) || columns[columns.length-1]?.columnId;
                            const doneCount = subs.filter((s) => s.columnId === doneCol).length;
                            const hasSubtasks = subs.length > 0;
                            return (
                            <Draggable draggableId={t.taskId} index={idx} key={t.taskId} isDragDisabled={!userCanEdit}>
                              {(prov) => (
                                <button data-task-id={t.taskId} ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} onClick={() => setSelectedTaskId(t.taskId)} className={`w-full text-left rounded-lg p-3 border transition-colors ${selectedTaskId===t.taskId ? 'ring-2 ring-[--nb-ring] bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} tabIndex={selectedTaskId===t.taskId ? 0 : -1}>
                                  <div className="text-sm font-medium flex items-center justify-between gap-2">
                                    <span className="truncate">{t.title}</span>
                                    <DueChip due={t.dueDate} />
                                  </div>
                                  {t.description && <div className="text-xs opacity-70 line-clamp-2 mt-1">{t.description}</div>}
                                  {hasSubtasks && (
                                    <div className="mt-2">
                                      <div className="h-1 w-full rounded bg-white/10">
                                        <div className="h-1 rounded nb-chip-teal" style={{ width: `${subs.length ? Math.round((doneCount / subs.length) * 100) : 0}%` }} />
                                      </div>
                                      <div className="text-[10px] opacity-60 mt-0.5">{doneCount}/{subs.length} subtasks</div>
                                    </div>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                                    {(() => { const m = memberProfiles.find((mp) => mp.uid === t.assigneeId); return t.assigneeId ? (<div className="flex items-center gap-1"><Avatar uid={t.assigneeId!} name={m?.name} email={m?.email} /><span>{m?.name || m?.email || 'Assignee'}</span></div>) : null; })()}
                                  </div>
                                </button>
                              )}
                            </Draggable>
                          );})}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>
        </main>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Task">
        {editing && (
          <TaskEditor
            task={editing}
            members={memberProfiles}
            projectId={project!.projectId}
            doneColumnId={(columns.find(c=>c.name.toLowerCase().includes('done'))?.columnId) || columns[columns.length-1]?.columnId || ''}
            subtasks={Object.values(tasks).flat().filter((t)=>t.parentTaskId===editing.taskId)}
            currentUserId={user!.uid}
            ownerId={project!.ownerId}
            onCreateSubtask={async (title)=>{
              const col = columns[0]?.columnId; if(!col) return;
              await createTask(project!.projectId, col, title, { parentTaskId: editing.taskId });
            }}
            onToggleSubtask={async (sub, done)=>{
              const doneCol = (columns.find(c=>c.name.toLowerCase().includes('done'))?.columnId) || columns[columns.length-1]?.columnId || columns[0]?.columnId;
              const firstCol = columns[0]?.columnId;
              const col = done ? doneCol : firstCol;
              if (!col) return;
              await updateTask(project!.projectId, sub.taskId, { columnId: col });
            }}
            onClose={() => setEditing(null)}
            onSave={async (data) => {
              const projectId = project!.projectId;
              const taskId = editing.taskId;
              const oldTask = editing;
              
              // Check for assignment change
              if (data.assigneeId && data.assigneeId !== oldTask.assigneeId && data.assigneeId !== user!.uid) {
                const { addNotification } = await import("@/lib/notifications");
                const assigneeName = memberProfiles.find(m => m.uid === data.assigneeId)?.name || 'Someone';
                await addNotification(projectId, {
                  userId: data.assigneeId,
                  taskId,
                  type: "assignment",
                  title: "You were assigned to a task",
                  text: oldTask.title,
                });
              }
              
              await updateTask(projectId, taskId, data);
            }}
            onDelete={async () => {
              // Find Backlog column or use first column as fallback
              const backlogCol = columns.find(c => c.name.toLowerCase().includes('backlog'))?.columnId || columns[0]?.columnId || '';
              await deleteTaskWithOrphans(project!.projectId, editing.taskId, backlogCol);
            }}
          />
        )}
      </Modal>
    </ErrorBoundary>
  );
}
