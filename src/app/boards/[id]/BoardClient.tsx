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
import type { TaskProject } from "@/lib/taskProjectTypes";
import { listenUserTaskProjects } from "@/lib/taskProjects";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { listenTasksByColumn, createTask, updateTask, computeNewOrder, deleteTask, deleteTaskWithOrphans } from "@/lib/tasks";
import TaskModal from "@/components/TaskModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useToast } from "@/components/ToastProvider";
import { useDialog } from "@/components/DialogProvider";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<TaskProject[]>([]);
  const tasksUnsubsRef = useRef<(() => void)[]>([]);
  const { addToast } = useToast();
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [gPressed, setGPressed] = useState(false);

  // Listen to user's task projects
  useEffect(() => {
    if (!user) return;
    const unsub = listenUserTaskProjects(user.uid, setUserProjects);
    return () => unsub();
  }, [user]);

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
      { id: `boards:${project.projectId}:new-in-first`, title: `New task in "${columns[0]?.name || 'First column'}"`, group: 'Board', shortcut: 'N', run: () => { if (!firstCol) return; setModalMode('create'); setModalColumnId(firstCol); setModalTask(null); setModalOpen(true); } },
      { id: `boards:${project.projectId}:open-boards`, title: 'Open Boards list', group: 'Navigation', shortcut: 'G B', run: () => { window.location.href = '/boards'; } },
      { id: `boards:${project.projectId}:edit-selected`, title: 'Edit selected task', group: 'Task', shortcut: 'E', run: () => { const task = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId); if (task) { setModalMode('edit'); setModalTask(task); setModalOpen(true); } } },
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
        if (first) {
          setModalMode('create');
          setModalColumnId(first);
          setModalTask(null);
          setModalOpen(true);
        }
      } else if ((key === 'e' || key === 'enter') && selectedTaskId && project) {
        const task = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId);
        if (task) {
          setModalMode('edit');
          setModalTask(task);
          setModalOpen(true);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTaskId && project) {
        const task = Object.values(tasks).flat().find(t => t.taskId === selectedTaskId);
        if (!task) return;
        const subs = Object.values(tasks).flat().filter((st) => st.parentTaskId === task.taskId);
        const title = subs.length > 0 ? 'Delete task with subtasks?' : 'Delete task?';
        const message = subs.length > 0
          ? `Are you sure you want to delete "${task.title}"?\n\n${subs.length} subtask(s) will be moved to the Backlog column.`
          : `Are you sure you want to delete "${task.title}"?`;

        confirm({ title, message, confirmText: 'Delete', danger: true }).then((confirmed) => {
          if (!confirmed) return;
          const backlogCol = columns.find(c => c.name.toLowerCase().includes('backlog'))?.columnId || columns[0]?.columnId || '';
          const deletePromise = subs.length > 0 ? deleteTaskWithOrphans(project.projectId, selectedTaskId, backlogCol) : deleteTask(project.projectId, selectedTaskId);
          deletePromise.then(()=>addToast({ title: 'Task deleted', kind: 'success'})).catch(()=>addToast({ title: 'Delete failed', kind: 'error'}));
          setSelectedTaskId(null);
        });
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
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold" style={{ color: 'var(--nb-coral)' }}>{error}</div>
          </div>
        </main>
      ) : !project ? (
        <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nb-bg)' }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--nb-teal), var(--nb-accent))' }}>
              <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="text-lg font-semibold mb-2" style={{ color: 'var(--nb-ink)' }}>Loading board...</div>
            <div className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Please wait</div>
          </div>
        </main>
      ) : (
        <main className="min-h-screen" style={{ backgroundColor: 'var(--nb-bg)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-black nb-brand-text mb-2 tracking-tight">{project.name}</h1>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-teal) 10%, transparent)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-teal)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm font-bold" style={{ color: 'var(--nb-teal)' }}>
                        {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/boards"
                  className="h-11 px-5 rounded-xl nb-btn-secondary hover:bg-white/5 flex items-center gap-2.5 font-semibold transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  All Boards
                </Link>
              </div>

              {/* Progress Bar */}
              {allTasks.length > 0 && (
                <div className="nb-card-elevated rounded-2xl p-6 shadow-lg border border-opacity-10" style={{ borderColor: 'var(--nb-ink)' }}>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--nb-teal), var(--nb-accent))' }}>
                        <span className="text-white text-xl font-bold z-10">{progress.percentage}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-bold tracking-tight" style={{ color: 'var(--nb-ink)' }}>Overall Progress</span>
                      </div>
                      <div className="h-4 rounded-full overflow-hidden shadow-inner" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 8%, transparent)' }}>
                        <div
                          className="h-full transition-all duration-700 ease-out relative overflow-hidden"
                          style={{
                            width: `${progress.percentage}%`,
                            background: 'linear-gradient(90deg, var(--nb-teal), var(--nb-accent))',
                          }}
                        >
                          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--nb-teal)' }}>
                          {progress.done} completed
                        </span>
                        <span className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                          • {progress.total - progress.done} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Board Columns */}
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {columns.map((c) => {
                  const columnTasks = tasks[c.columnId] || [];
                  return (
                    <div
                      key={c.columnId}
                      className="rounded-2xl"
                      style={{
                        backgroundColor: 'var(--nb-card)',
                        border: '1px solid color-mix(in srgb, var(--nb-ink) 8%, transparent)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
                        minHeight: '500px',
                      }}
                    >
                      {/* Column Header */}
                      <div className="p-6 pb-4 border-b" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 12%, transparent)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--nb-teal)' }}></div>
                            <h2 className="font-bold text-lg tracking-tight" style={{ color: 'var(--nb-ink)' }}>{c.name}</h2>
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--nb-teal) 20%, transparent)',
                                color: 'var(--nb-teal)'
                              }}
                            >
                              {columnTasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Add Task Button */}
                        {userCanEdit && (
                          <button
                            onClick={() => {
                              setModalMode('create');
                              setModalColumnId(c.columnId);
                              setModalTask(null);
                              setModalOpen(true);
                            }}
                            className="w-full h-10 rounded-lg nb-btn-primary flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Task
                          </button>
                        )}
                      </div>

                          {/* Tasks List */}
                          <Droppable droppableId={c.columnId}>
                            {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-4"
                            style={{
                              backgroundColor: snapshot.isDraggingOver
                                ? 'color-mix(in srgb, var(--nb-teal) 5%, transparent)'
                                : 'transparent',
                              borderRadius: snapshot.isDraggingOver ? '12px' : '0',
                              minHeight: '300px',
                            }}
                          >
                            {columnTasks.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 5%, transparent)' }}>
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'color-mix(in srgb, var(--nb-ink) 30%, transparent)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                  </svg>
                                </div>
                                <p className="text-sm font-medium text-center" style={{ color: 'color-mix(in srgb, var(--nb-ink) 40%, transparent)' }}>
                                  No tasks yet
                                </p>
                                {userCanEdit && (
                                  <p className="text-xs text-center mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 30%, transparent)' }}>
                                    Drag a task here or use the quick add above
                                  </p>
                                )}
                              </div>
                            )}
                            {columnTasks.map((t, idx) => {
                              const subs = Object.values(tasks).flat().filter((st) => st.parentTaskId === t.taskId);
                              const doneCol = (columns.find(col=>col.name.toLowerCase().includes('done'))?.columnId) || columns[columns.length-1]?.columnId;
                              const doneCount = subs.filter((s) => s.columnId === doneCol).length;
                              const hasSubtasks = subs.length > 0;
                              const assignee = memberProfiles.find((mp) => mp.uid === t.assigneeId);

                              return (
                                <Draggable draggableId={t.taskId} index={idx} key={t.taskId} isDragDisabled={!userCanEdit}>
                                  {(prov, dragSnapshot) => (
                                    <div
                                      data-task-id={t.taskId}
                                      ref={prov.innerRef}
                                      {...prov.draggableProps}
                                      {...prov.dragHandleProps}
                                      onClick={() => {
                                        setSelectedTaskId(t.taskId);
                                        setModalMode('edit');
                                        setModalTask(t);
                                        setModalOpen(true);
                                      }}
                                      className="w-full rounded-xl p-4 group relative mb-3"
                                      style={{
                                        backgroundColor: 'var(--nb-card)',
                                        boxShadow: dragSnapshot.isDragging
                                          ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--nb-teal)'
                                          : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                        opacity: dragSnapshot.isDragging ? 0.95 : 1,
                                        border: selectedTaskId === t.taskId
                                          ? '2px solid var(--nb-ring)'
                                          : '1px solid color-mix(in srgb, var(--nb-ink) 10%, transparent)',
                                        cursor: userCanEdit ? (dragSnapshot.isDragging ? 'grabbing' : 'grab') : 'pointer',
                                        transition: 'none',
                                        ...prov.draggableProps.style,
                                      }}
                                      tabIndex={selectedTaskId===t.taskId ? 0 : -1}
                                    >
                                      {/* Drag Indicator */}
                                      {userCanEdit && !dragSnapshot.isDragging && (
                                        <div
                                          className="absolute right-2 top-[50%] opacity-0 group-hover:opacity-40 transition-opacity duration-200"
                                          style={{ color: 'var(--nb-teal)', marginTop: '-10px', pointerEvents: 'none' }}
                                        >
                                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 3a2 2 0 100 4 2 2 0 000-4zm0 7a2 2 0 100 4 2 2 0 000-4zm0 7a2 2 0 100 4 2 2 0 000-4zm6-14a2 2 0 100 4 2 2 0 000-4zm0 7a2 2 0 100 4 2 2 0 000-4zm0 7a2 2 0 100 4 2 2 0 000-4z"/>
                                          </svg>
                                        </div>
                                      )}

                                      {/* Task Header */}
                                      <div className="flex items-start gap-2 mb-3">
                                        <h3 className="flex-1 text-base font-bold leading-snug tracking-tight" style={{ color: 'var(--nb-ink)' }}>
                                          {t.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          {t.priority && (
                                            <span
                                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                              style={{
                                                backgroundColor: t.priority === 'urgent' ? 'var(--nb-coral)' :
                                                  t.priority === 'high' ? 'color-mix(in srgb, var(--nb-coral) 60%, var(--nb-accent))' :
                                                  t.priority === 'medium' ? 'var(--nb-accent)' :
                                                  'color-mix(in srgb, var(--nb-ink) 20%, transparent)',
                                                color: t.priority === 'low' ? 'var(--nb-ink)' : '#1d1d1d'
                                              }}
                                            >
                                              {t.priority}
                                            </span>
                                          )}
                                          <DueChip due={t.dueDate} />
                                        </div>
                                      </div>

                                      {/* Description */}
                                      {t.description && (
                                        <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'color-mix(in srgb, var(--nb-ink) 65%, transparent)' }}>
                                          {t.description}
                                        </p>
                                      )}

                                      {/* Project Badge */}
                                      {t.projectId && (() => {
                                        const taskProject = userProjects.find(p => p.projectId === t.projectId);
                                        return taskProject ? (
                                          <div className="mb-3">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ backgroundColor: `${taskProject.color}20` }}>
                                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskProject.color || '#2ea7a0' }}></div>
                                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: taskProject.color || '#2ea7a0' }}>
                                                {taskProject.name}
                                              </span>
                                            </div>
                                          </div>
                                        ) : null;
                                      })()}

                                      {/* Subtasks Progress */}
                                      {hasSubtasks && (
                                        <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-teal) 5%, transparent)' }}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-teal)' }}>
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                                              Subtasks
                                            </span>
                                          </div>
                                          <div className="h-2.5 w-full rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)' }}>
                                            <div
                                              className="h-2.5 rounded-full transition-all duration-500 ease-out"
                                              style={{
                                                width: `${subs.length ? Math.round((doneCount / subs.length) * 100) : 0}%`,
                                                background: 'linear-gradient(90deg, var(--nb-teal), var(--nb-accent))'
                                              }}
                                            />
                                          </div>
                                          <div className="text-xs font-bold" style={{ color: 'var(--nb-teal)' }}>
                                            {doneCount}/{subs.length} completed
                                          </div>
                                        </div>
                                      )}

                                      {/* Footer - Assignee & Estimation */}
                                      {(t.assigneeId || t.estimation) && (
                                        <div className="flex items-center gap-2.5 pt-3 mt-3 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 12%, transparent)' }}>
                                          {t.assigneeId && (
                                            <>
                                              <Avatar uid={t.assigneeId} name={assignee?.name} email={assignee?.email} size={28} />
                                              <div className="flex-1">
                                                <span className="text-xs font-bold block" style={{ color: 'var(--nb-ink)' }}>
                                                  {assignee?.name || assignee?.email || 'Assignee'}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                                                  Assigned
                                                </span>
                                              </div>
                                            </>
                                          )}
                                          {t.estimation && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-accent) 15%, transparent)' }}>
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-accent)' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span className="text-xs font-bold" style={{ color: 'var(--nb-accent)' }}>
                                                {t.estimation}h
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Selected Indicator */}
                                      {selectedTaskId === t.taskId && (
                                        <>
                                          <div
                                            className="absolute top-0 right-0 w-1.5 h-full rounded-l-full"
                                            style={{
                                              background: 'linear-gradient(180deg, var(--nb-teal), var(--nb-accent))',
                                              boxShadow: '0 0 8px var(--nb-teal)'
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 rounded-xl pointer-events-none"
                                            style={{
                                              boxShadow: 'inset 0 0 0 2px var(--nb-ring)',
                                              animation: 'pulse 2s ease-in-out infinite'
                                            }}
                                          />
                                        </>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                            )}
                          </Droppable>
                        </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        </main>
      )}
      {modalOpen && project && user && (
        <TaskModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalTask(null);
            setModalColumnId(null);
          }}
          mode={modalMode}
          task={modalTask || undefined}
          columnId={modalColumnId || undefined}
          projectId={project.projectId}
          doneColumnId={(columns.find(c=>c.name.toLowerCase().includes('done'))?.columnId) || columns[columns.length-1]?.columnId || ''}
          members={memberProfiles}
          subtasks={modalTask ? Object.values(tasks).flat().filter((t)=>t.parentTaskId===modalTask.taskId) : []}
          currentUserId={user.uid}
          ownerId={project.ownerId}
          onCreateSubtask={async (title)=>{
            if (!modalTask) return;
            const col = columns[0]?.columnId;
            if(!col) return;
            await createTask(project.projectId, col, title, { parentTaskId: modalTask.taskId });
          }}
          onToggleSubtask={async (sub, done)=>{
            const doneCol = (columns.find(c=>c.name.toLowerCase().includes('done'))?.columnId) || columns[columns.length-1]?.columnId || columns[0]?.columnId;
            const firstCol = columns[0]?.columnId;
            const col = done ? doneCol : firstCol;
            if (!col) return;
            await updateTask(project.projectId, sub.taskId, { columnId: col });
          }}
          onSave={async (data) => {
            if (modalMode === 'create') {
              // Create new task
              if (!modalColumnId) return;
              try {
                await createTask(project.projectId, modalColumnId, data.title || 'Untitled', {
                  description: data.description,
                  assigneeId: data.assigneeId,
                  estimation: data.estimation,
                  priority: data.priority,
                  dueDate: data.dueDate,
                });
                addToast({ title: 'Task created', kind: 'success' });

                // Notify assignee if assigned
                if (data.assigneeId && data.assigneeId !== user.uid) {
                  const { addNotification } = await import("@/lib/notifications");
                  await addNotification(project.projectId, {
                    userId: data.assigneeId,
                    taskId: '', // We don't have the ID yet, but notification system should handle this
                    type: "assignment",
                    title: "You were assigned to a task",
                    text: data.title || 'Untitled',
                  }).catch(() => {}); // Silent fail
                }
              } catch (e: unknown) {
                addToast({ title: (e as Error)?.message || 'Create failed', kind: 'error' });
                throw e; // Re-throw to prevent modal from closing
              }
            } else {
              // Update existing task
              if (!modalTask) return;
              const oldTask = modalTask;

              // Check for assignment change
              if (data.assigneeId && data.assigneeId !== oldTask.assigneeId && data.assigneeId !== user.uid) {
                const { addNotification } = await import("@/lib/notifications");
                await addNotification(project.projectId, {
                  userId: data.assigneeId,
                  taskId: oldTask.taskId,
                  type: "assignment",
                  title: "You were assigned to a task",
                  text: oldTask.title,
                }).catch(() => {}); // Silent fail
              }

              await updateTask(project.projectId, oldTask.taskId, data);
            }
          }}
          onDelete={async () => {
            if (!modalTask) return;
            const backlogCol = columns.find(c => c.name.toLowerCase().includes('backlog'))?.columnId || columns[0]?.columnId || '';
            await deleteTaskWithOrphans(project.projectId, modalTask.taskId, backlogCol);
          }}
        />
      )}
    </ErrorBoundary>
  );
}
