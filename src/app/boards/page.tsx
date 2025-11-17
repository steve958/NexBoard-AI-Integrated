"use client";
import { useAuth } from "@/lib/auth";
import { createProject, listenProjectsForUser, renameProject, deleteProject, addMemberByEmail, removeMemberByEmail } from "@/lib/projects";
import { countTodoTasksForBoards } from "@/lib/tasks";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";
import { getUsersByIds, type UserProfile } from "@/lib/projects";
import Link from "next/link";
import { useDialog } from "@/components/DialogProvider";

export default function BoardsPage() {
  const { user } = useAuth();
  const { confirm, prompt } = useDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [openMembers, setOpenMembers] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<Record<string, UserProfile[]>>({});
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const unsub = listenProjectsForUser(user.uid, setProjects);
    return () => unsub();
  }, [user]);

  // Load task counts when projects change
  useEffect(() => {
    if (projects.length === 0) return;

    const loadTaskCounts = async () => {
      const counts = await countTodoTasksForBoards(projects.map(p => p.projectId));
      setTaskCounts(counts);
    };

    loadTaskCounts();
  }, [projects]);

  if (!user) return null;

  return (
    <main className="min-h-screen p-6 sm:p-8" style={{ backgroundColor: 'var(--nb-bg)' }}>
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight nb-brand-text">Boards</h1>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New board name"
              className="h-10 px-3 rounded-md bg-transparent focus:outline-none focus:ring-2"
              style={{
                border: '1px solid color-mix(in srgb, var(--nb-ink) 15%, transparent)',
                color: 'var(--nb-ink)',
                caretColor: 'var(--nb-ink)'
              }}
            />
            <button
              disabled={!newName || busy}
              onClick={async () => {
                if (!user || !newName) return;
                setBusy(true);
                try {
                  await createProject(user, newName.trim());
                  setNewName("");
                } finally {
                  setBusy(false);
                }
              }}
              className="h-10 px-4 rounded-md nb-btn-primary disabled:opacity-60"
            >
              Create Board
            </button>
          </div>
        </header>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <li key={p.projectId} className="nb-card-elevated rounded-2xl p-6 flex flex-col justify-between group">
              <div className="mb-5">
                <h3 className="font-semibold text-xl mb-2" style={{ color: 'var(--nb-ink)' }}>{p.name}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-medium">{p.members.length} {p.members.length === 1 ? 'member' : 'members'}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: 'var(--nb-teal)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="font-bold">
                      {taskCounts[p.projectId] ?? '...'} {(taskCounts[p.projectId] ?? 0) === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  href={`/boards/${p.projectId}`}
                  className="w-full h-10 px-4 rounded-lg nb-btn-primary flex items-center justify-center font-medium"
                >
                  Open Board
                </Link>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      const isOpen = openMembers[p.projectId];
                      const next = { ...openMembers, [p.projectId]: !isOpen };
                      setOpenMembers(next);
                      if (!isOpen && !profiles[p.projectId]) {
                        const pf = await getUsersByIds(p.members);
                        setProfiles((prev) => ({ ...prev, [p.projectId]: pf }));
                      }
                    }}
                    className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary transition-colors"
                    style={{
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {openMembers[p.projectId] ? "Hide Members" : "View Members"}
                  </button>
                  <button
                    onClick={async () => {
                      const name = await prompt({
                        title: "Rename Board",
                        message: "Enter a new name for this board",
                        defaultValue: p.name,
                        placeholder: "Board name",
                        confirmText: "Rename",
                      });
                      if (!name) return;
                      await renameProject(p.projectId, name);
                    }}
                    className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary transition-colors"
                    style={{
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 5%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Rename
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: "Delete Board",
                        message: "Are you sure you want to delete this board? This action cannot be undone and will permanently delete all tasks, comments, and data associated with this board.",
                        confirmText: "Delete",
                        cancelText: "Cancel",
                        danger: true,
                      });
                      if (!confirmed) return;
                      await deleteProject(p.projectId);
                    }}
                    className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary transition-colors"
                    style={{
                      color: 'var(--nb-coral)',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-coral) 10%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Delete Board
                  </button>
                </div>
              </div>
              {openMembers[p.projectId] && (
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 3%, transparent)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-sm" style={{ color: 'var(--nb-ink)' }}>Members ({p.members.length})</div>
                    {user.uid === p.ownerId && (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const email = await prompt({
                              title: "Add Member",
                              message: "Enter the email address of the person you want to add to this board",
                              placeholder: "email@example.com",
                              confirmText: "Add",
                            });
                            if (!email) return;
                            try {
                              await addMemberByEmail(p.projectId, email.trim());
                            } catch (e: unknown) {
                              const msg = (e as Error)?.message || "Failed to add member";
                              await confirm({
                                title: "Error",
                                message: msg,
                                confirmText: "OK",
                                cancelText: "",
                              });
                            }
                          }}
                          className="px-2 py-1 text-xs rounded transition-colors"
                          style={{
                            color: 'var(--nb-teal)',
                            backgroundColor: 'color-mix(in srgb, var(--nb-teal) 10%, transparent)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-teal) 20%, transparent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-teal) 10%, transparent)';
                          }}
                        >
                          + Add
                        </button>
                        <button
                          onClick={async () => {
                            const email = await prompt({
                              title: "Remove Member",
                              message: "Enter the email address of the member you want to remove from this board",
                              placeholder: "email@example.com",
                              confirmText: "Remove",
                            });
                            if (!email) return;
                            try {
                              await removeMemberByEmail(p.projectId, email.trim());
                            } catch (e: unknown) {
                              const msg = (e as Error)?.message || "Failed to remove member";
                              await confirm({
                                title: "Error",
                                message: msg,
                                confirmText: "OK",
                                cancelText: "",
                              });
                            }
                          }}
                          className="px-2 py-1 text-xs rounded transition-colors"
                          style={{
                            color: 'var(--nb-coral)',
                            backgroundColor: 'color-mix(in srgb, var(--nb-coral) 10%, transparent)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-coral) 20%, transparent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-coral) 10%, transparent)';
                          }}
                        >
                          - Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {(profiles[p.projectId] || []).map((m) => (
                      <li key={m.uid} className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--nb-teal)' }} />
                        <span style={{ color: 'color-mix(in srgb, var(--nb-ink) 80%, transparent)' }}>
                          {m.name || m.email || m.uid}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
          {projects.length === 0 && (
            <li style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>No boards yet. Create your first board.</li>
          )}
        </ul>
      </div>
    </main>
  );
}
