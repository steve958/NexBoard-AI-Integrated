import { Timestamp } from "firebase/firestore";

type DueDateValue = Timestamp | string | Date | number | null | undefined;

/**
 * Convert any due-date representation to epoch millis.
 * Returns NaN for null/undefined.
 */
export function dueDateToMillis(value: DueDateValue): number {
  if (value == null) return NaN;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

/**
 * Format a due date for display using the default locale short date.
 */
export function formatDueDate(value: DueDateValue): string {
  const ms = dueDateToMillis(value);
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleDateString();
}

/**
 * Format a due date with weekday, month, and day (e.g. "Mon, Feb 3").
 */
export function formatDueDateLong(value: DueDateValue): string {
  const ms = dueDateToMillis(value);
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
