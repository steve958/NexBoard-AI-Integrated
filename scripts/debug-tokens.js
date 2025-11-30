/**
 * Debug script to check API tokens in Firestore
 *
 * This script helps diagnose why tokens aren't showing up in Settings.
 * Run this in the browser console while on the Settings page.
 */

// Run this in browser console:
console.log("🔍 Debugging API Tokens...\n");

// Check if user is authenticated
import { getAuth } from "firebase/auth";
import { getDbClient } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const auth = getAuth();
const user = auth.currentUser;

if (!user) {
  console.error("❌ No user is logged in!");
} else {
  console.log("✅ User is logged in:", user.uid);

  const db = getDbClient();

  // Try to fetch tokens directly
  console.log("\n📋 Attempting to fetch tokens...");

  const tokensRef = collection(db, "apiTokens");
  const q = query(tokensRef, where("userId", "==", user.uid));

  getDocs(q)
    .then((snapshot) => {
      console.log(`\n✅ Found ${snapshot.size} tokens in Firestore`);

      if (snapshot.empty) {
        console.log("\n💡 No tokens found. Try creating one in the Settings page.");
      } else {
        console.log("\n📄 Token details:");
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log({
            id: doc.id,
            label: data.label,
            scopes: data.scopes,
            createdAt: data.createdAt,
            revokedAt: data.revokedAt,
          });
        });
      }
    })
    .catch((error) => {
      console.error("\n❌ Error fetching tokens:", error);

      if (error.code === "failed-precondition") {
        console.error("\n⚠️  INDEX MISSING! The Firestore index needs to be created.");
        console.error("The error suggests you need to create a composite index.");
        console.error("\nTo fix:");
        console.error("1. Click the link in the error message above");
        console.error("2. Or manually create index in Firebase Console:");
        console.error("   - Collection: apiTokens");
        console.error("   - Fields: userId (Ascending), createdAt (Descending)");
      }

      if (error.code === "permission-denied") {
        console.error("\n⚠️  PERMISSION DENIED! Firestore security rules may be blocking access.");
        console.error("Check that the rules allow reading apiTokens for the current user.");
      }
    });
}
