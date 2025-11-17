"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { Task } from "@/lib/taskTypes";
import type { Project } from "@/lib/types";
import Link from "next/link";
import DueChip from "@/components/DueChip";
import Avatar from "@/components/Avatar";
import { getUsersByIds, type UserProfile } from "@/lib/projects";

type TaskWithProject = Task & {
  projectId: string;
  projectName: string;
  columnName?: string;
};

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [members, setMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!user) return;
    
    async function loadMyTasks() {
      try {
        setLoading(true);
        const db = getDbClient();
        
        // Get all projects where user is a member
        const projectsQuery = query(
          collection(db, "projects"),
          where("members", "array-contains", user!.uid)
        );
        const projectsSnap = await getDocs(projectsQuery);
        
        const allTasks: TaskWithProject[] = [];
        const allMemberIds = new Set<string>();
        
        // For each project, get tasks assigned to user
        for (const projectDoc of projectsSnap.docs) {
          const projectData = projectDoc.data() as Omit<Project, "projectId">;
          const projectId = projectDoc.id;
          
          // Add all project members to set
          projectData.members?.forEach(m => allMemberIds.add(m));
          
          // Get columns for this project
          const columnsSnap = await getDocs(collection(db, `projects/${projectId}/columns`));
          const columnMap: Record<string, string> = {};
          columnsSnap.forEach(colDoc => {
            columnMap[colDoc.id] = colDoc.data().name;
          });
          
          // Get tasks assigned to user
          const tasksQuery = query(
            collection(db, `projects/${projectId}/tasks`),
            where("assigneeId", "==", user!.uid)
          );
          const tasksSnap = await getDocs(tasksQuery);
          
          tasksSnap.forEach(taskDoc => {
            const taskData = taskDoc.data() as Omit<Task, "taskId">;
            allTasks.push({
              ...taskData,
              taskId: taskDoc.id,
              projectId,
              projectName: projectData.name,
              columnName: columnMap[taskData.columnId],
            });
          });
        }
        
        // Load member profiles
        const memberProfiles = await getUsersByIds(Array.from(allMemberIds));
        setMembers(memberProfiles);
        
        setTasks(allTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadMyTasks();
  }, [user]);

  const filteredTasks = tasks.filter(t => {
    if (filter === "all") return true;
    const isDone = t.columnName?.toLowerCase().includes("done");
    if (filter === "done") return isDone;
    return !isDone; // active
  });

  const groupedByProject = filteredTasks.reduce((acc, task) => {
    if (!acc[task.projectId]) {
      acc[task.projectId] = {
        projectName: task.projectName,
        tasks: [],
      };
    }
    acc[task.projectId].tasks.push(task);
    return acc;
  }, {} as Record<string, { projectName: string; tasks: TaskWithProject[] }>);

  if (!user) {
    return <main className="p-6">Please sign in to view your tasks.</main>;
  }

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold nb-brand-text">My Tasks</h1>
          <Link href="/boards" className="h-9 px-3 rounded-md nb-btn-secondary hover:bg-white/5">
            All Boards
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm rounded-md ${
              filter === "all" ? "nb-btn-primary" : "nb-btn-secondary hover:bg-white/5"
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 text-sm rounded-md ${
              filter === "active" ? "nb-btn-primary" : "nb-btn-secondary hover:bg-white/5"
            }`}
          >
            Active ({tasks.filter(t => !t.columnName?.toLowerCase().includes("done")).length})
          </button>
          <button
            onClick={() => setFilter("done")}
            className={`px-3 py-1.5 text-sm rounded-md ${
              filter === "done" ? "nb-btn-primary" : "nb-btn-secondary hover:bg-white/5"
            }`}
          >
            Done ({tasks.filter(t => t.columnName?.toLowerCase().includes("done")).length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 opacity-70">Loading your tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 opacity-70">
            {filter === "all" ? "No tasks assigned to you" : `No ${filter} tasks`}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByProject).map(([projectId, { projectName, tasks: projectTasks }]) => (
              <div key={projectId}>
                <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
                  {projectName}
                  <span className="text-xs opacity-60">({projectTasks.length})</span>
                </h2>
                <div className="space-y-2">
                  {projectTasks.map(task => {
                    const assignee = members.find(m => m.uid === task.assigneeId);
                    return (
                      <Link
                        key={task.taskId}
                        href={`/boards/${projectId}?task=${task.taskId}`}
                        className="block nb-card rounded-xl p-5 group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">{task.title}</h3>
                              {task.columnName && (
                                <span className="px-2.5 py-1 text-xs rounded-full nb-chip-teal flex-shrink-0 font-medium">
                                  {task.columnName}
                                </span>
                              )}
                              {task.priority && (
                                <span
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                                  style={{
                                    backgroundColor: task.priority === 'urgent' ? 'var(--nb-coral)' :
                                      task.priority === 'high' ? 'color-mix(in srgb, var(--nb-coral) 60%, var(--nb-accent))' :
                                      task.priority === 'medium' ? 'var(--nb-accent)' :
                                      'color-mix(in srgb, var(--nb-ink) 20%, transparent)',
                                    color: task.priority === 'low' ? 'var(--nb-ink)' : '#1d1d1d'
                                  }}
                                >
                                  {task.priority}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm opacity-60 line-clamp-2 leading-relaxed">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {task.estimation && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-accent) 15%, transparent)' }}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-accent)' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-bold" style={{ color: 'var(--nb-accent)' }}>
                                  {task.estimation}h
                                </span>
                              </div>
                            )}
                            {assignee && (
                              <Avatar uid={assignee.uid} name={assignee.name} email={assignee.email} />
                            )}
                            <DueChip due={task.dueDate} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
