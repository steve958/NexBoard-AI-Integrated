import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasScope, isProjectMember, checkRateLimit } from "@/lib/apiAuth";
import { getAdminDb } from "@/lib/apiAuthServer";
import { midKey } from "@/lib/order";

/** Firestore document shape for a task (server-side). */
interface TaskDocument {
  title: string;
  columnId: string;
  order: string;
  description?: string;
  assigneeId?: string;
  parentTaskId?: string;
  dueDate?: FirebaseFirestore.Timestamp | null;
  createdAt?: FirebaseFirestore.Timestamp | null;
  updatedAt?: FirebaseFirestore.Timestamp | null;
}

interface TaskApiResponse {
  taskId: string;
  title: string;
  columnId: string;
  order: string;
  description?: string;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

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
    let ref: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db.collection("projects").doc(projectId).collection("tasks");

    // Apply filters
    if (status) {
      ref = ref.where("columnId", "==", status);
    }
    if (assignee) {
      ref = ref.where("assigneeId", "==", assignee);
    }

    // Apply ordering and pagination
    ref = ref.orderBy("order", "asc");

    if (cursor) {
      const cursorDoc = await db.collection("projects").doc(projectId).collection("tasks").doc(cursor).get();
      if (cursorDoc.exists) {
        ref = ref.startAfter(cursorDoc);
      }
    }

    ref = ref.limit(limit + 1); // Fetch one extra to check if there are more

    // Execute query
    const snapshot = await ref.get();
    const tasks: TaskApiResponse[] = [];
    let hasMore = false;

    let index = 0;
    snapshot.forEach((doc) => {
      if (index < limit) {
        const data = doc.data() as TaskDocument;

        // Apply client-side text search if provided (MVP: simple includes)
        if (q && !data.title?.toLowerCase().includes(q.toLowerCase())) {
          return; // Skip this task
        }

        tasks.push({
          taskId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
          dueDate: data.dueDate?.toDate?.()?.toISOString() ?? null,
        });
        index++;
      } else {
        hasMore = true; // There's a next page
      }
    });

    // Format response
    if (format === "text") {
      // Fetch column names for readable status labels
      const columnsSnap = await db.collection("projects").doc(projectId).collection("columns").get();
      const columnNames: Record<string, string> = {};
      columnsSnap.forEach(col => {
        columnNames[col.id] = (col.data().name as string) || col.id;
      });

      if (tasks.length === 0) {
        return new NextResponse("No tasks found.", {
          headers: { "Content-Type": "text/plain" },
        });
      }

      const titleWidth = Math.max(5, ...tasks.map(t => t.title.length));
      const statusWidth = Math.max(6, ...tasks.map(t => (columnNames[t.columnId] || t.columnId).length));
      const header = `${"TITLE".padEnd(titleWidth)}  ${"STATUS".padEnd(statusWidth)}  ASSIGNEE`;
      const separator = "-".repeat(titleWidth + statusWidth + 14);
      const lines = tasks.map(t => {
        const status = (columnNames[t.columnId] || t.columnId).padEnd(statusWidth);
        const assignee = t.assigneeId || "-";
        const due = t.dueDate ? `  due:${t.dueDate.split("T")[0]}` : "";
        return `${t.title.padEnd(titleWidth)}  ${status}  ${assignee}${due}  (${t.taskId})`;
      });
      const footer = hasMore
        ? `\n${tasks.length} task(s) shown -- next cursor: ${tasks[tasks.length - 1].taskId}`
        : `\n${tasks.length} task(s)`;

      return new NextResponse([header, separator, ...lines, footer].join("\n"), {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // JSON format (default)
    const response = {
      tasks,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore && tasks.length > 0 ? tasks[tasks.length - 1].taskId : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/projects/[projectId]/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const now = new Date();
    let parsedDueDate: Date | null = null;

    const taskData: Record<string, unknown> = {
      title: title.trim(),
      columnId: status || "backlog", // Default to backlog if not specified
      order: midKey(),
      createdAt: now,
      updatedAt: now,
    };

    if (description) taskData.description = description;
    if (assigneeId) taskData.assigneeId = assigneeId;
    if (dueDate) {
      try {
        parsedDueDate = new Date(dueDate);
        taskData.dueDate = parsedDueDate;
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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: parsedDueDate?.toISOString() || null,
    };

    const postFormat = request.nextUrl.searchParams.get("format");
    if (postFormat === "text") {
      return new NextResponse(`Created: ${title.trim()} (${taskRef.id})`, {
        status: 201,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json(createdTask, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[projectId]/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
