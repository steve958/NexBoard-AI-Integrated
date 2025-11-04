import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasScope, isProjectMember, checkRateLimit } from "@/lib/apiAuth";
import { getAdminDb } from "@/lib/apiAuthServer";
import { midKey } from "@/lib/order";

/**
 * GET /api/projects/[projectId]/tasks
 * List tasks with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
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

    // Check project membership
    const isMember = await isProjectMember(projectId, authResult.userId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // columnId filter
    const assignee = searchParams.get("assignee"); // assigneeId filter
    const q = searchParams.get("q"); // search query
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const cursor = searchParams.get("cursor"); // for pagination
    const format = searchParams.get("format"); // text or json

    // Build query
    const db = getAdminDb();
    let query = db.collection("projects").doc(projectId).collection("tasks");

    // Apply filters
    if (status) {
      query = query.where("columnId", "==", status) as any;
    }
    if (assignee) {
      query = query.where("assigneeId", "==", assignee) as any;
    }

    // Apply ordering and pagination
    query = query.orderBy("order", "asc") as any;

    if (cursor) {
      const cursorDoc = await db.collection("projects").doc(projectId).collection("tasks").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as any;
      }
    }

    query = query.limit(limit + 1) as any; // Fetch one extra to check if there are more

    // Execute query
    const snapshot = await query.get();
    const tasks: any[] = [];
    let hasMore = false;

    let index = 0;
    snapshot.forEach((doc: any) => {
      if (index < limit) {
        const data = doc.data();

        // Apply client-side text search if provided (MVP: simple includes)
        if (q && !data.title?.toLowerCase().includes(q.toLowerCase())) {
          return; // Skip this task
        }

        tasks.push({
          taskId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
        });
        index++;
      } else {
        hasMore = true; // There's a next page
      }
    });

    // Format response
    if (format === "text") {
      // CLI-friendly format
      const lines = tasks.map(t =>
        `${t.taskId}\t${t.title}\t${t.columnId || ""}\t${t.assigneeId || ""}`
      );
      return new NextResponse(lines.join("\n"), {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // JSON format (default)
    const response: any = {
      tasks,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore && tasks.length > 0 ? tasks[tasks.length - 1].taskId : null,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("GET /api/projects/[projectId]/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/tasks
 * Create a new task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
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

    // Check project membership
    const isMember = await isProjectMember(projectId, authResult.userId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, status, assigneeId, dueDate, parentTaskId } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Build task data
    const taskData: any = {
      title: title.trim(),
      columnId: status || "backlog", // Default to backlog if not specified
      order: midKey(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (description) taskData.description = description;
    if (assigneeId) taskData.assigneeId = assigneeId;
    if (dueDate) {
      try {
        taskData.dueDate = new Date(dueDate);
      } catch (e) {
        return NextResponse.json({ error: "Invalid dueDate format" }, { status: 400 });
      }
    }
    if (parentTaskId) taskData.parentTaskId = parentTaskId;

    // Create task
    const db = getAdminDb();
    const taskRef = await db.collection("projects").doc(projectId).collection("tasks").add(taskData);

    const createdTask = {
      taskId: taskRef.id,
      ...taskData,
      createdAt: taskData.createdAt.toISOString(),
      updatedAt: taskData.updatedAt.toISOString(),
      dueDate: taskData.dueDate?.toISOString() || null,
    };

    return NextResponse.json(createdTask, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[projectId]/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
