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
    snap.forEach((d) => items.push({ taskId: d.id, ...(d.data() as any) } as Task));
    cb(items);
  });
}

export async function createTask(projectId: string, columnId: string, title: string) {
  const db = getDbClient();
  const ref = collection(db, `projects/${projectId}/tasks`);
  await addDoc(ref, {
    title,
    columnId,
    order: midKey(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

export function computeNewOrder(siblings: Task[], index: number): string {
  const prev = index > 0 ? siblings[index - 1].order : null;
  const next = index < siblings.length ? siblings[index]?.order : null;
  return between(prev, next);
}
