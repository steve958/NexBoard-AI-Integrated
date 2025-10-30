import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
export function getFirebaseApp() {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getAuthClient(): Auth {
  return getAuth(getFirebaseApp());
}
export function getDbClient(): Firestore {
  return getFirestore(getFirebaseApp());
}
export function getGoogleProvider() {
  return new GoogleAuthProvider();
}

export async function ensureUserDocument(user: User) {
  try {
    const ref = doc(getDbClient(), "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        avatarUrl: user.photoURL,
        createdAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error("Failed to ensure user document", e);
    throw e;
  }
}
