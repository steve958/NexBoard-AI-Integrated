"use client";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, getDocs, arrayUnion, arrayRemove, documentId, writeBatch } from "firebase/firestore";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import type { Project } from "@/lib/types";
import { User } from "firebase/auth";

const PROJECTS = "projects";

export function listenProjectsForUser(userId: string, cb: (projects: Project[]) => void) {
  const db = getDbClient();
  const q = query(collection(db, PROJECTS), where("members", "array-contains", userId));
  const unsub = onSnapshot(q, (snap) => {
    const items: Project[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (data.archived) return; // client-side filter for MVP
      items.push({ projectId: d.id, ...data } as Project);
    });
    cb(items);
  });
  return unsub;
}

export async function createProject(user: User, name: string) {
  const db = getDbClient();
  const ref = doc(collection(db, PROJECTS));
  const batch = writeBatch(db);
  batch.set(ref, {
    name,
    ownerId: user.uid,
    members: [user.uid],
    archived: false,
    createdAt: serverTimestamp(),
  });
  const cols = ["To Do", "In Progress", "Done"];
  cols.forEach((c, idx) => {
    const colRef = doc(collection(db, `projects/${ref.id}/columns`));
    batch.set(colRef, { name: c, order: idx });
  });
  await batch.commit();
  return ref.id;
}

export async function renameProject(projectId: string, name: string) {
  const db = getDbClient();
  await updateDoc(doc(db, PROJECTS, projectId), { name });
}

export async function archiveProject(projectId: string) {
  const db = getDbClient();
  await updateDoc(doc(db, PROJECTS, projectId), { archived: true });
}

export async function addMemberByEmail(projectId: string, email: string) {
  const db = getDbClient();
  const usersQ = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(usersQ);
  if (snap.empty) throw new Error("User with this email not found");
  const uid = snap.docs[0].id;
  await updateDoc(doc(db, PROJECTS, projectId), { members: arrayUnion(uid) });
}

export async function removeMemberByEmail(projectId: string, email: string) {
  const db = getDbClient();
  const usersQ = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(usersQ);
  if (snap.empty) throw new Error("User with this email not found");
  const uid = snap.docs[0].id;
  await updateDoc(doc(db, PROJECTS, projectId), { members: arrayRemove(uid) });
}

export type UserProfile = { uid: string; email?: string; name?: string };

export async function getUsersByIds(uids: string[]): Promise<UserProfile[]> {
  const db = getDbClient();
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
  const results: UserProfile[] = [];
  for (const chunk of chunks) {
    const q = query(collection(db, "users"), where(documentId(), "in", chunk));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data() as any;
      results.push({ uid: d.id, email: data.email, name: data.name });
    });
  }
  return results;
}
