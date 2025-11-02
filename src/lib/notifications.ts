"use client";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc, where, type Timestamp } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";

export type Notification = {
  notificationId: string;
  userId: string;
  projectId: string;
  taskId?: string;
  type: "mention" | "assignment" | "status-change" | "comment" | "system";
  title?: string;
  text?: string;
  read?: boolean;
  createdAt?: Timestamp;
};

export async function addNotification(projectId: string, data: Omit<Notification, "notificationId" | "projectId" | "createdAt" | "read">) {
  const db = getDbClient();
  await addDoc(collection(db, `projects/${projectId}/notifications`), {
    ...data,
    projectId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function listenNotificationsForUser(projectId: string, userId: string, cb: (items: Notification[]) => void) {
  const db = getDbClient();
  const q = query(
    collection(db, `projects/${projectId}/notifications`),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const items: Notification[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<Notification, "notificationId">;
      items.push({ notificationId: d.id, ...data });
    });
    cb(items);
  });
}

export async function markNotificationRead(projectId: string, notificationId: string) {
  const db = getDbClient();
  await updateDoc(doc(db, `projects/${projectId}/notifications/${notificationId}`), { read: true });
}
