"use client";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";

export type NotificationPreferences = {
  mentions: boolean;
  assignments: boolean;
  comments: boolean;
  statusChanges: boolean;
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  mentions: true,
  assignments: true,
  comments: true,
  statusChanges: true,
};

export async function getUserPreferences(userId: string): Promise<NotificationPreferences> {
  const db = getDbClient();
  const userDoc = await getDoc(doc(db, `users/${userId}`));

  if (!userDoc.exists()) {
    return DEFAULT_PREFERENCES;
  }

  const data = userDoc.data();
  const prefs = data?.notificationPreferences;

  if (!prefs) {
    return DEFAULT_PREFERENCES;
  }

  return {
    mentions: prefs.mentions ?? DEFAULT_PREFERENCES.mentions,
    assignments: prefs.assignments ?? DEFAULT_PREFERENCES.assignments,
    comments: prefs.comments ?? DEFAULT_PREFERENCES.comments,
    statusChanges: prefs.statusChanges ?? DEFAULT_PREFERENCES.statusChanges,
  };
}

export async function updateUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  const db = getDbClient();
  const userRef = doc(db, `users/${userId}`);

  await updateDoc(userRef, {
    notificationPreferences: preferences,
  });
}

export async function shouldNotify(userId: string, notificationType: keyof NotificationPreferences): Promise<boolean> {
  const preferences = await getUserPreferences(userId);
  return preferences[notificationType];
}
