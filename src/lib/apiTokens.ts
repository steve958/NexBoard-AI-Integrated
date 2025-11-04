"use client";
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { ApiToken, TokenScope } from "@/lib/types";
import { generateToken, generateSalt, hashToken } from "@/lib/crypto";

/**
 * Create a new API token for a user
 * Returns the plain token value (show only once) and the token document ID
 */
export async function createApiToken(
  userId: string,
  label: string,
  scopes: TokenScope[]
): Promise<{ token: string; tokenId: string }> {
  const db = getDbClient();

  // Generate token and salt
  const token = generateToken();
  const salt = generateSalt();

  // Get pepper from environment (client-side for now, but should be server-side in production)
  const pepper = process.env.NEXT_PUBLIC_API_TOKEN_PEPPER;

  // Hash the token
  const tokenHash = await hashToken(token, salt, pepper);

  // Store prefix for faster lookup (first 12 characters including "nex_")
  const tokenPrefix = token.substring(0, 12);

  // Store in Firestore
  const tokenData = {
    userId,
    label,
    scopes,
    tokenHash,
    salt,
    tokenPrefix, // For faster lookup in API auth
    createdAt: serverTimestamp(),
    revokedAt: null,
  };

  const docRef = await addDoc(collection(db, "apiTokens"), tokenData);

  return {
    token, // Return plain token - show once!
    tokenId: docRef.id,
  };
}

/**
 * Listen to all API tokens for a user
 */
export function listenUserApiTokens(userId: string, callback: (tokens: ApiToken[]) => void): () => void {
  const db = getDbClient();
  const q = query(
    collection(db, "apiTokens"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
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
  });
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
