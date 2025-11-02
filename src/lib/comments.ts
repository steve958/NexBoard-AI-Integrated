"use client";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc, type Timestamp } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";

export type Comment = {
  commentId: string;
  taskId: string;
  projectId: string;
  authorId: string;
  text: string;
  createdAt?: Timestamp;
  editedAt?: Timestamp;
  hidden?: boolean;
  moderatedBy?: string;
  moderatedAt?: Timestamp;
};

export function listenComments(projectId: string, taskId: string, cb: (comments: Comment[]) => void) {
  const db = getDbClient();
  const q = query(
    collection(db, `projects/${projectId}/comments`),
    where("taskId", "==", taskId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const items: Comment[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<Comment, "commentId">;
      items.push({ commentId: d.id, ...data });
    });
    cb(items);
  });
}

export async function addComment(projectId: string, taskId: string, authorId: string, text: string) {
  const db = getDbClient();
  await addDoc(collection(db, `projects/${projectId}/comments`), {
    taskId,
    projectId,
    authorId,
    text,
    hidden: false,
    createdAt: serverTimestamp(),
  });
}

export async function updateComment(projectId: string, commentId: string, data: Record<string, unknown>) {
  const db = getDbClient();
  await updateDoc(doc(db, `projects/${projectId}/comments/${commentId}`), data);
}

export async function deleteComment(projectId: string, commentId: string) {
  const db = getDbClient();
  await deleteDoc(doc(db, `projects/${projectId}/comments/${commentId}`));
}
