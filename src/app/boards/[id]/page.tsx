"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { Column, Project } from "@/lib/types";
import type { Task } from "@/lib/taskTypes";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { listenTasksByColumn, createTask, updateTask, computeNewOrder, deleteTask } from "@/lib/tasks";
import Modal from "@/components/Modal";
import TaskEditor from "@/components/TaskEditor";

export default function BoardDetail({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [newTitle, setNewTitle] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => {
    if (!user) return;
    const db = getDbClient();
    (async () => {
      try {
        const pRef = doc(db, "projects", params.id);
        const pSnap = await getDoc(pRef);
        if (!pSnap.exists()) {
          setError("Board not found");
          return;
        }
        const data = pSnap.data() as any;
        if (!data.members?.includes(user.uid)) {
          setError("You do not have access to this board");
          return;
        }
        setProject({ projectId: pSnap.id, ...data } as Project);
        const q = query(collection(db, `projects/${params.id}/columns`), orderBy("order"));
        const unsub = onSnapshot(q, (snap) => {
          const cols: Column[] = [];
          const unsubs: (() => void)[] = [];
          snap.forEach((d) => {
            const col = { columnId: d.id, ...(d.data() as any) } as Column;
            cols.push(col);
            const off = listenTasksByColumn(params.id, col.columnId, (list) =>
              setTasks((prev) => ({ ...prev, [col.columnId]: list }))
            );
            unsubs.push(off);
          });
          setColumns(cols);
        });
        return () => unsub();
      } catch (e: any) {
        setError(e?.message || "Failed to load board");
      }
    })();
  }, [user, params.id]);

  if (!user) return null;
  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!project) return <main className="p-6">Loading…</main>;

  function onDragEnd(result: DropResult) {
    if (!project) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const fromCol = source.droppableId;
    const toCol = destination.droppableId;
    if (fromCol === toCol && source.index === destination.index) return;
    const fromTasks = tasks[fromCol] || [];
    const toTasks = tasks[toCol] || [];
    // Compute new order at destination
    const reordered = [...toTasks];
    const moving: Task = (tasks[fromCol] || []).find((t) => t.taskId === draggableId)!;
    // Remove from source
    const srcList = [...fromTasks].filter((t) => t.taskId !== draggableId);
    // Insert into destination at index
    reordered.splice(destination.index, 0, moving);
    const newOrder = computeNewOrder(reordered, destination.index);
    updateTask(project.projectId, draggableId, { columnId: toCol, order: newOrder });
    // Optimistic local state
    setTasks({ ...tasks, [fromCol]: srcList, [toCol]: reordered.map((t, i) => (i === destination.index ? { ...t, order: newOrder, columnId: toCol } : t)) });
  }

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold mb-6">{project.name}</h1>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {columns.map((c) => (
              <Droppable droppableId={c.columnId} key={c.columnId}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="rounded-md nb-card p-3 min-h-[200px]">
                    <div className="font-medium mb-2 flex items-center justify-between">
                      <span>{c.name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={newTitle[c.columnId] || ""}
                          onChange={(e) => setNewTitle({ ...newTitle, [c.columnId]: e.target.value })}
                          placeholder="New task"
                          className="h-8 px-2 rounded-md bg-transparent border border-white/10"
                        />
                        <button
                          onClick={async () => {
                            const title = (newTitle[c.columnId] || "").trim();
                            if (!title || !project) return;
                            await createTask(project.projectId, c.columnId, title);
                            setNewTitle({ ...newTitle, [c.columnId]: "" });
                          }}
                          className="h-8 px-3 rounded-md nb-btn-primary"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(tasks[c.columnId] || []).map((t, idx) => (
                        <Draggable draggableId={t.taskId} index={idx} key={t.taskId}>
                          {(prov) => (
                            <button ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="w-full text-left rounded-md bg-white/5 p-2 hover:bg-white/10" onClick={() => setEditing(t)}>
                              <div className="text-sm font-medium">{t.title}</div>
                              {t.description && <div className="text-xs opacity-70 line-clamp-2 mt-1">{t.description}</div>}
                            </button>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Task">
        {editing && project && (
          <TaskEditor
            task={editing}
            onClose={() => setEditing(null)}
            onSave={async (data) => updateTask(project.projectId, editing.taskId, data)}
            onDelete={async () => deleteTask(project.projectId, editing.taskId)}
          />
        )}
      </Modal>
    </main>
  );
}
