"use client";
import { useAuth } from "@/lib/auth";
import { createProject, listenProjectsForUser, renameProject, archiveProject, addMemberByEmail, removeMemberByEmail } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";
import { getUsersByIds, type UserProfile } from "@/lib/projects";
import Link from "next/link";

export default function BoardsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [openMembers, setOpenMembers] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<Record<string, UserProfile[]>>({});

  useEffect(() => {
    if (!user) return;
    const unsub = listenProjectsForUser(user.uid, setProjects);
    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight nb-brand-text">Boards</h1>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New board name"
              className="h-10 px-3 rounded-md bg-transparent border border-white/10"
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
            <li key={p.projectId} className="nb-card nb-shadow rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="font-medium text-lg">{p.name}</div>
                <div className="text-sm opacity-70 mt-1">Members: {p.members.length}</div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Link href={`/boards/${p.projectId}`} className="h-9 px-3 rounded-md nb-btn-primary flex items-center">Open</Link>
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
                  className="h-9 px-3 rounded-md border"
                >
                  {openMembers[p.projectId] ? "Hide members" : "Members"}
                </button>
                {user.uid === p.ownerId && (
                  <>
                    <button
                      onClick={async () => {
                        const email = prompt("Add member by email");
                        if (!email) return;
                        try {
                          await addMemberByEmail(p.projectId, email.trim());
                        } catch (e: unknown) {
                          const msg = (e as Error)?.message || "Failed to add member";
                          alert(msg);
                        }
                      }}
                      className="h-9 px-3 rounded-md border"
                    >
                      Add member
                    </button>
                    <button
                      onClick={async () => {
                        const email = prompt("Remove member by email");
                        if (!email) return;
                        try {
                          await removeMemberByEmail(p.projectId, email.trim());
                        } catch (e: unknown) {
                          const msg = (e as Error)?.message || "Failed to remove member";
                          alert(msg);
                        }
                      }}
                      className="h-9 px-3 rounded-md border"
                    >
                      Remove member
                    </button>
                  </>
                )}
                <button
                  onClick={async () => {
                    const name = prompt("Rename board", p.name);
                    if (!name) return;
                    await renameProject(p.projectId, name);
                  }}
                  className="h-9 px-3 rounded-md border"
                >
                  Rename
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Archive this board?")) return;
                    await archiveProject(p.projectId);
                  }}
                  className="h-9 px-3 rounded-md border"
                >
                  Archive
                </button>
              </div>
              {openMembers[p.projectId] && (
                <div className="mt-3 w-full text-sm text-zinc-700 dark:text-zinc-300">
                  <div className="font-medium mb-1">Members</div>
                  <ul className="pl-4 list-disc">
                    {(profiles[p.projectId] || []).map((m) => (
                      <li key={m.uid}>{m.name || m.email || m.uid}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
          {projects.length === 0 && (
            <li className="text-zinc-600 dark:text-zinc-400">No boards yet. Create your first board.</li>
          )}
        </ul>
      </div>
    </main>
  );
}
