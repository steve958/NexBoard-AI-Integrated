import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasScope, checkRateLimit } from "@/lib/apiAuth";
import { getAdminDb } from "@/lib/apiAuthServer";

/**
 * GET /api/task-projects
 * List all task projects (label/category) owned by the token user.
 * Supports ?format=text for human-readable output.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request.headers.get("authorization"));
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!hasScope(authResult.scopes, "tasks:read")) {
      return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });
    }

    const withinLimit = await checkRateLimit(authResult.tokenId);
    if (!withinLimit) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const db = getAdminDb();
    const format = request.nextUrl.searchParams.get("format");

    const snap = await db.collection("taskProjects")
      .where("userId", "==", authResult.userId)
      .get();

    const projects = snap.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name as string,
      color: doc.data().color as string | undefined,
    }));

    if (format === "text") {
      if (projects.length === 0) {
        return new NextResponse("No task projects found.", { headers: { "Content-Type": "text/plain" } });
      }
      const lines = projects.map(p => `${p.id}  ${p.name}${p.color ? "  (" + p.color + ")" : ""}`);
      return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/plain" } });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/task-projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
