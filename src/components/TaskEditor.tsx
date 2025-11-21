"use client";
import { useState, useEffect } from "react";
import type { Task, TaskPriority, TaskType } from "@/lib/taskTypes";
import type { TaskProject } from "@/lib/taskProjectTypes";
import { listenUserTaskProjects } from "@/lib/taskProjects";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import SubtaskList from "@/components/SubtaskList";
import CommentsThread from "@/components/CommentsThread";
import { improveTaskDescription } from "@/lib/aiml";

export default function TaskEditor({
  mode = "edit",
  task,
  members = [],
  projectId,
  doneColumnId,
  subtasks = [],
  onCreateSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onSave,
  onDelete,
  onClose,
  currentUserId,
  ownerId,
}: {
  mode?: "create" | "edit";
  task: Task;
  members?: { uid: string; name?: string; email?: string }[];
  projectId: string;
  doneColumnId: string;
  subtasks?: Task[];
  onCreateSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (sub: Task, done: boolean) => Promise<void>;
  onEditSubtask: (sub: Task, newTitle: string) => Promise<void>;
  onDeleteSubtask: (sub: Task) => Promise<void>;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  currentUserId: string;
  ownerId: string;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [assigneeId, setAssigneeId] = useState<string | undefined>(task.assigneeId);
  const [taskProjectId, setTaskProjectId] = useState<string | undefined>(task.projectId);
  const [estimation, setEstimation] = useState<number | undefined>(task.estimation);
  const [priority, setPriority] = useState<TaskPriority | undefined>(task.priority);
  const [taskType, setTaskType] = useState<TaskType | undefined>(task.taskType);
  const [dueDate, setDueDate] = useState<string | undefined>(() => {
    if (!task.dueDate) return undefined;
    const date = typeof task.dueDate === 'object' && task.dueDate && 'toDate' in task.dueDate
      ? (task.dueDate as { toDate: () => Date }).toDate()
      : new Date(task.dueDate);
    return date.toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState(false);
  const [userProjects, setUserProjects] = useState<TaskProject[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [improvingDescription, setImprovingDescription] = useState(false);
  const { confirm } = useDialog();
  const { addToast } = useToast();

  useEffect(() => {
    const unsub = listenUserTaskProjects(currentUserId, setUserProjects);
    return () => unsub();
  }, [currentUserId]);
  const doneCount = (subtasks || []).filter((s) => s.columnId === doneColumnId).length;
  const total = (subtasks || []).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const validateForm = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    const newErrors: Record<string, boolean> = {};

    if (!title.trim()) {
      missingFields.push("Title");
      newErrors.title = true;
    }
    if (!description.trim()) {
      missingFields.push("Description");
      newErrors.description = true;
    }
    if (!taskProjectId) {
      missingFields.push("Project");
      newErrors.project = true;
    }
    if (!assigneeId) {
      missingFields.push("Assignee");
      newErrors.assignee = true;
    }
    if (!estimation || estimation <= 0) {
      missingFields.push("Estimation");
      newErrors.estimation = true;
    }
    if (!priority) {
    if (!taskType) {
      missingFields.push("Task Type");
      newErrors.taskType = true;
    }
      missingFields.push("Priority");
    if (!taskType) {
      missingFields.push("Task Type");
      newErrors.taskType = true;
    }
      newErrors.priority = true;
    if (!taskType) {
      missingFields.push("Task Type");
      newErrors.taskType = true;
    }
    }
    if (!taskType) {
      missingFields.push("Task Type");
      newErrors.taskType = true;
    }
    if (!dueDate) {
      missingFields.push("Due date");
      newErrors.dueDate = true;
    }

    setErrors(newErrors);
    return { isValid: missingFields.length === 0, missingFields };
  };

  const getInputStyle = (fieldName: string) => ({
    backgroundColor: 'var(--nb-card)',
    border: errors[fieldName]
      ? '2px solid var(--nb-coral)'
      : '1.5px solid color-mix(in srgb, var(--nb-ink) 20%, transparent)',
    color: 'var(--nb-ink)',
    caretColor: 'var(--nb-teal)',
  } as React.CSSProperties);

  const getSelectStyle = (fieldName: string) => ({
    backgroundColor: 'var(--nb-card)',
    border: errors[fieldName]
      ? '2px solid var(--nb-coral)'
      : '1.5px solid color-mix(in srgb, var(--nb-ink) 20%, transparent)',
    color: 'var(--nb-ink)',
  } as React.CSSProperties);

  const inputClass = "w-full h-10 px-3 rounded-lg focus:outline-none focus:ring-2 transition-all";
  const selectClass = "w-full h-10 px-3 rounded-lg focus:outline-none focus:ring-2 transition-all";
  const textareaClass = "w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all";

  const handleImproveDescription = async () => {
    if (improvingDescription) return;

    if (!title.trim()) {
      addToast({ title: "Please enter a task title first", kind: "error" });
      return;
    }

    if (!description.trim()) {
      addToast({ title: "Please enter a description to improve", kind: "error" });
      return;
    }

    setImprovingDescription(true);
    try {
      const result = await improveTaskDescription({
        title,
        description,
      });

      if (result.error) {
        addToast({ title: result.error, kind: "error" });
      } else {
        setDescription(result.improvedDescription);
        addToast({ title: "Description improved successfully!", kind: "success" });
      }
    } catch (error) {
      console.error("Error improving description:", error);
      addToast({ title: "Failed to improve description. Please try again.", kind: "error" });
    } finally {
      setImprovingDescription(false);
    }
  };

  return (
    <div>
      {/* Info Banner */}
      <div
        className="mb-4 p-3 rounded-lg flex items-start gap-3"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--nb-accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--nb-accent) 30%, transparent)'
        }}
      >
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--nb-accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--nb-ink)' }}>All fields are required</p>
          <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--nb-ink) 70%, transparent)' }}>
            Please complete all fields before saving. Missing fields will be highlighted in red.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: errors.title ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
            Title {errors.title && <span className="text-xs">*Required</span>}
          </label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: false })); }}
            className={inputClass}
            style={getInputStyle('title')}
            placeholder="Enter task title"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold" style={{ color: errors.description ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Description {errors.description && <span className="text-xs">*Required</span>}
            </label>
            <button
              type="button"
              onClick={handleImproveDescription}
              disabled={improvingDescription || !description.trim() || !title.trim()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--nb-accent) 15%, transparent)',
                color: 'var(--nb-accent)',
                border: '1px solid color-mix(in srgb, var(--nb-accent) 30%, transparent)',
              }}
              onMouseEnter={(e) => {
                if (!improvingDescription && description.trim() && title.trim()) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-accent) 25%, transparent)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-accent) 15%, transparent)';
              }}
            >
              {improvingDescription ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Improving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Improve with AI</span>
                </>
              )}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: false })); }}
            rows={6}
            className={textareaClass}
            style={getInputStyle('description')}
            placeholder="Add task description..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: errors.project ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Project {errors.project && <span className="text-xs">*Required</span>}
            </label>
            <select
              value={taskProjectId || ""}
              onChange={(e)=> { setTaskProjectId(e.target.value || undefined); setErrors(prev => ({ ...prev, project: false })); }}
              className={selectClass}
              style={getSelectStyle('project')}
            >
              <option value="" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Select a project...</option>
              {userProjects.map(p => (
                <option key={p.projectId} value={p.projectId} style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: errors.assignee ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Assignee {errors.assignee && <span className="text-xs">*Required</span>}
            </label>
            <select
              value={assigneeId || ""}
              onChange={(e)=> { setAssigneeId(e.target.value || undefined); setErrors(prev => ({ ...prev, assignee: false })); }}
              className={selectClass}
              style={getSelectStyle('assignee')}
            >
              <option value="" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Select assignee...</option>
              {members.map(m => (
                <option key={m.uid} value={m.uid} style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>
                  {m.name || m.email || m.uid}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: errors.estimation ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Estimation (hours) {errors.estimation && <span className="text-xs">*Required</span>}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimation ?? ""}
              onChange={(e)=> { setEstimation(e.target.value ? parseFloat(e.target.value) : undefined); setErrors(prev => ({ ...prev, estimation: false })); }}
              className={inputClass}
              style={getInputStyle('estimation')}
              placeholder="e.g. 2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: errors.priority ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Priority {errors.priority && <span className="text-xs">*Required</span>}
            </label>
            <select
              value={priority || ""}
              onChange={(e)=> { setPriority((e.target.value as TaskPriority) || undefined); setErrors(prev => ({ ...prev, priority: false })); }}
              className={selectClass}
              style={getSelectStyle('priority')}
            >
              <option value="" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Select priority...</option>
              <option value="low" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Low</option>
              <option value="medium" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Medium</option>
              <option value="high" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>High</option>
              <option value="urgent" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: errors.taskType ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Task Type {errors.taskType && <span className="text-xs">*Required</span>}
            </label>
            <select
              value={taskType || ""}
              onChange={(e)=> { setTaskType((e.target.value as TaskType) || undefined); setErrors(prev => ({ ...prev, taskType: false })); }}
              className={selectClass}
              style={getSelectStyle('taskType')}
            >
              <option value="" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Select task type...</option>
              <option value="BUG" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Bug</option>
              <option value="FEATURE" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Feature</option>
              <option value="TEST" style={{ backgroundColor: 'var(--nb-card)', color: 'var(--nb-ink)' }}>Test</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: errors.dueDate ? 'var(--nb-coral)' : 'var(--nb-ink)' }}>
              Due date {errors.dueDate && <span className="text-xs">*Required</span>}
            </label>
            <input
              type="date"
              value={dueDate || ""}
              onChange={(e)=> { setDueDate(e.target.value || undefined); setErrors(prev => ({ ...prev, dueDate: false })); }}
              className={inputClass}
              style={getInputStyle('dueDate')}
            />
          </div>
        </div>
        {total > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--nb-ink)' }}>Progress</label>
            <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 10%, transparent)' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--nb-teal), var(--nb-accent))'
                }}
              />
            </div>
            <div className="text-xs font-medium mt-2" style={{ color: 'color-mix(in srgb, var(--nb-ink) 70%, transparent)' }}>
              {doneCount}/{total} completed ({pct}%)
            </div>
          </div>
        )}
      </div>
      {mode === "edit" && (
        <>
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 12%, transparent)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--nb-ink)' }}>Subtasks</label>
            <SubtaskList
              subtasks={subtasks}
              onToggle={onToggleSubtask}
              onCreate={onCreateSubtask}
              onEdit={onEditSubtask}
              onDelete={onDeleteSubtask}
              doneColumnId={doneColumnId}
            />
          </div>
          {/* Comments section disabled - not yet implemented */}
          {/* <div className="mt-6 pt-6 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 12%, transparent)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--nb-ink)' }}>Comments</label>
            <CommentsThread projectId={projectId} taskId={task.taskId} currentUserId={currentUserId} ownerId={ownerId} members={members} taskAssigneeId={assigneeId} taskTitle={title} />
          </div> */}
        </>
      )}
      <div className="mt-6 pt-4 flex items-center justify-between border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 12%, transparent)' }}>
        {mode === "edit" ? (
          <button
            onClick={async () => {
              if (busy) return;
              const hasSubtasks = (subtasks || []).length > 0;
              const title = hasSubtasks ? 'Delete task with subtasks?' : 'Delete task?';
              const message = hasSubtasks
                ? `Are you sure you want to delete "${task.title}"?\n\nThis task has ${subtasks!.length} subtask(s) that will be moved to the Backlog column.`
                : `Are you sure you want to delete "${task.title}"?`;
              const confirmed = await confirm({ title, message, confirmText: 'Delete', danger: true });
              if (!confirmed) return;
              setBusy(true);
              try { await onDelete(); onClose(); } finally { setBusy(false); }
            }}
            className="h-10 px-5 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              border: '2px solid var(--nb-coral)',
              color: 'var(--nb-coral)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-coral) 10%, transparent)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Delete
          </button>
        ) : (
          <div></div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-lg nb-btn-secondary font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--nb-ink) 8%, transparent)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (busy) return;

              // Validate form
              const { isValid, missingFields } = validateForm();
              if (!isValid) {
                await confirm({
                  title: 'Incomplete Task Form',
                  message: `Please fill in all required fields before saving:\n\n${missingFields.map(f => `• ${f}`).join('\n')}\n\nAll fields marked with red borders are mandatory.`,
                  confirmText: 'OK',
                  danger: false,
                });
                return;
              }

              setBusy(true);
              try { await onSave({ title, description, assigneeId, projectId: taskProjectId, estimation, priority, taskType, dueDate }); onClose(); } finally { setBusy(false); }
            }}
            className="h-10 px-6 rounded-lg nb-btn-primary font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
            disabled={busy}
            style={{
              opacity: busy ? 0.6 : 1,
              cursor: busy ? 'not-allowed' : 'pointer'
            }}
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
