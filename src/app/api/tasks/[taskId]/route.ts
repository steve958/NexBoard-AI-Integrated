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

    const db = getAdminDb();
    const projectIdParam = request.nextUrl.searchParams.get("projectId");

    let taskDoc: FirebaseFirestore.DocumentSnapshot;
    let projectId: string;

    if (projectIdParam) {
      // Fast path: direct lookup when projectId is known
      const ref = db.collection("projects").doc(projectIdParam).collection("tasks").doc(taskId);
      taskDoc = await ref.get();
      if (!taskDoc.exists) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      projectId = projectIdParam;
    } else {
      // Slow path: scan all projects (requires taskId stored as field)
      return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
    }

    const taskData = taskDoc.data();

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

    const getFormat = request.nextUrl.searchParams.get("format");
    if (getFormat === "text") {
      const columnId = taskData?.columnId as string | undefined;
      let statusLabel = columnId || "-";
      if (columnId) {
        const columnDoc = await db.collection("projects").doc(projectId).collection("columns").doc(columnId).get();
        if (columnDoc.exists) statusLabel = (columnDoc.data()?.name as string) || columnId;
      }
      const lines = [
        `${taskData?.title ?? ""} (${task.taskId})`,
        `  Status:   ${statusLabel}`,
        `  Assignee: ${taskData?.assigneeId ?? "-"}`,
        `  Due:      ${task.dueDate ? String(task.dueDate).split("T")[0] : "-"}`,
        `  Created:  ${task.createdAt ? String(task.createdAt).split("T")[0] : "-"}`,
        `  Updated:  ${task.updatedAt ? String(task.updatedAt).split("T")[0] : "-"}`,
      ];
      if (taskData?.description) lines.push("", `  ${taskData.description}`);
      return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/plain" } });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const { title, description, status, columnId: columnIdField, assigneeId, dueDate, order } = body;

    const db = getAdminDb();
    const projectIdParam = request.nextUrl.searchParams.get("projectId");

    if (!projectIdParam) {
      return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
    }

    const taskDocRef = db.collection("projects").doc(projectIdParam).collection("tasks").doc(taskId);
    const taskDocSnap = await taskDocRef.get();

    if (!taskDocSnap.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskDoc = taskDocSnap;
    const taskData = taskDoc.data();
    const projectId = projectIdParam;

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
    const updateData: Record<string, unknown> = {
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

    const resolvedStatus = columnIdField !== undefined ? columnIdField : status;
    if (resolvedStatus !== undefined) {
      updateData.columnId = resolvedStatus;
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
    await taskDocRef.update(updateData);

    // Fetch updated task
    const updatedDoc = await taskDocRef.get();
    const updatedData = updatedDoc.data();

    const updatedTask = {
      taskId: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || null,
      dueDate: updatedData?.dueDate?.toDate?.()?.toISOString() || null,
    };

    const patchFormat = request.nextUrl.searchParams.get("format");
    if (patchFormat === "text") {
      return new NextResponse(`Updated: ${updatedData?.title ?? ""} (${updatedTask.taskId})`, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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

    const db = getAdminDb();
    const projectIdParam = request.nextUrl.searchParams.get("projectId");

    if (!projectIdParam) {
      return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
    }

    const taskDocRef = db.collection("projects").doc(projectIdParam).collection("tasks").doc(taskId);
    const taskDocSnap = await taskDocRef.get();

    if (!taskDocSnap.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskDoc = taskDocSnap;
    const projectId = projectIdParam;

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
    await taskDocRef.delete();

    const deleteFormat = request.nextUrl.searchParams.get("format");
    if (deleteFormat === "text") {
      return new NextResponse(`Deleted: ${taskId}`, { headers: { "Content-Type": "text/plain" } });
    }

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/tasks/[taskId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
