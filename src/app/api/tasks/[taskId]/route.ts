import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasScope, checkRateLimit } from "@/lib/apiAuth";
import { getAdminDb } from "@/lib/apiAuthServer";

/**
 * GET /api/tasks/[taskId]
 * Retrieve a single task by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    // Authenticate
    const authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check scope
    if (!hasScope(authResult.scopes, "tasks:read")) {
      return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(authResult.tokenId);
    if (!withinLimit) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Find the task using collection group query
    const db = getAdminDb();
    const tasksQuery = db.collectionGroup("tasks").where("__name__", "==", taskId).limit(1);
    const tasksSnapshot = await tasksQuery.get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskDoc = tasksSnapshot.docs[0];
    const taskData = taskDoc.data();

    // Extract projectId from the path
    const pathParts = taskDoc.ref.path.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Check project membership
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (!projectData?.members?.includes(authResult.userId)) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Return task data
    const task = {
      taskId: taskDoc.id,
      projectId,
      ...taskData,
      createdAt: taskData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: taskData?.updatedAt?.toDate?.()?.toISOString() || null,
      dueDate: taskData?.dueDate?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(task);
  } catch (error: any) {
    console.error("GET /api/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[taskId]
 * Update an existing task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    // Authenticate
    const authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check scope
    if (!hasScope(authResult.scopes, "tasks:write")) {
      return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(authResult.tokenId);
    if (!withinLimit) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, status, assigneeId, dueDate, order } = body;

    // Find the task to get its project
    const db = getAdminDb();

    // We need to find which project this task belongs to
    // Since tasks are in subcollections, we need to search
    // For MVP, we can use a collection group query or require projectId
    // Let's use collection group query

    const tasksQuery = db.collectionGroup("tasks").where("__name__", "==", taskId).limit(1);
    const tasksSnapshot = await tasksQuery.get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskDoc = tasksSnapshot.docs[0];
    const taskData = taskDoc.data();

    // Extract projectId from the path
    const pathParts = taskDoc.ref.path.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Check project membership
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (!projectData?.members?.includes(authResult.userId)) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Title must be a non-empty string" }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (status !== undefined) {
      updateData.columnId = status; // status maps to columnId
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null;
    }

    if (dueDate !== undefined) {
      if (dueDate === null) {
        updateData.dueDate = null;
      } else {
        try {
          updateData.dueDate = new Date(dueDate);
        } catch (e) {
          return NextResponse.json({ error: "Invalid dueDate format" }, { status: 400 });
        }
      }
    }

    if (order !== undefined) {
      updateData.order = order;
    }

    // Update task
    await taskDoc.ref.update(updateData);

    // Fetch updated task
    const updatedDoc = await taskDoc.ref.get();
    const updatedData = updatedDoc.data();

    const updatedTask = {
      taskId: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || null,
      dueDate: updatedData?.dueDate?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("PATCH /api/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    // Authenticate
    const authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check scope
    if (!hasScope(authResult.scopes, "tasks:write")) {
      return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(authResult.tokenId);
    if (!withinLimit) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Find the task using collection group query
    const db = getAdminDb();
    const tasksQuery = db.collectionGroup("tasks").where("__name__", "==", taskId).limit(1);
    const tasksSnapshot = await tasksQuery.get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskDoc = tasksSnapshot.docs[0];

    // Extract projectId from the path
    const pathParts = taskDoc.ref.path.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Check project membership
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (!projectData?.members?.includes(authResult.userId)) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Delete the task
    await taskDoc.ref.delete();

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
