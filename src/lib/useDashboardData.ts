"use client";
import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import { listenProjectsForUser } from "@/lib/projects";
import { dueDateToMillis } from "@/lib/dates";
import type { Project, Column } from "@/lib/types";
import type { Task } from "@/lib/taskTypes";

export type ProjectTasks = { projectId: string; projectName: string; tasks: Task[] };
export type ProjectColumns = { projectId: string; columns: Column[] };

const DAY_MS = 24 * 60 * 60 * 1000;

export function useDashboardData(userId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<ProjectTasks[]>([]);
  const [projectColumns, setProjectColumns] = useState<ProjectColumns[]>([]);

  // Listen to user's projects
  useEffect(() => {
    if (!userId) return;
    return listenProjectsForUser(userId, setProjects);
  }, [userId]);

  // Listen to columns from all projects
  useEffect(() => {
    if (!userId || projects.length === 0) { setProjectColumns([]); return; }
    const unsubscribers: (() => void)[] = [];
    const db = getDbClient();

    projects.forEach((project) => {
      const q = query(collection(db, `projects/${project.projectId}/columns`), orderBy("order"));
      const unsub = onSnapshot(q, (snapshot) => {
        const columns = snapshot.docs.map((doc) => ({ columnId: doc.id, ...doc.data() })) as Column[];
        setProjectColumns((prev) => {
          const filtered = prev.filter((p) => p.projectId !== project.projectId);
          return [...filtered, { projectId: project.projectId, columns }];
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [userId, projects]);

  // Listen to tasks from all projects
  useEffect(() => {
    if (!userId || projects.length === 0) { setAllTasks([]); return; }
    const unsubscribers: (() => void)[] = [];
    const db = getDbClient();

    projects.forEach((project) => {
      const q = query(collection(db, `projects/${project.projectId}/tasks`));
      const unsub = onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map((doc) => ({ taskId: doc.id, ...doc.data() })) as Task[];
        setAllTasks((prev) => {
          const filtered = prev.filter((p) => p.projectId !== project.projectId);
          return [...filtered, { projectId: project.projectId, projectName: project.name, tasks }];
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [userId, projects]);

  // ---------- derived analytics ----------
  const analytics = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const totalBoards = projects.length;
    const totalTasks = allTasks.reduce((sum, p) => sum + p.tasks.filter((t) => !t.parentTaskId).length, 0);

    const myTasks = allTasks.flatMap((p) =>
      p.tasks.filter((t) => t.assigneeId === userId).map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId }))
    );

    // helpers
    const doneColumnIds = (pid: string) => {
      const cols = projectColumns.find((pc) => pc.projectId === pid)?.columns ?? [];
      return new Set(cols.filter((c) => c.name.toLowerCase().includes("done")).map((c) => c.columnId));
    };

    const overdueTasks = myTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = dueDateToMillis(t.dueDate);
      if (due >= todayTime) return false;
      return !doneColumnIds(t.projectId!).has(t.columnId);
    });

    // completed tasks
    const completedTasks = allTasks.flatMap((p) => {
      const doneIds = doneColumnIds(p.projectId);
      if (doneIds.size === 0) return [];
      return p.tasks
        .filter((t) => doneIds.has(t.columnId))
        .map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId, completedAt: dueDateToMillis(t.updatedAt) || now }));
    });

    const sevenDaysAgo = todayTime - 7 * DAY_MS;
    const thirtyDaysAgo = todayTime - 30 * DAY_MS;
    const completedToday = completedTasks.filter((t) => t.completedAt >= todayTime).length;
    const completedThisWeek = completedTasks.filter((t) => t.completedAt >= sevenDaysAgo).length;
    const completedThisMonth = completedTasks.filter((t) => t.completedAt >= thirtyDaysAgo).length;
    const avgPerDay = Math.round((completedThisWeek / 7) * 10) / 10;

    // daily completions (7 days)
    const dailyCompletions: { date: string; count: number; timestamp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = todayTime - i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      dailyCompletions.push({
        date: new Date(dayStart).toLocaleDateString("en-US", { weekday: "short" }),
        count: completedTasks.filter((t) => t.completedAt >= dayStart && t.completedAt < dayEnd).length,
        timestamp: dayStart,
      });
    }

    // streak
    let streak = 0;
    let checkDate = todayTime;
    while (streak <= 365) {
      const dayStart = checkDate;
      const dayEnd = dayStart + DAY_MS;
      if (completedTasks.some((t) => t.completedAt >= dayStart && t.completedAt < dayEnd)) {
        streak++;
        checkDate -= DAY_MS;
      } else if (checkDate === todayTime) {
        checkDate -= DAY_MS;
      } else {
        break;
      }
    }

    // upcoming tasks grouped by period
    const tomorrowTime = todayTime + DAY_MS;
    const thisWeekEndTime = todayTime + 7 * DAY_MS;
    const nextWeekEndTime = todayTime + 14 * DAY_MS;

    const upcomingTasks = allTasks
      .flatMap((p) => {
        const doneIds = doneColumnIds(p.projectId);
        return p.tasks
          .filter((t) => {
            if (t.assigneeId !== userId || !t.dueDate) return false;
            if (doneIds.has(t.columnId)) return false;
            return dueDateToMillis(t.dueDate) <= now + 14 * DAY_MS;
          })
          .map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId }));
      })
      .sort((a, b) => dueDateToMillis(a.dueDate) - dueDateToMillis(b.dueDate));

    const groupedUpcomingTasks = {
      overdue: upcomingTasks.filter((t) => dueDateToMillis(t.dueDate) < todayTime),
      today: upcomingTasks.filter((t) => { const d = dueDateToMillis(t.dueDate); return d >= todayTime && d < tomorrowTime; }),
      tomorrow: upcomingTasks.filter((t) => { const d = dueDateToMillis(t.dueDate); return d >= tomorrowTime && d < tomorrowTime + DAY_MS; }),
      thisWeek: upcomingTasks.filter((t) => { const d = dueDateToMillis(t.dueDate); return d >= tomorrowTime + DAY_MS && d < thisWeekEndTime; }),
      nextWeek: upcomingTasks.filter((t) => { const d = dueDateToMillis(t.dueDate); return d >= thisWeekEndTime && d < nextWeekEndTime; }),
    };

    return {
      totalBoards,
      totalTasks,
      myTasksCount: myTasks.length,
      overdueCount: overdueTasks.length,
      groupedUpcomingTasks,
      myTasks: myTasks.slice(0, 5),
      completedToday,
      completedThisWeek,
      completedThisMonth,
      avgPerDay,
      streak,
      dailyCompletions,
    };
  }, [projects, allTasks, projectColumns, userId]);

  return { projects, allTasks, projectColumns, analytics };
}
