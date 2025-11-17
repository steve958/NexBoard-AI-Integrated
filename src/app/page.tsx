"use client";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { listenProjectsForUser, createProject } from "@/lib/projects";
import type { Project } from "@/lib/types";
import type { Task } from "@/lib/taskTypes";
import { collection, query, onSnapshot, Timestamp } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";

export default function HomePage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<{ projectId: string; projectName: string; tasks: Task[] }[]>([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Listen to user's projects
  useEffect(() => {
    if (!user) return;
    const unsub = listenProjectsForUser(user.uid, setProjects);
    return () => unsub();
  }, [user]);

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
    const totalTasks = allTasks.reduce((sum, p) => sum + p.tasks.length, 0);
    const myTasks = allTasks.flatMap((p) =>
      p.tasks.filter((t) => t.assigneeId === user?.uid).map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId }))
    );

    const now = Date.now();
    const overdueTasks = myTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = t.dueDate instanceof Timestamp ? t.dueDate.toMillis() : new Date(t.dueDate).getTime();
      return due < now;
    });

    // Recent tasks (created in last 7 days)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentTasks = allTasks
      .flatMap((p) =>
        p.tasks
          .filter((t) => {
            if (!t.createdAt) return false;
            const created = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : new Date(t.createdAt).getTime();
            return created >= sevenDaysAgo;
          })
          .map((t) => ({ ...t, projectName: p.projectName, projectId: p.projectId }))
      )
      .sort((a, b) => {
        const aTime = a.createdAt instanceof Timestamp
          ? a.createdAt.toMillis()
          : (typeof a.createdAt === 'string' || typeof a.createdAt === 'number' ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.createdAt instanceof Timestamp
          ? b.createdAt.toMillis()
          : (typeof b.createdAt === 'string' || typeof b.createdAt === 'number' ? new Date(b.createdAt).getTime() : 0);
        return bTime - aTime;
      })
      .slice(0, 5);

    return {
      totalBoards,
      totalTasks,
      myTasksCount: myTasks.length,
      overdueCount: overdueTasks.length,
      recentTasks,
      myTasks: myTasks.slice(0, 5),
    };
  }, [projects, allTasks, user]);

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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Activity & My Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="nb-card-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 nb-brand-text">Quick Actions</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                    placeholder="New board name..."
                    className="flex-1 h-10 px-3 rounded-lg bg-transparent focus:outline-none focus:ring-2"
                    style={{
                      border: '1px solid color-mix(in srgb, var(--nb-ink) 15%, transparent)',
                      color: 'var(--nb-ink)',
                      caretColor: 'var(--nb-ink)'
                    }}
                  />
                  <button
                    onClick={handleCreateBoard}
                    disabled={!newBoardName.trim() || creatingBoard}
                    className="h-10 px-4 rounded-lg nb-btn-primary disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
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

            {/* Recent Activity */}
            <div className="nb-card-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 nb-brand-text">Recent Activity</h2>
              {analytics.recentTasks.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentTasks.map((task) => (
                    <Link
                      key={task.taskId}
                      href={`/boards/${task.projectId}?task=${task.taskId}`}
                      className="flex items-start gap-3 p-3 rounded-lg transition-colors group"
                      style={{
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="h-2 w-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--nb-teal)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" style={{ color: 'var(--nb-ink)' }}>
                          {task.title}
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                          {task.projectName}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                          {task.createdAt instanceof Timestamp
                            ? new Date(task.createdAt.toMillis()).toLocaleDateString()
                            : task.createdAt
                            ? new Date(task.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>No recent activity</p>
              )}
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
