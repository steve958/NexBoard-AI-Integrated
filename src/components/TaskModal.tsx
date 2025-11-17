"use client";
import Modal from "@/components/Modal";
import TaskEditor from "@/components/TaskEditor";
import type { Task } from "@/lib/taskTypes";
import { midKey } from "@/lib/order";

type TaskModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  task?: Task;
  columnId?: string;
  projectId: string;
  doneColumnId: string;
  members?: { uid: string; name?: string; email?: string }[];
  subtasks?: Task[];
  currentUserId: string;
  ownerId: string;
  onCreateSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (sub: Task, done: boolean) => Promise<void>;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function TaskModal({
  open,
  onClose,
  mode,
  task,
  columnId,
  projectId,
  doneColumnId,
  members = [],
  subtasks = [],
  currentUserId,
  ownerId,
  onCreateSubtask,
  onToggleSubtask,
  onSave,
  onDelete,
}: TaskModalProps) {
  // For create mode, construct a temporary task object
  const displayTask: Task = mode === "create"
    ? {
        taskId: "",
        title: "",
        description: "",
        columnId: columnId || "",
        order: midKey(),
      }
    : task!;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Create Task" : "Edit Task"}
    >
      <TaskEditor
        task={displayTask}
        members={members}
        projectId={projectId}
        doneColumnId={doneColumnId}
        subtasks={subtasks}
        onCreateSubtask={onCreateSubtask}
        onToggleSubtask={onToggleSubtask}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
        currentUserId={currentUserId}
        ownerId={ownerId}
      />
    </Modal>
  );
}
