import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasScope, checkRateLimit } from "@/lib/apiAuth";
import { getAdminDb } from "@/lib/apiAuthServer";

/**
 * GET /api/projects
 * List all boards the token owner is a member of, with their columns.
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

    // Fetch all projects where this user is a member
    const projectsSnap = await db.collection("projects")
      .where("members", "array-contains", authResult.userId)
      .get();

    const projects: {
      projectId: string;
      name: string;
      columns: { columnId: string; name: string; order: number }[];
    }[] = [];

    for (const projectDoc of projectsSnap.docs) {
      const data = projectDoc.data();

      // Fetch columns for this project
      const columnsSnap = await db
        .collection("projects").doc(projectDoc.id).collection("columns")
        .orderBy("order", "asc")
        .get();

      const columns = columnsSnap.docs.map(col => ({
        columnId: col.id,
        name: (col.data().name as string) || col.id,
        order: (col.data().order as number) ?? 0,
      }));

      projects.push({
        projectId: projectDoc.id,
        name: data.name as string,
        columns,
      });
    }

    if (format === "text") {
      if (projects.length === 0) {
        return new NextResponse("No boards found.", { headers: { "Content-Type": "text/plain" } });
      }

      const lines: string[] = [];
      for (const p of projects) {
        lines.push(`Board: ${p.name}`);
        lines.push(`  projectId: ${p.projectId}`);
        lines.push(`  Columns:`);
        for (const col of p.columns) {
          lines.push(`    ${col.name.padEnd(16)} ${col.columnId}`);
        }
        lines.push("");
      }
      return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/plain" } });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
