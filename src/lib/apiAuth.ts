/**
 * Server-side API authentication middleware
 * Validates Bearer tokens and enforces scopes
 *
 * Import this file only in API routes
 */

import type { TokenScope } from "@/lib/types";
import { verifyToken } from "@/lib/crypto";
import { getAdminDb } from "@/lib/apiAuthServer";

export type AuthResult =
  | { success: true; userId: string; scopes: TokenScope[]; tokenId: string }
  | { success: false; error: string; status: number };

/**
 * Authenticate a request using Bearer token
 */
export async function authenticateRequest(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, error: "Missing or invalid Authorization header", status: 401 };
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  if (!token || !token.startsWith("nex_")) {
    return { success: false, error: "Invalid token format", status: 401 };
  }

  try {
    const db = getAdminDb();

    // We need to find the token by hash, but we can't hash and query
    // Instead, we'll need to implement a different approach
    // For MVP: query all tokens for a user-provided hint, or use a token lookup collection
    // For now, let's iterate through potential matches (not ideal, but functional for MVP)

    // Better approach: Store token prefix for quick lookup
    const tokenPrefix = token.substring(0, 12); // First 12 chars including "nex_"

    const tokensSnapshot = await db.collection("apiTokens")
      .where("tokenPrefix", "==", tokenPrefix)
      .get();

    if (tokensSnapshot.empty) {
      // Fallback: Linear search through all tokens (not scalable, but works for MVP)
      const allTokensSnapshot = await db.collection("apiTokens").get();

      for (const tokenDoc of allTokensSnapshot.docs) {
        const tokenData = tokenDoc.data();

        // Skip revoked tokens
        if (tokenData.revokedAt) {
          continue;
        }

        const pepper = process.env.NEXT_PUBLIC_API_TOKEN_PEPPER;
        const isValid = await verifyToken(token, tokenData.tokenHash, tokenData.salt, pepper);

        if (isValid) {
          return {
            success: true,
            userId: tokenData.userId,
            scopes: tokenData.scopes,
            tokenId: tokenDoc.id,
          };
        }
      }

      return { success: false, error: "Invalid token", status: 401 };
    }

    // Try tokens with matching prefix
    for (const tokenDoc of tokensSnapshot.docs) {
      const tokenData = tokenDoc.data();

      // Skip revoked tokens
      if (tokenData.revokedAt) {
        continue;
      }

      const pepper = process.env.NEXT_PUBLIC_API_TOKEN_PEPPER;
      const isValid = await verifyToken(token, tokenData.tokenHash, tokenData.salt, pepper);

      if (isValid) {
        return {
          success: true,
          userId: tokenData.userId,
          scopes: tokenData.scopes,
          tokenId: tokenDoc.id,
        };
      }
    }

    return { success: false, error: "Invalid token", status: 401 };
  } catch (error) {
    console.error("Token verification error:", error);
    return { success: false, error: "Authentication failed", status: 500 };
  }
}

/**
 * Check if user has required scope
 */
export function hasScope(scopes: TokenScope[], requiredScope: TokenScope): boolean {
  return scopes.includes(requiredScope);
}

/**
 * Check if user is member of project
 */
export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
      return false;
    }

    const projectData = projectDoc.data();
    return projectData?.members?.includes(userId) || false;
  } catch (error) {
    console.error("Project membership check error:", error);
    return false;
  }
}

/**
 * Rate limiting check (basic implementation)
 */
export async function checkRateLimit(tokenId: string, limit: number = 300): Promise<boolean> {
  try {
    const db = getAdminDb();
    const now = new Date();
    const hourKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}${String(now.getUTCHours()).padStart(2, "0")}`;

    const rateDoc = db.collection("apiRate").doc(tokenId).collection("hours").doc(hourKey);
    const rateSnap = await rateDoc.get();

    if (!rateSnap.exists) {
      await rateDoc.set({ count: 1, lastRequest: now });
      return true;
    }

    const rateData = rateSnap.data();
    const count = rateData?.count || 0;

    if (count >= limit) {
      return false;
    }

    await rateDoc.update({ count: count + 1, lastRequest: now });
    return true;
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Allow request on error (fail open)
    return true;
  }
}
