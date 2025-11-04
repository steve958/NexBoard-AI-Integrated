/**
 * Cryptographic utilities for API token management
 * Uses Web Crypto API for secure random generation and hashing
 */

/**
 * Generate a random API token string
 * Format: nex_[32 random bytes as base64url]
 */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base64url = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `nex_${base64url}`;
}

/**
 * Generate a random salt for hashing
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Hash a token with salt and optional pepper
 * Uses PBKDF2 with SHA-256
 */
export async function hashToken(token: string, salt: string, pepper?: string): Promise<string> {
  const encoder = new TextEncoder();
  const tokenWithPepper = pepper ? `${token}${pepper}` : token;

  // Import the key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(tokenWithPepper),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  // Convert to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verify a token against stored hash
 */
export async function verifyToken(
  token: string,
  storedHash: string,
  salt: string,
  pepper?: string
): Promise<boolean> {
  const computedHash = await hashToken(token, salt, pepper);
  return constantTimeEqual(computedHash, storedHash);
}
