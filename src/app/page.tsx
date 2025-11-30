"use client";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { listenProjectsForUser, createProject } from "@/lib/projects";
import type { Project, Column } from "@/lib/types";
import type { Task } from "@/lib/taskTypes";
import { collection, query, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";

export default function HomePage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<{ projectId: string; projectName: string; tasks: Task[] }[]>([]);
  const [projectColumns, setProjectColumns] = useState<{ projectId: string; columns: Column[] }[]>([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Listen to user's projects
  useEffect(() => {
    if (!user) return;
    const unsub = listenProjectsForUser(user.uid, setProjects);
    return () => unsub();
  }, [user]);

  // Listen to columns from all projects
  useEffect(() => {
    if (!user || projects.length === 0) {
      setProjectColumns([]);
      return;
    }

    const unsubscribers: (() => void)[] = [];
    const db = getDbClient();

    projects.forEach((project) => {
      const q = query(collection(db, `projects/${project.projectId}/columns`), orderBy("order"));
      const unsub = onSnapshot(q, (snapshot) => {
        const columns = snapshot.docs.map((doc) => ({
          columnId: doc.id,
          ...doc.data(),
        })) as Column[];

        setProjectColumns((prev) => {
          const filtered = prev.filter((p) => p.projectId !== project.projectId);
          return [...filtered, { projectId: project.projectId, columns }];
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [user, projects]);

  // Listen to tasks from all projects
  useEffect(() => {
    if (!user || projects.length === 0) {
      setAllTasks([]);
      return;
    }

    const unsubscribers: (() => void)[] = [];
    const db = getDbClient();

    projects.forEach((project) => {
      const q = query(collection(db, `projects/${project.projectId}/tasks`));
      const unsub = onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map((doc) => ({
          taskId: doc.id,
          ...doc.data(),
        })) as Task[];

        setAllTasks((prev) => {
          const filtered = prev.filter((p) => p.projectId !== project.projectId);
          return [...filtered, { projectId: project.projectId, projectName: project.name, tasks }];
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [user, projects]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalBoards = projects.length;
    // Count only parent tasks (exclude subtasks)
    const totalTasks = allTasks.reduce((sum, p) => {
      const parentTasks = p.tasks.filter(t => !t.parentTaskId);
      return sum + parentTasks.length;
    }, 0);
    const myTasks = allTasks.flatMap((p) =>
      p.tasks.filter((t) => t.assigneeId === user?.uid).map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId }))
    );

    const now = Date.now();
    const overdueTasks = myTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate).getTime();
      if (due >= now) return false; // Not overdue

      // Exclude tasks from DONE columns
      const projectCols = projectColumns.find((pc) => pc.projectId === t.projectId);
      if (!projectCols) return true; // If no columns info, include task

      // Find DONE column (column with name containing "done")
      const doneColumn = projectCols.columns.find((col) =>
        col.name.toLowerCase().includes('done')
      );

      // Exclude task if it's in the DONE column
      if (doneColumn && t.columnId === doneColumn.columnId) return false;

      return true; // Task is overdue and not in DONE column
    });

    // Calculate completion metrics
    const completedTasks = allTasks.flatMap((p) => {
      const projectCols = projectColumns.find((pc) => pc.projectId === p.projectId);
      if (!projectCols) return [];

      const doneColumns = projectCols.columns.filter((col) =>
        col.name.toLowerCase().includes('done')
      );
      const doneColumnIds = new Set(doneColumns.map((col) => col.columnId));

      return p.tasks
        .filter((t) => doneColumnIds.has(t.columnId))
        .map((t) => ({
          ...t,
          projectName: p.projectName,
          projectId: p.projectId,
          completedAt: t.updatedAt instanceof Timestamp ? t.updatedAt.toMillis() : (t.updatedAt ? new Date(t.updatedAt).getTime() : now)
        }));
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = todayTime - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayTime - 30 * 24 * 60 * 60 * 1000;

    const completedToday = completedTasks.filter((t) => t.completedAt >= todayTime);
    const completedThisWeek = completedTasks.filter((t) => t.completedAt >= sevenDaysAgo);
    const completedThisMonth = completedTasks.filter((t) => t.completedAt >= thirtyDaysAgo);

    // Calculate daily completions for the last 7 days
    const dailyCompletions: { date: string; count: number; timestamp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = todayTime - i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = completedTasks.filter((t) => t.completedAt >= dayStart && t.completedAt < dayEnd).length;
      const date = new Date(dayStart);
      dailyCompletions.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
        timestamp: dayStart
      });
    }

    // Calculate average tasks per day (last 7 days)
    const avgPerDay = completedThisWeek.length / 7;

    // Calculate completion streak
    let streak = 0;
    let checkDate = todayTime;
    while (true) {
      const dayStart = checkDate;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const hasCompletion = completedTasks.some((t) => t.completedAt >= dayStart && t.completedAt < dayEnd);
      if (hasCompletion) {
        streak++;
        checkDate -= 24 * 60 * 60 * 1000;
      } else {
        // Check if it's today and has no completions, don't break the streak yet
        if (checkDate === todayTime) {
          checkDate -= 24 * 60 * 60 * 1000;
          continue;
        }
        break;
      }
      // Prevent infinite loop
      if (streak > 365) break;
    }

    // Upcoming tasks from TODO and IN PROGRESS columns only
    const upcomingTasks = allTasks
      .flatMap((p) => {
        const projectCols = projectColumns.find((pc) => pc.projectId === p.projectId);
        if (!projectCols) return [];

        // Find DONE columns (columns with name containing "done")
        const doneColumns = projectCols.columns.filter((col) =>
          col.name.toLowerCase().includes('done')
        );
        const doneColumnIds = new Set(doneColumns.map((col) => col.columnId));

        return p.tasks
          .filter((t) => {
            // Must have a due date
            if (!t.dueDate) return false;
            // Must NOT be in a DONE column
            if (doneColumnIds.has(t.columnId)) return false;
            // Must be due within next 14 days
            const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate).getTime();
            const fourteenDaysFromNow = now + 14 * 24 * 60 * 60 * 1000;
            return due <= fourteenDaysFromNow;
          })
          .map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId }));
      })
      .sort((a, b) => {
        const aTime = a.dueDate instanceof Timestamp
          ? a.dueDate.toMillis()
          : new Date(a.dueDate as string | number | Date).getTime();
        const bTime = b.dueDate instanceof Timestamp
          ? b.dueDate.toMillis()
          : new Date(b.dueDate as string | number | Date).getTime();
        return aTime - bTime;
      });

    // Group upcoming tasks by time period
    const tomorrowTime = todayTime + 24 * 60 * 60 * 1000;
    const thisWeekEndTime = todayTime + 7 * 24 * 60 * 60 * 1000;
    const nextWeekEndTime = todayTime + 14 * 24 * 60 * 60 * 1000;

    const groupedUpcomingTasks = {
      overdue: upcomingTasks.filter((t) => {
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate as string | number | Date).getTime();
        return due < todayTime;
      }),
      today: upcomingTasks.filter((t) => {
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate as string | number | Date).getTime();
        return due >= todayTime && due < tomorrowTime;
      }),
      tomorrow: upcomingTasks.filter((t) => {
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate as string | number | Date).getTime();
        return due >= tomorrowTime && due < tomorrowTime + 24 * 60 * 60 * 1000;
      }),
      thisWeek: upcomingTasks.filter((t) => {
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate as string | number | Date).getTime();
        return due >= tomorrowTime + 24 * 60 * 60 * 1000 && due < thisWeekEndTime;
      }),
      nextWeek: upcomingTasks.filter((t) => {
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate as string | number | Date).getTime();
        return due >= thisWeekEndTime && due < nextWeekEndTime;
      }),
    };

    return {
      totalBoards,
      totalTasks,
      myTasksCount: myTasks.length,
      overdueCount: overdueTasks.length,
      groupedUpcomingTasks,
      myTasks: myTasks.slice(0, 5),
      completedToday: completedToday.length,
      completedThisWeek: completedThisWeek.length,
      completedThisMonth: completedThisMonth.length,
      avgPerDay: Math.round(avgPerDay * 10) / 10,
      streak,
      dailyCompletions,
    };
  }, [projects, allTasks, projectColumns, user]);

  const handleCreateBoard = async () => {
    if (!user || !newBoardName.trim()) return;
    setCreatingBoard(true);
    try {
      await createProject(user, newBoardName.trim());
      setNewBoardName("");
    } finally {
      setCreatingBoard(false);
    }
  };

  if (!user) return null;

  return (
    <main className="min-h-screen p-6 sm:p-8" style={{ backgroundColor: 'var(--nb-bg)' }} role="main">
      <div className="mx-auto max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight nb-brand-text mb-2">
            Welcome back, {user.displayName?.split(" ")[0] || "there"}
          </h1>
          <p style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
            Here's what's happening with your projects today
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Total Boards</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.totalBoards}</div>
          </div>

          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Total Tasks</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.totalTasks}</div>
          </div>

          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Assigned to You</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.myTasksCount}</div>
          </div>

          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Overdue</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-coral)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--nb-coral)' }}>{analytics.overdueCount}</div>
          </div>
        </div>

        {/* Productivity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Completed Today</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.completedToday}</div>
          </div>

          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Completed This Week</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.completedThisWeek}</div>
          </div>

          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Avg Per Day</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.avgPerDay}</div>
            <div className="text-xs mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>Last 7 days</div>
          </div>

          <div className="nb-card-elevated rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>Streak</span>
              <svg className="h-5 w-5" style={{ color: 'var(--nb-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
            <div className="text-3xl font-bold nb-brand-text">{analytics.streak}</div>
            <div className="text-xs mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
              {analytics.streak === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Activity & My Tasks */}
          <div className="lg:col-span-2 space-y-6">
        {/* Quick Actions */}
        <div className="nb-card-elevated rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 nb-brand-text">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                placeholder="New board name..."
                className="flex-1 h-10 px-3 rounded-lg bg-transparent focus:outline-none focus:ring-2 py-2 nb-input"
                style={{
                  border: '1px solid color-mix(in srgb, var(--nb-ink) 15%, transparent)',
                  color: 'var(--nb-ink)',
                  caretColor: 'var(--nb-ink)'
                }}
              />
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim() || creatingBoard}
                className="h-10 px-4 rounded-lg nb-btn-primary disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto flex items-center justify-center"
              >
                Create Board
              </button>
            </div>
            <Link
              href="/boards"
              className="h-10 px-4 rounded-lg nb-btn-secondary flex items-center justify-center whitespace-nowrap transition-colors"
              style={{
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              View All Boards
            </Link>
          </div>
        </div>

            {/* Upcoming Tasks Calendar */}
            <div className="nb-card-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 nb-brand-text">Upcoming Tasks</h2>
              {Object.values(analytics.groupedUpcomingTasks).some(tasks => tasks.length > 0) ? (
                <div className="space-y-4">
                  {/* Overdue */}
                  {analytics.groupedUpcomingTasks.overdue.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4" style={{ color: 'var(--nb-coral)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--nb-coral)' }}>
                          Overdue ({analytics.groupedUpcomingTasks.overdue.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {analytics.groupedUpcomingTasks.overdue.map((task) => (
                          <Link
                            key={task.taskId}
                            href={`/boards/${task.projectId}?task=${task.taskId}`}
                            className="flex items-center justify-between p-2 rounded-lg transition-colors group"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-coral) 10%, transparent)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm" style={{ color: 'var(--nb-ink)' }}>
                                {task.title}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                                {task.projectName}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 rounded whitespace-nowrap ml-3" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-coral) 20%, transparent)', color: 'var(--nb-coral)' }}>
                              {task.dueDate instanceof Timestamp
                                ? new Date(task.dueDate.toMillis()).toLocaleDateString()
                                : new Date(task.dueDate as string | number | Date).toLocaleDateString()}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Today */}
                  {analytics.groupedUpcomingTasks.today.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4" style={{ color: 'var(--nb-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--nb-accent)' }}>
                          Today ({analytics.groupedUpcomingTasks.today.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {analytics.groupedUpcomingTasks.today.map((task) => (
                          <Link
                            key={task.taskId}
                            href={`/boards/${task.projectId}?task=${task.taskId}`}
                            className="flex items-center justify-between p-2 rounded-lg transition-colors group"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm" style={{ color: 'var(--nb-ink)' }}>
                                {task.title}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                                {task.projectName}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 rounded whitespace-nowrap ml-3 nb-chip-teal">
                              Today
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tomorrow */}
                  {analytics.groupedUpcomingTasks.tomorrow.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4" style={{ color: 'var(--nb-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--nb-teal)' }}>
                          Tomorrow ({analytics.groupedUpcomingTasks.tomorrow.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {analytics.groupedUpcomingTasks.tomorrow.map((task) => (
                          <Link
                            key={task.taskId}
                            href={`/boards/${task.projectId}?task=${task.taskId}`}
                            className="flex items-center justify-between p-2 rounded-lg transition-colors group"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm" style={{ color: 'var(--nb-ink)' }}>
                                {task.title}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                                {task.projectName}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 rounded whitespace-nowrap ml-3 nb-chip-teal">
                              Tomorrow
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* This Week */}
                  {analytics.groupedUpcomingTasks.thisWeek.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4" style={{ color: 'color-mix(in srgb, var(--nb-ink) 70%, transparent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-sm font-semibold" style={{ color: 'color-mix(in srgb, var(--nb-ink) 70%, transparent)' }}>
                          This Week ({analytics.groupedUpcomingTasks.thisWeek.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {analytics.groupedUpcomingTasks.thisWeek.map((task) => (
                          <Link
                            key={task.taskId}
                            href={`/boards/${task.projectId}?task=${task.taskId}`}
                            className="flex items-center justify-between p-2 rounded-lg transition-colors group"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm" style={{ color: 'var(--nb-ink)' }}>
                                {task.title}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                                {task.projectName}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 rounded whitespace-nowrap ml-3" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)', color: 'var(--nb-ink)' }}>
                              {task.dueDate instanceof Timestamp
                                ? new Date(task.dueDate.toMillis()).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                : new Date(task.dueDate as string | number | Date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Week */}
                  {analytics.groupedUpcomingTasks.nextWeek.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-sm font-semibold" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                          Next Week ({analytics.groupedUpcomingTasks.nextWeek.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {analytics.groupedUpcomingTasks.nextWeek.map((task) => (
                          <Link
                            key={task.taskId}
                            href={`/boards/${task.projectId}?task=${task.taskId}`}
                            className="flex items-center justify-between p-2 rounded-lg transition-colors group"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm" style={{ color: 'var(--nb-ink)' }}>
                                {task.title}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                                {task.projectName}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 rounded whitespace-nowrap ml-3" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)', color: 'var(--nb-ink)' }}>
                              {task.dueDate instanceof Timestamp
                                ? new Date(task.dueDate.toMillis()).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                : new Date(task.dueDate as string | number | Date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="h-12 w-12 mx-auto mb-3"
                    style={{ color: 'color-mix(in srgb, var(--nb-ink) 30%, transparent)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                    No upcoming tasks with due dates
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                    Tasks from TODO and IN PROGRESS columns due in the next 14 days will appear here
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Productivity Chart */}
            <div className="nb-card-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 nb-brand-text">Weekly Productivity</h2>
              <div className="space-y-4">
                {/* Chart */}
                <div className="relative h-48">
                  <div className="absolute inset-0 flex items-end justify-between gap-2">
                    {analytics.dailyCompletions.map((day, index) => {
                      const maxCount = Math.max(...analytics.dailyCompletions.map((d) => d.count), 1);
                      const heightPercent = (day.count / maxCount) * 100;
                      const isToday = index === analytics.dailyCompletions.length - 1;

                      return (
                        <div key={day.timestamp} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center justify-end h-40">
                            <div className="text-xs font-medium mb-1" style={{ color: 'var(--nb-ink)' }}>
                              {day.count > 0 ? day.count : ''}
                            </div>
                            <div
                              className="w-full rounded-t-lg transition-all duration-300"
                              style={{
                                height: `${heightPercent}%`,
                                backgroundColor: isToday ? 'var(--nb-accent)' : 'var(--nb-teal)',
                                minHeight: day.count > 0 ? '8px' : '2px',
                                opacity: day.count === 0 ? 0.2 : 1
                              }}
                            />
                          </div>
                          <div
                            className="text-xs font-medium"
                            style={{
                              color: isToday
                                ? 'var(--nb-accent)'
                                : 'color-mix(in srgb, var(--nb-ink) 60%, transparent)'
                            }}
                          >
                            {day.date}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)' }}>
                  <div>
                    <div className="text-xs" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                      This Month
                    </div>
                    <div className="text-2xl font-bold nb-brand-text mt-1">
                      {analytics.completedThisMonth}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                      Daily Average
                    </div>
                    <div className="text-2xl font-bold nb-brand-text mt-1">
                      {analytics.avgPerDay}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* My Tasks */}
            <div className="nb-card-elevated rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold nb-brand-text">My Tasks</h2>
                <Link href="/my-tasks" className="text-sm hover:underline" style={{ color: 'var(--nb-teal)' }}>
                  View all
                </Link>
              </div>
              {analytics.myTasks.length > 0 ? (
                <div className="space-y-2">
                  {analytics.myTasks.map((task) => {
                    const isOverdue = task.dueDate
                      ? (task.dueDate instanceof Timestamp
                          ? task.dueDate.toMillis()
                          : new Date(task.dueDate).getTime()) < Date.now()
                      : false;

                    return (
                      <Link
                        key={task.taskId}
                        href={`/boards/${task.projectId}?task=${task.taskId}`}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors group"
                        style={{
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate" style={{ color: 'var(--nb-ink)' }}>
                            {task.title}
                          </div>
                          <div className="text-sm mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                            {task.projectName}
                          </div>
                        </div>
                        {task.dueDate && (
                          <div
                            className="text-xs px-2 py-1 rounded whitespace-nowrap ml-3 nb-chip-teal"
                            style={
                              isOverdue
                                ? {
                                    backgroundColor: 'color-mix(in srgb, var(--nb-coral) 20%, transparent)',
                                    color: 'var(--nb-coral)'
                                  }
                                : undefined
                            }
                          >
                            {task.dueDate instanceof Timestamp
                              ? new Date(task.dueDate.toMillis()).toLocaleDateString()
                              : new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>No tasks assigned to you</p>
              )}
            </div>
          </div>

          {/* Right Column - Boards */}
          <div className="space-y-6">
            <div className="nb-card-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 nb-brand-text">Your Boards</h2>
              {projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.slice(0, 6).map((project) => {
                    const projectTasks = allTasks.find((p) => p.projectId === project.projectId)?.tasks || [];
                    const taskCount = projectTasks.length;

                    return (
                      <Link
                        key={project.projectId}
                        href={`/boards/${project.projectId}`}
                        className="block p-3 rounded-lg transition-colors group"
                        style={{
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="font-medium" style={{ color: 'var(--nb-ink)' }}>
                          {project.name}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                          <div className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            {taskCount} {taskCount === 1 ? "task" : "tasks"}
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                            {project.members.length} {project.members.length === 1 ? "member" : "members"}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {projects.length > 6 && (
                    <Link
                      href="/boards"
                      className="block p-3 rounded-lg text-center text-sm transition-colors"
                      style={{
                        color: 'var(--nb-teal)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      View all {projects.length} boards
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="h-12 w-12 mx-auto mb-3"
                    style={{ color: 'color-mix(in srgb, var(--nb-ink) 30%, transparent)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                  <p className="text-sm mb-4" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>No boards yet</p>
                  <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                    Create your first board to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
