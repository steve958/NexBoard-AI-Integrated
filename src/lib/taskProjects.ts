"use client";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, getDocs } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { TaskProject } from "@/lib/taskProjectTypes";

export function listenUserTaskProjects(userId: string, cb: (projects: TaskProject[]) => void) {
  const db = getDbClient();
  const q = query(
    collection(db, "taskProjects"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    const items: TaskProject[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<TaskProject, "projectId">;
      items.push({ projectId: d.id, ...data });
    });
    // Sort by createdAt on the client side
    items.sort((a, b) => {
      const aTime = a.createdAt && 'toMillis' in a.createdAt ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt && 'toMillis' in b.createdAt ? b.createdAt.toMillis() : 0;
      return bTime - aTime; // desc order
    });
    cb(items);
  }, (error) => {
    console.error("Error listening to task projects:", error);
    cb([]); // Return empty array on error
  });
}

export async function createTaskProject(userId: string, name: string, color?: string) {
  const db = getDbClient();
  const ref = collection(db, "taskProjects");
  await addDoc(ref, {
    name,
    color: color || "#2ea7a0", // default to teal
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTaskProject(projectId: string, data: Partial<Omit<TaskProject, "projectId" | "userId">>) {
  const db = getDbClient();
  await updateDoc(doc(db, "taskProjects", projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTaskProject(projectId: string) {
  const db = getDbClient();
  await deleteDoc(doc(db, "taskProjects", projectId));
}

// Count tasks across all boards that reference this project
export async function countTasksByProject(projectId: string, userId: string): Promise<number> {
  const db = getDbClient();

  // We need to query all boards and their tasks
  // This is a bit expensive but necessary given the data structure
  // Get only boards where the user is a member (to satisfy security rules)
  const boardsQuery = query(
    collection(db, "projects"),
    where("members", "array-contains", userId)
  );
  const boardsSnap = await getDocs(boardsQuery);

  let count = 0;

  // For each board, query tasks with matching projectId
  for (const boardDoc of boardsSnap.docs) {
    const tasksQuery = query(
      collection(db, `projects/${boardDoc.id}/tasks`),
      where("projectId", "==", projectId)
    );
    const tasksSnap = await getDocs(tasksQuery);
    count += tasksSnap.size;
  }

  return count;
}

// Get task counts for multiple projects at once
export async function countTasksByProjects(projectIds: string[], userId: string): Promise<Record<string, number>> {
  const db = getDbClient();
  const counts: Record<string, number> = {};

  // Initialize all counts to 0
  projectIds.forEach(id => counts[id] = 0);

  // Get only boards where the user is a member (to satisfy security rules)
  const boardsQuery = query(
    collection(db, "projects"),
    where("members", "array-contains", userId)
  );
  const boardsSnap = await getDocs(boardsQuery);

  // For each board, get all tasks and count by projectId
  for (const boardDoc of boardsSnap.docs) {
    const tasksQuery = query(collection(db, `projects/${boardDoc.id}/tasks`));
    const tasksSnap = await getDocs(tasksQuery);

    tasksSnap.forEach(taskDoc => {
      const taskData = taskDoc.data();
      if (taskData.projectId && projectIds.includes(taskData.projectId)) {
        counts[taskData.projectId]++;
      }
    });
  }

  return counts;
}
