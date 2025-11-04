/**
 * Server-side Firebase Admin utilities
 * Import this file only in API routes
 */

import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, type App } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, type Firestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
let adminApp: App | undefined;

export function getAdminApp(): App {
  if (!adminApp) {
    const apps = getAdminApps();
    if (apps.length === 0) {
      // Check if we have admin credentials
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      if (!projectId) {
        throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID not configured");
      }

      // For development/testing without service account
      if (!clientEmail || !privateKey) {
        console.warn("Firebase Admin credentials not configured, using emulator mode");
        // Initialize without credentials for emulator
        adminApp = initializeAdminApp({
          projectId,
        });
      } else {
        adminApp = initializeAdminApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        });
      }
    } else {
      adminApp = apps[0];
    }
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  return getAdminFirestore(getAdminApp());
}
