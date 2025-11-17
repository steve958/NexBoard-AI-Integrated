"use client";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { Task } from "@/lib/taskTypes";
import { between, midKey } from "@/lib/order";

export function listenTasksByColumn(projectId: string, columnId: string, cb: (tasks: Task[]) => void) {
  const db = getDbClient();
  const q = query(collection(db, `projects/${projectId}/tasks`), where("columnId", "==", columnId), orderBy("order"));
  return onSnapshot(q, (snap) => {
    const items: Task[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<Task, "taskId">;
      // Only include tasks that are NOT subtasks (don't have a parentTaskId)
      if (!data.parentTaskId) {
        items.push({ taskId: d.id, ...data });
      }
    });
    cb(items);
  });
}

export async function createTask(projectId: string, columnId: string, title: string, extra?: Partial<Task>) {
  const db = getDbClient();
  const ref = collection(db, `projects/${projectId}/tasks`);
  await addDoc(ref, {
    title,
    columnId,
    order: midKey(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  });
}

export async function updateTask(projectId: string, taskId: string, data: Partial<Task>) {
  const db = getDbClient();
  await updateDoc(doc(db, `projects/${projectId}/tasks/${taskId}`), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTask(projectId: string, taskId: string) {
  const db = getDbClient();
  await deleteDoc(doc(db, `projects/${projectId}/tasks/${taskId}`));
}

export async function deleteTaskWithOrphans(projectId: string, taskId: string, backlogColumnId: string) {
  const db = getDbClient();
  // Reassign children
  const q = query(collection(db, `projects/${projectId}/tasks`), where("parentTaskId", "==", taskId));
  const snap = await (await import("firebase/firestore")).getDocs(q);
  const batch = (await import("firebase/firestore")).writeBatch(db);
  snap.forEach((d) => {
    batch.update(d.ref, { parentTaskId: null, columnId: backlogColumnId, order: midKey(), updatedAt: serverTimestamp() });
  });
  batch.delete(doc(db, `projects/${projectId}/tasks/${taskId}`));
  await batch.commit();
}

export function computeNewOrder(siblings: Task[], index: number): string {
  const prev = index > 0 && siblings[index - 1] ? siblings[index - 1].order : null;
  const next = index < siblings.length && siblings[index] ? siblings[index].order : null;
  return between(prev, next);
}

// Count todo (non-done) tasks for a board
export async function countTodoTasksForBoard(projectId: string): Promise<number> {
  const db = getDbClient();

  // Get all columns to find the "done" column
  const columnsSnap = await (await import("firebase/firestore")).getDocs(
    collection(db, `projects/${projectId}/columns`)
  );

  const doneColumnId = columnsSnap.docs
    .find(doc => doc.data().name?.toLowerCase().includes('done'))?.id;

  // Get all tasks
  const tasksSnap = await (await import("firebase/firestore")).getDocs(
    collection(db, `projects/${projectId}/tasks`)
  );

  // Count tasks that are NOT in the done column AND are NOT subtasks
  let count = 0;
  tasksSnap.forEach(doc => {
    const task = doc.data();
    // Exclude subtasks (tasks with parentTaskId) and tasks in done column
    if (!task.parentTaskId && (!doneColumnId || task.columnId !== doneColumnId)) {
      count++;
    }
  });

  return count;
}

// Count todo tasks for multiple boards at once
export async function countTodoTasksForBoards(projectIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Process boards in parallel for better performance
  await Promise.all(
    projectIds.map(async (projectId) => {
      counts[projectId] = await countTodoTasksForBoard(projectId);
    })
  );

  return counts;
}
