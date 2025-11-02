import type { Task } from "@/lib/taskTypes";

/**
 * Calculate project completion percentage from tasks
 * Includes subtasks in the calculation
 */
export function calculateProgress(tasks: Task[], doneColumnId: string): {
  total: number;
  done: number;
  percentage: number;
} {
  // Count only top-level tasks and subtasks (not nested deeper)
  const relevantTasks = tasks.filter(t => !t.parentTaskId || tasks.some(parent => parent.taskId === t.parentTaskId));
  
  const total = relevantTasks.length;
  const done = relevantTasks.filter(t => t.columnId === doneColumnId).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  
  return { total, done, percentage };
}

/**
 * Get task counts by column
 */
export function getTaskCountsByColumn(tasks: Task[]): Record<string, number> {
  const counts: Record<string, number> = {};
  tasks.forEach(t => {
    counts[t.columnId] = (counts[t.columnId] || 0) + 1;
  });
  return counts;
}

/**
 * Get user's assigned tasks from all tasks
 */
export function getUserAssignedTasks(tasks: Task[], userId: string): Task[] {
  return tasks.filter(t => t.assigneeId === userId);
}
