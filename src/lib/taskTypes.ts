export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = {
  taskId: string;
  title: string;
  description?: string;
  columnId: string;
  order: string;
  assigneeId?: string;
  projectId?: string; // references taskProjects collection
  estimation?: number; // hours
  priority?: TaskPriority;
  dueDate?: import("firebase/firestore").Timestamp | string | Date | number | null;
  parentTaskId?: string | null;
  createdAt?: import("firebase/firestore").Timestamp | null;
  updatedAt?: import("firebase/firestore").Timestamp | null;
};

