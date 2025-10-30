export type Task = {
  taskId: string;
  title: string;
  description?: string;
  columnId: string;
  order: string;
  assigneeId?: string;
  dueDate?: any;
  parentTaskId?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

