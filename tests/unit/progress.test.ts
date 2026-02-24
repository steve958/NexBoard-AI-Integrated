import { describe, it, expect } from "vitest";
import { calculateProgress, getTaskCountsByColumn, getUserAssignedTasks } from "../../src/lib/progress";
import type { Task } from "../../src/lib/taskTypes";

function task(overrides: Partial<Task> = {}): Task {
  return {
    taskId: Math.random().toString(36).slice(2),
    title: "Test",
    columnId: "todo",
    order: "n0",
    ...overrides,
  };
}

describe("progress", () => {
  const doneColumnId = "done-col";

  describe("calculateProgress", () => {
    it("returns 0% with no tasks", () => {
      const result = calculateProgress([], doneColumnId);
      expect(result).toEqual({ total: 0, done: 0, percentage: 0 });
    });

    it("calculates correct percentage", () => {
      const tasks = [
        task({ columnId: "todo" }),
        task({ columnId: doneColumnId }),
        task({ columnId: "in-progress" }),
        task({ columnId: doneColumnId }),
      ];
      const result = calculateProgress(tasks, doneColumnId);
      expect(result.total).toBe(4);
      expect(result.done).toBe(2);
      expect(result.percentage).toBe(50);
    });

    it("returns 100% when all done", () => {
      const tasks = [
        task({ columnId: doneColumnId }),
        task({ columnId: doneColumnId }),
      ];
      const result = calculateProgress(tasks, doneColumnId);
      expect(result.percentage).toBe(100);
    });
  });

  describe("getTaskCountsByColumn", () => {
    it("groups tasks by column", () => {
      const tasks = [
        task({ columnId: "a" }),
        task({ columnId: "a" }),
        task({ columnId: "b" }),
      ];
      expect(getTaskCountsByColumn(tasks)).toEqual({ a: 2, b: 1 });
    });
  });

  describe("getUserAssignedTasks", () => {
    it("filters tasks by assignee", () => {
      const tasks = [
        task({ assigneeId: "u1" }),
        task({ assigneeId: "u2" }),
        task({ assigneeId: "u1" }),
      ];
      expect(getUserAssignedTasks(tasks, "u1")).toHaveLength(2);
      expect(getUserAssignedTasks(tasks, "u3")).toHaveLength(0);
    });
  });
});
