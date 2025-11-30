import { NextRequest } from "next/server";
import { verifyApiToken, hasScope, jsonError, jsonSuccess } from "@/lib/api/auth";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { Task } from "@/lib/types";

/**
 * GET /api/tasks?projectId=xxx
 * List all tasks in a project
 * Requires: tasks:read scope
 */
export async function GET(request: NextRequest) {
  // Verify token
  const auth = await verifyApiToken(request);
  if (!auth.success) {
    return jsonError(auth.error, auth.status);
  }

  // Check scope
  if (!hasScope(auth.scopes, "tasks:read")) {
    return jsonError("Insufficient permissions. Requires tasks:read scope", 403);
  }

  // Get projectId from query params
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return jsonError("Missing projectId query parameter", 400);
  }

  try {
    const db = getDbClient();

    // TODO: Verify user has access to this project
    // For now, we'll just return the tasks (security should be added)

    // Fetch tasks
    const tasksQuery = query(
      collection(db, `projects/${projectId}/tasks`)
    );

    const snapshot = await getDocs(tasksQuery);
    const tasks: Task[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        taskId: doc.id,
        title: data.title,
        description: data.description,
        columnId: data.columnId,
        order: data.order,
        assigneeId: data.assigneeId,
        parentTaskId: data.parentTaskId,
        dueDate: data.dueDate,
        subtasks: data.subtasks,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return jsonSuccess({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return jsonError("Internal server error", 500);
  }
}

/**
 * POST /api/tasks
 * Create a new task
 * Requires: tasks:write scope
 */
export async function POST(request: NextRequest) {
  // Verify token
  const auth = await verifyApiToken(request);
  if (!auth.success) {
    return jsonError(auth.error, auth.status);
  }

  // Check scope
  if (!hasScope(auth.scopes, "tasks:write")) {
    return jsonError("Insufficient permissions. Requires tasks:write scope", 403);
  }

  try {
    // Parse request body
    const body = await request.json();
    const { projectId, title, description, columnId, assigneeId, dueDate, parentTaskId } = body;

    // Validate required fields
    if (!projectId || !title || !columnId) {
      return jsonError("Missing required fields: projectId, title, columnId", 400);
    }

    const db = getDbClient();

    // TODO: Verify user has access to this project
    // TODO: Get proper order value (for now using timestamp)

    // Create task
    const taskData = {
      title,
      description: description || "",
      columnId,
      order: new Date().toISOString(), // Simple ordering for now
      assigneeId: assigneeId || null,
      parentTaskId: parentTaskId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      subtasks: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, `projects/${projectId}/tasks`),
      taskData
    );

    return jsonSuccess(
      {
        taskId: docRef.id,
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("Error creating task:", error);
    return jsonError("Internal server error", 500);
  }
}
