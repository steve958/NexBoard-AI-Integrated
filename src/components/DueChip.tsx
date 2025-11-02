"use client";
import React from "react";

type FirestoreTimestampLike = { toDate: () => Date };
function parseDue(due: string | Date | FirestoreTimestampLike | number | undefined): Date | undefined {
  if (!due) return undefined;
  if (typeof due === "string") return new Date(due);
  // Firestore Timestamp
  if (typeof due === "object" && due && "toDate" in due && typeof (due as FirestoreTimestampLike).toDate === "function") return (due as FirestoreTimestampLike).toDate();
  const t = new Date(due);
  return isNaN(t.getTime()) ? undefined : t;
}

export default function DueChip({ due }: { due?: string | Date | FirestoreTimestampLike | number }) {
  const date = parseDue(due);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  let cls = "nb-chip-amber";
  const label = d.toLocaleDateString();
  if (diff < 0) {
    cls = "nb-chip-coral"; // overdue
  } else if (diff <= 2) {
    cls = "nb-chip-amber"; // soon
  } else {
    cls = "nb-chip-teal";
  }
  return (
    <span className={`inline-flex items-center px-2 h-6 rounded-md text-[11px] ${cls}`} title={`Due ${label}`}>
      {label}
    </span>
  );
}
