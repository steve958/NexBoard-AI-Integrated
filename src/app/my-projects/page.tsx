"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { listenUserTaskProjects, createTaskProject, updateTaskProject, deleteTaskProject, countTasksByProjects } from "@/lib/taskProjects";
import type { TaskProject } from "@/lib/taskProjectTypes";
import { useToast } from "@/components/ToastProvider";
import Link from "next/link";
import { useDialog } from "@/components/DialogProvider";

export default function MyProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { prompt, confirm } = useDialog();

  useEffect(() => {
    if (!user) return;

    const unsub = listenUserTaskProjects(user.uid, async (projs) => {
      setProjects(projs);
      setLoading(false);

      // Get task counts for all projects
      if (projs.length > 0) {
        const counts = await countTasksByProjects(projs.map(p => p.projectId), user.uid);
        setTaskCounts(counts);
      }
    });

    return () => unsub();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;

    const name = await prompt({
      title: "New Project",
      message: "Enter project name:",
      placeholder: "e.g. Website Redesign",
    });

    if (!name) return;

    try {
      await createTaskProject(user.uid, name);
      addToast({ title: "Project created", kind: "success" });
    } catch (e: unknown) {
      addToast({ title: (e as Error)?.message || "Failed to create project", kind: "error" });
    }
  };

  const handleRename = async (project: TaskProject) => {
    const name = await prompt({
      title: "Rename Project",
      message: "Enter new name:",
      defaultValue: project.name,
    });

    if (!name || name === project.name) return;

    try {
      await updateTaskProject(project.projectId, { name });
      addToast({ title: "Project renamed", kind: "success" });
    } catch (e: unknown) {
      addToast({ title: (e as Error)?.message || "Failed to rename project", kind: "error" });
    }
  };

  const handleDelete = async (project: TaskProject) => {
    const taskCount = taskCounts[project.projectId] || 0;
    const confirmed = await confirm({
      title: "Delete Project",
      message: taskCount > 0
        ? `Delete "${project.name}"? ${taskCount} task(s) reference this project. Those tasks won't be deleted, but will lose their project assignment.`
        : `Delete "${project.name}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deleteTaskProject(project.projectId);
      addToast({ title: "Project deleted", kind: "success" });
    } catch (e: unknown) {
      addToast({ title: (e as Error)?.message || "Failed to delete project", kind: "error" });
    }
  };

  const handleChangeColor = async (project: TaskProject) => {
    const colors = [
      { name: "Teal", value: "#2ea7a0" },
      { name: "Coral", value: "#f06c6c" },
      { name: "Amber", value: "#f2c04d" },
      { name: "Purple", value: "#9b59b6" },
      { name: "Blue", value: "#3498db" },
      { name: "Green", value: "#2ecc71" },
    ];

    // For now, just cycle through colors (in a real app, you'd show a color picker)
    const currentIndex = colors.findIndex(c => c.value === project.color);
    const nextIndex = (currentIndex + 1) % colors.length;
    const newColor = colors[nextIndex].value;

    try {
      await updateTaskProject(project.projectId, { color: newColor });
    } catch (e: unknown) {
      addToast({ title: (e as Error)?.message || "Failed to update color", kind: "error" });
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nb-bg)' }}>
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: 'var(--nb-ink)' }}>Please sign in</div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nb-bg)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--nb-teal), var(--nb-accent))' }}>
            <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--nb-ink)' }}>Loading projects...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--nb-bg)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black nb-brand-text mb-2 tracking-tight">My Projects</h1>
              <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                Organize your tasks across boards with projects
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/boards"
                className="h-11 px-5 rounded-xl nb-btn-secondary hover:bg-white/5 flex items-center gap-2.5 font-semibold transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                All Boards
              </Link>
              <button
                onClick={handleCreate}
                className="h-11 px-5 rounded-xl nb-btn-primary flex items-center gap-2.5 font-semibold transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 5%, transparent)' }}>
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'color-mix(in srgb, var(--nb-ink) 30%, transparent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--nb-ink)' }}>No projects yet</h3>
            <p className="text-sm mb-6" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
              Create your first project to organize tasks across boards
            </p>
            <button
              onClick={handleCreate}
              className="h-11 px-6 rounded-xl nb-btn-primary font-semibold transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className="rounded-2xl p-6 nb-card-elevated group"
              >
                {/* Color indicator & Title */}
                <div className="flex items-start gap-4 mb-4">
                  <button
                    onClick={() => handleChangeColor(project)}
                    className="w-12 h-12 rounded-xl flex-shrink-0 transition-all hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: project.color || '#2ea7a0',
                      cursor: 'pointer'
                    }}
                    title="Click to change color"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-1 truncate" style={{ color: 'var(--nb-ink)' }}>
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="font-semibold">
                        {taskCounts[project.projectId] || 0} {(taskCounts[project.projectId] || 0) === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)' }}>
                  <button
                    onClick={() => handleRename(project)}
                    className="flex-1 h-9 px-3 rounded-lg font-medium text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid color-mix(in srgb, var(--nb-ink) 20%, transparent)',
                      color: 'var(--nb-ink)'
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="h-9 px-3 rounded-lg font-medium text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--nb-coral)',
                      color: 'var(--nb-coral)'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
