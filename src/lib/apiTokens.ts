"use client";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import { getAuthClient } from "@/lib/firebase";
import type { ApiToken, TokenScope } from "@/lib/types";

/**
 * Create a new API token for a user
 * Delegates hashing to a server-side API route so the pepper stays secret.
 * Returns the plain token value (show only once) and the token document ID.
 */
export async function createApiToken(
  userId: string,
  label: string,
  scopes: TokenScope[]
): Promise<{ token: string; tokenId: string }> {
  // Get current user's Firebase ID token for server auth
  const currentUser = getAuthClient().currentUser;
  if (!currentUser) throw new Error("Not authenticated");
  const idToken = await currentUser.getIdToken();

  const res = await fetch("/api/tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ label, scopes }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to create token");
  }

  return res.json();
}

/**
 * Listen to all API tokens for a user
 */
export function listenUserApiTokens(
  userId: string,
  callback: (tokens: ApiToken[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDbClient();
  const q = query(
    collection(db, "apiTokens"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tokens: ApiToken[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tokens.push({
          tokenId: doc.id,
          userId: data.userId,
          label: data.label,
          scopes: data.scopes,
          tokenHash: data.tokenHash,
          salt: data.salt,
          createdAt: data.createdAt,
          revokedAt: data.revokedAt,
        });
      });
      callback(tokens);
    },
    (error) => {
      console.error("Error listening to API tokens:", error);
      if (onError) {
        onError(error as Error);
      }
    }
  );
}

/**
 * Revoke an API token
 */
export async function revokeApiToken(tokenId: string): Promise<void> {
  const db = getDbClient();
  const tokenRef = doc(db, "apiTokens", tokenId);
  await updateDoc(tokenRef, {
    revokedAt: serverTimestamp(),
  });
}

/**
 * Check if a token is active (not revoked)
 */
export function isTokenActive(token: ApiToken): boolean {
  return !token.revokedAt;
}

/**
 * Get user-friendly status label for a token
 */
export function getTokenStatus(token: ApiToken): "Active" | "Revoked" {
  return isTokenActive(token) ? "Active" : "Revoked";
}
