export type Task = {
  taskId: string;
  title: string;
  description?: string;
  columnId: string;
  order: string;
  assigneeId?: string;
  dueDate?: import("firebase/firestore").Timestamp | string | Date | number | null;
  parentTaskId?: string | null;
  createdAt?: import("firebase/firestore").Timestamp | null;
  updatedAt?: import("firebase/firestore").Timestamp | null;
};

