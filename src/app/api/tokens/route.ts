import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/apiAuthServer";
import { generateToken, generateSalt, hashToken } from "@/lib/crypto";
import type { TokenScope } from "@/lib/types";

/**
 * POST /api/tokens
 * Create a new API token (server-side to keep pepper secret)
 *
 * Requires Firebase ID token in Authorization header for user identity.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Firebase ID token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const idToken = authHeader.substring(7);

    // Verify the Firebase ID token using Admin SDK
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/lib/apiAuthServer");
    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const { label, scopes } = body as { label: string; scopes: TokenScope[] };

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }

    const validScopes: TokenScope[] = ["tasks:read", "tasks:write"];
    if (!Array.isArray(scopes) || scopes.length === 0 || !scopes.every(s => validScopes.includes(s))) {
      return NextResponse.json({ error: "Invalid scopes" }, { status: 400 });
    }

    // Generate token and hash server-side with secret pepper
    const token = generateToken();
    const salt = generateSalt();
    const pepper = process.env.API_TOKEN_PEPPER;
    const tokenHash = await hashToken(token, salt, pepper);
    const tokenPrefix = token.substring(0, 12);

    // Store in Firestore via Admin SDK
    const db = getAdminDb();
    const docRef = await db.collection("apiTokens").add({
      userId,
      label: label.trim(),
      scopes,
      tokenHash,
      salt,
      tokenPrefix,
      createdAt: new Date(),
      revokedAt: null,
    });

    return NextResponse.json(
      { token, tokenId: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
